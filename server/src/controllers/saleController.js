import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import { normalizeSaleItems, deductSaleItemsStock, restoreSaleItemsStock } from '../services/saleStockService.js';
import {
  generateInvoiceNumber,
  getSaleById as getSaleDetailsById,
  resolveCustomerByNameInSession,
  runSalesTransaction,
  syncCustomerOutstandingInSession,
  syncReceivableForSale,
} from '../services/salesService.js';
import { createHttpError } from '../utils/httpError.js';
import { formatSale } from '../utils/formatSale.js';
import { calculateSaleInvoice, roundCurrency } from '../utils/saleMath.js';
import RodStock from '../models/RodStock.js';
import SheetStock from '../models/SheetStock.js';
import PUProductStock from '../models/PUProductStock.js';

function parseDate(value, fallback = new Date()) {
  return value ? new Date(value) : fallback;
}

function parseText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseUpperText(value) {
  return parseText(value).toUpperCase();
}

function parseNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseOptionalDate(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function parseTerms(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => parseText(item)).filter(Boolean);
}

function parseSalePayload(body) {
  const invoiceDate = parseDate(body.invoiceDate);

  return {
    customerName: parseText(body.customerName || body.partyDetails?.name),
    customerMobile: parseText(body.customerMobile || body.partyDetails?.mobile),
    customerAddress: parseText(body.customerAddress || body.partyDetails?.address),
    customerLocation: parseText(body.customerLocation || body.partyDetails?.location),
    customerGST: parseUpperText(body.customerGST || body.partyDetails?.gstNumber || body.partyDetails?.gst),
    invoiceDate,
    paymentType: body.paymentType,
    paidAmount: parseNumber(body.paidAmount ?? body.paid),
    creditDays: parseNumber(body.creditDays),
    dueDate: body.dueDate ? parseDate(body.dueDate) : null,
    parcelCount: parseNumber(body.parcelCount),
    transportName: parseText(body.transportName || body.transportDetails?.name),
    vehicleNumber: parseUpperText(body.vehicleNumber || body.transportDetails?.vehicleNumber),
    notes: parseText(body.notes),
    remarks: parseText(body.remarks),
    partyDetails: body.partyDetails || {},
    gstDetails: body.gstDetails || body.gst || {},
    paymentDetails: body.paymentDetails || {},
    transportDetails: body.transportDetails || {},
    bankDetails: body.bankDetails || {},
    termsAndConditions: parseTerms(body.termsAndConditions),
    items: body.items,
    stockType: body.stockType,
    stockRef: body.stockRef,
    product: body.product,
    productName: parseText(body.productName),
    quantity: body.quantity,
    sellingPrice: body.sellingPrice,
    gstRate: body.gstRate,
  };
}

async function populateSale(saleId, session) {
  let query = Sale.findById(saleId).populate('customer').populate('product');

  if (session) {
    query = query.session(session);
  }

  return query;
}

function buildLegacyMirror({ items, amounts }) {
  const firstItem = items[0];

  return {
    product: firstItem.stockType === 'legacy-product' ? firstItem.stockRef : undefined,
    productName: firstItem.productName,
    quantity: roundCurrency(items.reduce((total, item) => total + Number(item.quantity || 0), 0)),
    sellingPrice: firstItem.sellingPrice,
    totalAmount: amounts.grandTotal,
    paidAmount: amounts.paidAmount,
    outstandingAmount: amounts.outstandingAmount,
    invoiceStatus: amounts.invoiceStatus,
  };
}

function buildSaleMutation({ sale, payload, customer, items, amounts, userId }) {
  const legacyMirror = buildLegacyMirror({ items, amounts });
  const isCash = payload.paymentType === 'Cash';

  sale.customer = customer._id;
  sale.customerName = customer.name;
  sale.customerMobile = payload.customerMobile;
  sale.customerAddress = payload.customerAddress;
  sale.customerLocation = payload.customerLocation;
  sale.customerGST = payload.customerGST;
  sale.product = legacyMirror.product;
  sale.productName = legacyMirror.productName;
  sale.invoiceDate = payload.invoiceDate;
  sale.quantity = legacyMirror.quantity;
  sale.sellingPrice = legacyMirror.sellingPrice;
  sale.paymentType = payload.paymentType;
  sale.totalAmount = legacyMirror.totalAmount;
  sale.paidAmount = legacyMirror.paidAmount;
  sale.outstandingAmount = legacyMirror.outstandingAmount;
  sale.invoiceStatus = legacyMirror.invoiceStatus;
  sale.notes = payload.notes;
  sale.partyDetails = payload.partyDetails;
  sale.gstDetails = payload.gstDetails;
  sale.paymentDetails = payload.paymentDetails;
  sale.transportDetails = payload.transportDetails;
  sale.transportName = payload.transportName;
  sale.vehicleNumber = payload.vehicleNumber;
  sale.bankDetails = payload.bankDetails;
  sale.termsAndConditions = payload.termsAndConditions;
  sale.remarks = payload.remarks;
  sale.subtotal = amounts.subtotal;
  sale.gstAmount = amounts.gstAmount;
  sale.grandTotal = amounts.grandTotal;
  sale.paid = amounts.paid;
  sale.outstanding = amounts.outstanding;
  sale.dueDate = isCash ? null : payload.dueDate || amounts.dueDate;
  sale.creditDays = isCash ? 0 : payload.creditDays;
  sale.parcelCount = payload.parcelCount;
  sale.paymentStatus = amounts.paymentStatus;
  sale.items = amounts.items;
  sale.confirmedBy = sale.confirmedBy || userId;
  sale.confirmedAt = sale.confirmedAt || new Date();
  sale.updatedBy = userId;
}

function ensureMutableSale(sale) {
  if (sale.invoiceStatus === 'Cancelled') {
    throw createHttpError(409, 'Cancelled invoices cannot be updated.');
  }
}

function getSaleItemsForStock(sale) {
  if (Array.isArray(sale.items) && sale.items.length) {
    return sale.items;
  }

  return [
    {
      stockType: 'legacy-product',
      stockRef: sale.product,
      productName: sale.productName,
      quantity: sale.quantity,
      sellingPrice: sale.sellingPrice,
      gstRate: 0,
    },
  ];
}

function assertPaidAmount(amounts) {
  if (amounts.outstandingAmount < 0) {
    throw createHttpError(422, 'Paid amount cannot exceed grand total.');
  }
}

function assertPaymentTerms(payload) {
  if (payload.parcelCount < 0) {
    throw createHttpError(422, 'Parcel count cannot be negative.');
  }

  if (payload.paymentType === 'Credit' && payload.creditDays <= 0) {
    throw createHttpError(422, 'Credit days must be greater than zero for credit sales.');
  }
}

function matchesStockSearch(stock, search, fields) {
  if (!search) {
    return true;
  }

  const normalizedSearch = search.toLowerCase();

  return fields.some((field) =>
    String(stock[field] || '').toLowerCase().includes(normalizedSearch),
  );
}

function toStockOption({
  stock,
  stockType,
  itemNumber = '',
  productName = '',
  size = '',
  colour = '',
  weight = null,
  sellingUnit = '',
  availableQuantity = 0,
}) {
  return {
    _id: stock._id,
    id: stock._id,
    stockType,
    stockRef: stock._id,
    itemNumber,
    productName,
    size,
    colour,
    weight,
    sellingUnit,
    availableQuantity,
    quantity: availableQuantity,
  };
}

async function listStockOptions({ stockType, search } = {}) {
  const [rods, sheets, puProducts, legacyProducts] = await Promise.all([
    RodStock.find({ quantity: { $gt: 0 } }).sort({ itemNumber: 1 }).limit(200).lean(),
    SheetStock.find({ quantity: { $gt: 0 } }).sort({ itemNumber: 1 }).limit(200).lean(),
    PUProductStock.find({ quantity: { $gt: 0 } }).sort({ itemNumber: 1 }).limit(200).lean(),
    Product.find({ isActive: true }).sort({ name: 1 }).limit(200).lean(),
  ]);

  const options = {
    rod: rods
      .filter((stock) => matchesStockSearch(stock, search, ['itemNumber', 'item', 'size', 'colour', 'weightKg']))
      .map((stock) => toStockOption({
      stock,
      stockType: 'rod',
      itemNumber: stock.itemNumber,
      productName: stock.item,
      size: stock.size,
      colour: stock.colour,
      weight: stock.weightKg,
      availableQuantity: stock.quantity,
    })),
    sheet: sheets
      .filter((stock) => matchesStockSearch(stock, search, ['itemNumber', 'itemName', 'size', 'colour', 'weight']))
      .map((stock) => toStockOption({
      stock,
      stockType: 'sheet',
      itemNumber: stock.itemNumber,
      productName: stock.itemName,
      size: stock.size,
      colour: stock.colour,
      weight: stock.weight,
      availableQuantity: stock.quantity,
    })),
    'pu-product': puProducts
      .filter((stock) => matchesStockSearch(stock, search, ['itemNumber', 'productName', 'size', 'colour', 'sellingUnit']))
      .map((stock) => toStockOption({
      stock,
      stockType: 'pu-product',
      itemNumber: stock.itemNumber,
      productName: stock.productName,
      size: stock.size,
      colour: stock.colour,
      sellingUnit: stock.sellingUnit,
      availableQuantity: stock.quantity,
    })),
    'legacy-product': legacyProducts
      .filter((product) => matchesStockSearch(product, search, ['name', 'currentStock']))
      .map((product) => toStockOption({
      stock: product,
      stockType: 'legacy-product',
      productName: product.name,
      availableQuantity: product.currentStock,
    })),
  };

  if (stockType && options[stockType]) {
    return {
      ...options,
      data: options[stockType],
    };
  }

  return options;
}

export async function getSaleFormOptions(req, res) {
  const stockType = parseText(req.query.stockType);
  const search = parseText(req.query.search);
  const [customers, products, stockOptions] = await Promise.all([
    Customer.find({ isActive: true }).sort({ name: 1 }).limit(200).lean(),
    Product.find({ isActive: true }).sort({ name: 1 }).limit(200).lean(),
    listStockOptions({ stockType, search }),
  ]);

  return res.status(200).json({
    customers: customers.map((customer) => ({
      id: customer._id,
      name: customer.name,
      outstandingReceivable: customer.outstandingReceivable,
    })),
    products: products.map((product) => ({
      id: product._id,
      name: product.name,
      currentStock: product.currentStock,
    })),
    stockOptions,
    data: stockType ? stockOptions.data || [] : undefined,
  });
}

export async function listSales(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = req.query.search?.trim();
  const invoiceNumber = req.query.invoiceNumber?.trim();
  const customerName = req.query.customerName?.trim();
  const customerMobile = req.query.customerMobile?.trim();
  const paymentType = req.query.paymentType?.trim();
  const paymentStatus = req.query.paymentStatus?.trim();
  const invoiceStatus = req.query.invoiceStatus?.trim();
  const invoiceDateFrom = parseOptionalDate(req.query.invoiceDateFrom);
  const invoiceDateTo = parseOptionalDate(req.query.invoiceDateTo, true);
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { customerName: regex },
      { productName: regex },
      { invoiceNumber: regex },
      { paymentType: regex },
      { invoiceStatus: regex },
      { paymentStatus: regex },
      { notes: regex },
      { remarks: regex },
      { 'items.productName': regex },
      { 'items.itemNumber': regex },
    ];
  }

  if (paymentType) {
    filter.paymentType = paymentType;
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  if (invoiceStatus) {
    filter.invoiceStatus = invoiceStatus;
  }

  if (invoiceNumber) {
    filter.invoiceNumber = new RegExp(invoiceNumber, 'i');
  }

  if (customerName) {
    filter.customerName = new RegExp(customerName, 'i');
  }

  if (customerMobile) {
    filter.customerMobile = new RegExp(customerMobile, 'i');
  }

  if (invoiceDateFrom || invoiceDateTo) {
    filter.invoiceDate = {};

    if (invoiceDateFrom) {
      filter.invoiceDate.$gte = invoiceDateFrom;
    }

    if (invoiceDateTo) {
      filter.invoiceDate.$lte = invoiceDateTo;
    }
  }

  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    Sale.find(filter)
      .populate('customer')
      .populate('product')
      .sort({ invoiceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Sale.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatSale),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  });
}

export async function getSaleById(req, res) {
  const sale = await getSaleDetailsById(req.params.saleId);

  return res.status(200).json({
    sale,
  });
}

export async function createSale(req, res) {
  const payload = parseSalePayload(req.body);
  assertPaymentTerms(payload);

  const sale = await runSalesTransaction(async (session) => {
    const customer = await resolveCustomerByNameInSession(payload.customerName, session);
    const items = await normalizeSaleItems({ payload, session });
    const amounts = calculateSaleInvoice({
      items,
      paidAmount: payload.paidAmount,
      paymentType: payload.paymentType,
      invoiceDate: payload.invoiceDate,
      creditDays: payload.creditDays,
    });

    assertPaidAmount(amounts);

    const invoiceNumber = await generateInvoiceNumber(payload.invoiceDate, session);
    await deductSaleItemsStock({ items: amounts.items, session });

    const sale = new Sale({
      customer: customer._id,
      customerName: customer.name,
      invoiceNumber,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    buildSaleMutation({
      sale,
      payload,
      customer,
      items,
      amounts,
      userId: req.user._id,
    });
    await sale.save({ session });

    await syncReceivableForSale({
      saleId: sale._id,
      customerId: customer._id,
      paymentType: payload.paymentType,
      outstandingAmount: amounts.outstandingAmount,
      session,
    });

    return sale;
  });

  const populatedSale = await populateSale(sale._id);

  return res.status(201).json({
    message: 'Sale created successfully.',
    sale: formatSale(populatedSale),
  });
}

export async function updateSale(req, res) {
  const payload = parseSalePayload(req.body);
  assertPaymentTerms(payload);

  const sale = await runSalesTransaction(async (session) => {
    const existingSale = await Sale.findById(req.params.saleId).session(session);

    if (!existingSale) {
      throw createHttpError(404, 'Sale not found.');
    }

    ensureMutableSale(existingSale);

    const oldCustomerId = String(existingSale.customer);
    const previousItems = getSaleItemsForStock(existingSale);
    await restoreSaleItemsStock({ items: previousItems, session });

    const customer = await resolveCustomerByNameInSession(payload.customerName, session);
    const items = await normalizeSaleItems({ payload, session });
    const amounts = calculateSaleInvoice({
      items,
      paidAmount: payload.paidAmount,
      paymentType: payload.paymentType,
      invoiceDate: payload.invoiceDate,
      creditDays: payload.creditDays,
    });

    assertPaidAmount(amounts);
    await deductSaleItemsStock({ items: amounts.items, session });

    buildSaleMutation({
      sale: existingSale,
      payload,
      customer,
      items,
      amounts,
      userId: req.user._id,
    });
    await existingSale.save({ session });

    await syncReceivableForSale({
      saleId: existingSale._id,
      customerId: customer._id,
      paymentType: payload.paymentType,
      outstandingAmount: amounts.outstandingAmount,
      session,
    });

    if (oldCustomerId !== String(customer._id)) {
      await syncCustomerOutstandingInSession(oldCustomerId, session);
    }

    return existingSale;
  });

  const populatedSale = await populateSale(sale._id);

  return res.status(200).json({
    message: 'Sale updated successfully.',
    sale: formatSale(populatedSale),
  });
}

export async function cancelSale(req, res) {
  const reason = parseText(req.body.reason);

  if (!reason) {
    throw createHttpError(422, 'Cancellation reason is required.');
  }

  const sale = await runSalesTransaction(async (session) => {
    const existingSale = await Sale.findById(req.params.saleId).session(session);

    if (!existingSale) {
      throw createHttpError(404, 'Sale not found.');
    }

    if (existingSale.invoiceStatus === 'Cancelled') {
      throw createHttpError(409, 'Invoice is already cancelled.');
    }

    await restoreSaleItemsStock({
      items: getSaleItemsForStock(existingSale),
      session,
    });

    existingSale.invoiceStatus = 'Cancelled';
    existingSale.paymentStatus = 'Cancelled';
    existingSale.outstandingAmount = 0;
    existingSale.outstanding = 0;
    existingSale.cancellationDetails = {
      reason,
      cancelledAt: new Date(),
      cancelledBy: req.user._id,
      stockRestored: true,
    };
    existingSale.cancelledBy = req.user._id;
    existingSale.cancelledAt = existingSale.cancellationDetails.cancelledAt;
    existingSale.cancellationReason = reason;
    existingSale.updatedBy = req.user._id;
    await existingSale.save({ session });

    await syncReceivableForSale({
      saleId: existingSale._id,
      customerId: existingSale.customer,
      paymentType: 'Cash',
      outstandingAmount: 0,
      session,
    });

    return existingSale;
  });

  const populatedSale = await populateSale(sale._id);

  return res.status(200).json({
    message: 'Sale cancelled successfully.',
    sale: formatSale(populatedSale),
  });
}

export async function deleteSale(req, res) {
  await runSalesTransaction(async (session) => {
    const sale = await Sale.findById(req.params.saleId).session(session);

    if (!sale) {
      throw createHttpError(404, 'Sale not found.');
    }

    if (sale.invoiceStatus !== 'Cancelled' || !sale.cancellationDetails?.stockRestored) {
      await restoreSaleItemsStock({
        items: getSaleItemsForStock(sale),
        session,
      });
    }

    await syncReceivableForSale({
      saleId: sale._id,
      customerId: sale.customer,
      paymentType: 'Cash',
      outstandingAmount: 0,
      session,
    });
    await Sale.deleteOne({ _id: sale._id }, { session });
  });

  return res.status(200).json({
    message: 'Sale deleted successfully.',
  });
}
