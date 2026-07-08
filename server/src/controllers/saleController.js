import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import { createHttpError } from '../utils/httpError.js';
import { formatSale } from '../utils/formatSale.js';
import { calculateSaleAmounts } from '../utils/saleMath.js';
import {
  adjustProductStock,
  assertSufficientStock,
  generateInvoiceNumber,
  resolveCustomerByName,
  resolveProductForSale,
  syncCustomerOutstanding,
  syncReceivableForSale,
} from '../services/salesService.js';

function parseSalePayload(body) {
  return {
    customerName: body.customerName?.trim(),
    productName: body.productName?.trim(),
    invoiceDate: new Date(body.invoiceDate),
    quantity: Number(body.quantity),
    sellingPrice: Number(body.sellingPrice),
    paymentType: body.paymentType,
    paidAmount: body.paidAmount ? Number(body.paidAmount) : 0,
    notes: body.notes?.trim() || '',
  };
}

async function populateSale(saleId) {
  return Sale.findById(saleId).populate('customer').populate('product');
}

export async function getSaleFormOptions(req, res) {
  const [customers, products] = await Promise.all([
    Customer.find({ isActive: true }).sort({ name: 1 }).limit(200).lean(),
    Product.find({ isActive: true }).sort({ name: 1 }).limit(200).lean(),
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
  });
}

export async function listSales(req, res) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const search = req.query.search?.trim();
  const paymentType = req.query.paymentType?.trim();
  const invoiceStatus = req.query.invoiceStatus?.trim();
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { customerName: regex },
      { productName: regex },
      { invoiceNumber: regex },
      { paymentType: regex },
      { invoiceStatus: regex },
      { notes: regex },
    ];
  }

  if (paymentType) {
    filter.paymentType = paymentType;
  }

  if (invoiceStatus) {
    filter.invoiceStatus = invoiceStatus;
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
  const sale = await populateSale(req.params.saleId);

  if (!sale) {
    throw createHttpError(404, 'Sale not found.');
  }

  return res.status(200).json({
    sale: formatSale(sale),
  });
}

export async function createSale(req, res) {
  const payload = parseSalePayload(req.body);
  const amounts = calculateSaleAmounts(payload);

  if (amounts.outstandingAmount < 0) {
    throw createHttpError(422, 'Outstanding amount cannot be negative.');
  }

  const [customer, product] = await Promise.all([
    resolveCustomerByName(payload.customerName),
    resolveProductForSale(payload.productName),
  ]);

  assertSufficientStock({
    product,
    requiredQuantity: payload.quantity,
  });

  const invoiceNumber = await generateInvoiceNumber(payload.invoiceDate);

  await adjustProductStock(product._id, -payload.quantity);

  const sale = await Sale.create({
    customer: customer._id,
    customerName: customer.name,
    product: product._id,
    productName: product.name,
    invoiceNumber,
    invoiceDate: payload.invoiceDate,
    quantity: payload.quantity,
    sellingPrice: payload.sellingPrice,
    paymentType: payload.paymentType,
    totalAmount: amounts.totalAmount,
    paidAmount: amounts.paidAmount,
    outstandingAmount: amounts.outstandingAmount,
    invoiceStatus: amounts.invoiceStatus,
    notes: payload.notes,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  await syncReceivableForSale({
    saleId: sale._id,
    customerId: customer._id,
    paymentType: payload.paymentType,
    outstandingAmount: amounts.outstandingAmount,
  });

  const populatedSale = await populateSale(sale._id);

  return res.status(201).json({
    message: 'Sale created successfully.',
    sale: formatSale(populatedSale),
  });
}

export async function updateSale(req, res) {
  const sale = await Sale.findById(req.params.saleId);

  if (!sale) {
    throw createHttpError(404, 'Sale not found.');
  }

  const payload = parseSalePayload(req.body);
  const amounts = calculateSaleAmounts(payload);

  if (amounts.outstandingAmount < 0) {
    throw createHttpError(422, 'Outstanding amount cannot be negative.');
  }

  const [customer, product] = await Promise.all([
    resolveCustomerByName(payload.customerName),
    resolveProductForSale(payload.productName),
  ]);

  const oldCustomerId = String(sale.customer);
  const oldProductId = String(sale.product);

  if (oldProductId === String(product._id)) {
    assertSufficientStock({
      product,
      requiredQuantity: payload.quantity,
      restorableQuantity: sale.quantity,
    });

    await adjustProductStock(product._id, sale.quantity - payload.quantity);
  } else {
    assertSufficientStock({
      product,
      requiredQuantity: payload.quantity,
    });

    await adjustProductStock(sale.product, sale.quantity);
    await adjustProductStock(product._id, -payload.quantity);
  }

  sale.customer = customer._id;
  sale.customerName = customer.name;
  sale.product = product._id;
  sale.productName = product.name;
  sale.invoiceDate = payload.invoiceDate;
  sale.quantity = payload.quantity;
  sale.sellingPrice = payload.sellingPrice;
  sale.paymentType = payload.paymentType;
  sale.totalAmount = amounts.totalAmount;
  sale.paidAmount = amounts.paidAmount;
  sale.outstandingAmount = amounts.outstandingAmount;
  sale.invoiceStatus = amounts.invoiceStatus;
  sale.notes = payload.notes;
  sale.updatedBy = req.user._id;

  await sale.save();

  await syncReceivableForSale({
    saleId: sale._id,
    customerId: customer._id,
    paymentType: payload.paymentType,
    outstandingAmount: amounts.outstandingAmount,
  });

  if (oldCustomerId !== String(customer._id)) {
    await syncCustomerOutstanding(oldCustomerId);
  }

  const populatedSale = await populateSale(sale._id);

  return res.status(200).json({
    message: 'Sale updated successfully.',
    sale: formatSale(populatedSale),
  });
}

export async function deleteSale(req, res) {
  const sale = await Sale.findById(req.params.saleId);

  if (!sale) {
    throw createHttpError(404, 'Sale not found.');
  }

  await adjustProductStock(sale.product, sale.quantity);
  await syncReceivableForSale({
    saleId: sale._id,
    customerId: sale.customer,
    paymentType: 'Cash',
    outstandingAmount: 0,
  });
  await Sale.findByIdAndDelete(sale._id);

  return res.status(200).json({
    message: 'Sale deleted successfully.',
  });
}
