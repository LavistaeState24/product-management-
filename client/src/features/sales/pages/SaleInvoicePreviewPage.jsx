import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Printer } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SalesPageSkeleton from '@/features/sales/components/SalesPageSkeleton';
import { fetchSaleById } from '@/features/sales/services/saleService';
import {
  formatCurrency,
  formatDate,
  getInvoiceStatusBadgeVariant,
  getPaymentBadgeVariant,
} from '@/features/sales/utils/saleHelpers';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { PERMISSIONS } from '@/constants/permissions';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import invoice from "../../../assets/invoice.png";
import '@/features/sales/styles/invoice-print.css';

const fallback = '-';

const STATIC_COMPANY_SETTINGS = {
  companyName: 'CUSTOMIZED POLYCAST PVT LTD',
  addressLines: [
    'PLOT NO. 136, VIBRANT MEGA INDUSTRIAL PARK',
    'ZAKH PATIYA ROAD, VEHLA',
    'AHMEDABAD, GUJARAT - 382433, INDIA',
  ],
  gstin: '24AAHCC3141K1ZP',
  udyamNumber: 'UDYAM-GJ-01-0033003 (Micro)',
  state: 'Gujarat',
  stateCode: '24',
  jurisdiction: 'SUBJECT TO AHMEDABAD JURISDICTION',
  bankDetails: {
    accountHolderName: 'CUSTOMIZED POLYCAST PVT LTD',
    bankName: 'STATE BANK OF INDIA - A/C-8448',
    accountNumber: '42970158448',
    branch: 'NAVA NARODA',
    ifsc: 'SBIN0011798',
  },
};

const stockTypeLabels = {
  rod: 'Rod',
  sheet: 'Sheet',
  'pu-product': 'PU Product',
  'legacy-product': 'Legacy Product',
};

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function valueOrFallback(value) {
  if (value === 0 || value === false) {
    return String(value);
  }

  return value || fallback;
}

function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

function resolveSale(data) {
  return data?.sale || data?.data?.sale || data?.data || data || null;
}

function resolveSaleId(sale, routeSaleId) {
  return sale?.id || sale?._id || routeSaleId;
}

function resolveCustomerName(sale) {
  return sale?.customerName || sale?.customer?.name || 'Customer not available';
}

function hasMeaningfulCompanyData(company) {
  return [
    company?.companyName,
    company?.name,
    company?.address,
    company?.gstin,
    company?.gst,
    company?.mobile,
    company?.phone,
    company?.email,
  ].some(isPresent);
}

function resolveCompany(sale) {
  const saleCompany =
    sale?.companySettings || sale?.printableInvoice?.companySettings || null;

  if (hasMeaningfulCompanyData(saleCompany)) {
    return saleCompany;
  }

  return STATIC_COMPANY_SETTINGS;
}

function resolveCompanyAddress(company) {
  if (Array.isArray(company?.addressLines) && company.addressLines.length) {
    return company.addressLines.filter(Boolean);
  }

  if (typeof company?.address === 'string' && company.address.trim()) {
    return company.address
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function resolveBankDetails(sale) {
  const saleBankDetails =
    sale?.bankDetails || sale?.printableInvoice?.bankDetails || null;

  if (hasBankDetails(saleBankDetails)) {
    return saleBankDetails;
  }

  return STATIC_COMPANY_SETTINGS.bankDetails;
}

function formatStockType(stockType) {
  return stockTypeLabels[stockType] || stockType || fallback;
}

function convertBelowThousand(value) {
  const number = Number(value);
  const hundred = Math.floor(number / 100);
  const rest = number % 100;
  const words = [];

  if (hundred) {
    words.push(`${ones[hundred]} Hundred`);
  }

  if (rest) {
    if (rest < 20) {
      words.push(ones[rest]);
    } else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      words.push(`${tens[ten]}${one ? ` ${ones[one]}` : ''}`);
    }
  }

  return words.join(' ');
}

function numberToIndianWords(value) {
  const rounded = Math.round(Number(value || 0));

  if (!rounded) {
    return 'Zero Rupees Only';
  }

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const rest = rounded % 1000;
  const words = [];

  if (crore) {
    words.push(`${convertBelowThousand(crore)} Crore`);
  }

  if (lakh) {
    words.push(`${convertBelowThousand(lakh)} Lakh`);
  }

  if (thousand) {
    words.push(`${convertBelowThousand(thousand)} Thousand`);
  }

  if (rest) {
    words.push(convertBelowThousand(rest));
  }

  return `${words.join(' ')} Rupees Only`;
}

function getSaleItems(sale) {
  if (Array.isArray(sale?.items) && sale.items.length) {
    return sale.items;
  }

  if (sale?.product || sale?.productName) {
    return [
      {
        stockType: 'legacy-product',
        itemNumber: '',
        productName: sale?.product?.name || sale?.productName,
        size: '',
        colour: '',
        weight: null,
        sellingUnit: '',
        quantity: sale?.quantity,
        sellingPrice: sale?.sellingPrice,
        gstRate: sale?.gstRate || 0,
        lineSubtotal: sale?.subtotal || sale?.totalAmount,
        gstAmount: sale?.gstAmount || 0,
        lineTotal: sale?.totalAmount,
      },
    ];
  }

  return [];
}

function getTerms(sale) {
  const terms = sale?.termsAndConditions || sale?.printableInvoice?.termsAndConditions;

  if (Array.isArray(terms)) {
    return terms.filter(Boolean);
  }

  if (typeof terms === 'string') {
    return terms
      .split('\n')
      .map((term) => term.trim())
      .filter(Boolean);
  }

  return [];
}

function hasBankDetails(bankDetails) {
  return [
    bankDetails?.bankName,
    bankDetails?.name,
    bankDetails?.accountHolderName,
    bankDetails?.accountNumber,
    bankDetails?.ifsc,
    bankDetails?.ifscCode,
    bankDetails?.branch,
  ].some(isPresent);
}

function hasTransportDetails(sale) {
  return [
    Number(sale?.parcelCount || 0) > 0 ? sale.parcelCount : '',
    sale?.transportName,
    sale?.vehicleNumber,
    sale?.deliveryNote,
    sale?.referenceNumber,
    sale?.referenceDate,
    sale?.buyerOrderNumber,
    sale?.buyerOrderDate,
    sale?.dispatchDocumentNumber,
    sale?.dispatchThrough,
    sale?.dispatchDate,
    sale?.destination,
    sale?.termsOfDelivery,
    sale?.transportDetails?.transportName,
    sale?.transportDetails?.vehicleNumber,
  ].some(isPresent);
}

function getDescriptionLines(item) {
  return [
    item.itemNumber ? `Item No: ${item.itemNumber}` : '',
    item.size ? `Size: ${item.size}` : '',
    item.colour || item.color ? `Colour: ${item.colour || item.color}` : '',
    isPresent(item.weight) ? `Weight: ${item.weight} KG` : '',
    item.stockType ? `Type: ${formatStockType(item.stockType)}` : '',
  ].filter(Boolean);
}

function getInvoiceDetailRows(sale) {
  return [
    ['Invoice No.', sale.invoiceNumber],
    ['Invoice Date', formatDate(sale.invoiceDate)],
    ['Delivery Note', sale.deliveryNote],
    ['Reference No.', sale.referenceNumber],
    ['Reference Date', sale.referenceDate ? formatDate(sale.referenceDate) : ''],
    ['Buyer Order No.', sale.buyerOrderNumber],
    ['Buyer Order Date', sale.buyerOrderDate ? formatDate(sale.buyerOrderDate) : ''],
    ['Dispatch Doc No.', sale.dispatchDocumentNumber],
    ['Dispatch Through', sale.dispatchThrough || sale.transportName],
    ['Dispatch Date', sale.dispatchDate ? formatDate(sale.dispatchDate) : ''],
    ['Destination', sale.destination],
    ['Vehicle No.', sale.vehicleNumber],
    ['Terms of Delivery', sale.termsOfDelivery],
    ['Payment Type', sale.paymentType],
    ['Due Date', sale.dueDate ? formatDate(sale.dueDate) : ''],
  ].filter(([, value]) => isPresent(value) && value !== 'Not available');
}

function DetailLine({ label, value }) {
  if (!isPresent(value)) {
    return null;
  }

  return (
    <div className="flex justify-between gap-4 border-b border-border/70 py-1.5 text-xs print:py-1.5 print:text-[7px]">
      <span className="text-body">{label}</span>
      <span className="text-right font-semibold text-heading">{value}</span>
    </div>
  );
}

function SaleInvoicePreviewPage() {
  const { saleId } = useParams();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    let ignore = false;

    async function loadSale() {
      try {
        const data = await fetchSaleById(saleId);

        if (!ignore) {
          setSale(resolveSale(data));
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load invoice preview', getApiErrorMessage(error));
          navigate('/sales');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSale();

    return () => {
      ignore = true;
    };
  }, [navigate, saleId, toast]);

  const items = useMemo(() => getSaleItems(sale), [sale]);
  const terms = useMemo(() => getTerms(sale), [sale]);

  const totals = useMemo(() => {
    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + Number(item.lineSubtotal || 0),
      0,
    );
    const calculatedGst = items.reduce(
      (sum, item) => sum + Number(item.gstAmount || 0),
      0,
    );

    return {
      subtotal: sale?.subtotal ?? calculatedSubtotal,
      gstAmount: sale?.gstAmount ?? calculatedGst,
      grandTotal: sale?.grandTotal ?? sale?.totalAmount ?? calculatedSubtotal + calculatedGst,
      paidAmount: sale?.paidAmount ?? sale?.paid ?? 0,
      outstandingAmount: sale?.outstandingAmount ?? sale?.outstanding ?? 0,
      freightCharges: sale?.freightCharges ?? 0,
      roundOff: sale?.roundOff ?? 0,
    };
  }, [items, sale]);

  const gstSummary = useMemo(() => {
    const groups = new Map();

    items.forEach((item) => {
      const hsnSac = item.hsnSac || '';
      const rate = Number(item.gstRate || 0);
      const key = `${hsnSac || 'none'}-${rate}`;
      const current = groups.get(key) || {
        hsnSac,
        rate,
        taxable: 0,
        gst: 0,
      };

      current.taxable += Number(item.lineSubtotal || 0);
      current.gst += Number(item.gstAmount || 0);
      groups.set(key, current);
    });

    return Array.from(groups.values());
  }, [items]);

  if (loading || !sale) {
    return <SalesPageSkeleton />;
  }

  const currentSaleId = resolveSaleId(sale, saleId);
  const customerName = resolveCustomerName(sale);
  const company = resolveCompany(sale);
  const companyAddressLines = resolveCompanyAddress(company);
  const bankDetails = resolveBankDetails(sale);
  const isCancelled = sale.invoiceStatus === 'Cancelled';
  const showBankDetails = hasBankDetails(bankDetails);
  const showTransport = hasTransportDetails(sale);
  const showTerms = terms.length > 0;
  const showNotes = isPresent(sale.notes) || isPresent(sale.remarks);
  const companyName = company.companyName || company.name || STATIC_COMPANY_SETTINGS.companyName;
  const invoiceDetailRows = getInvoiceDetailRows(sale);

  return (
    <div className="space-y-6 print:space-y-0">

      <section className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Invoice Preview</p>
          <h1 className="mt-2 text-3xl font-bold text-heading">{sale.invoiceNumber}</h1>
          <p className="mt-2 text-sm text-body">
            Professional tax invoice preview for {customerName}
          </p>
        </div>

        <div className="flex flex-row gap-3">
          <Link to={`/sales/${currentSaleId}`}>
            <Button type="button" variant="outline">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          {hasPermission(PERMISSIONS.canEditSales) && !isCancelled ? (
            <Link to={`/sales/${currentSaleId}/edit`}>
              <Button type="button" variant="primary" title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}

          <Button type="button" onClick={() => window.print()} title="Print">
            <Printer className="h-4 w-4" variant="warning" />
          </Button>
        </div>
      </section>

      <section
        className="invoice-print-root invoice-page relative mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-sm print:m-0 print:w-full print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none"
      >
        {isCancelled ? (
          <>
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="-rotate-12 border-4 border-danger px-8 py-3 text-5xl font-black uppercase tracking-[0.2em] text-danger opacity-10 print:text-4xl">
                Cancelled
              </div>
            </div>

            <div className="mb-3 break-inside-avoid rounded-xl border border-danger bg-danger-tint p-3 text-xs text-danger print:mb-1 print:rounded-none print:p-1.5 print:text-[8px]">
              Cancelled on {formatDate(sale.cancelledAt)}. Reason:{' '}
              {valueOrFallback(sale.cancellationReason)}
            </div>
          </>
        ) : null}

        <div className="border border-heading">
          {/* Header */}
          <div className="border-b border-heading px-5 py-3 print:px-3 print:py-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center">
                <img
                  src={invoice}
                  alt="Customized Polycast"
                  className="h-14 w-auto max-w-[220px] object-contain print:h-10 print:max-w-[160px]"
                />
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-body print:text-[7px] print:tracking-[0.16em]">
                  Original for Recipient
                </p>

                <h1 className="mt-1 text-xl font-black uppercase text-heading print:text-base print:leading-none">
                  Tax Invoice
                </h1>
              </div>
            </div>
          </div>

          {/* Company and invoice details */}
          <div className="grid break-inside-avoid grid-cols-2 border-b border-heading">
            <div className="border-r border-heading p-3 print:p-2">
              <h3 className="break-words text-lg font-black uppercase leading-tight text-heading print:text-[12px]">
                {companyName}
              </h3>

              <div className="mt-1 space-y-0.5 text-md leading-snug text-body print:mt-0.5 print:text-[8px] print:leading-[1.2]">
                {companyAddressLines.map((line) => (
                  <p key={line} className="break-words">
                    {line}
                  </p>
                ))}

                {isPresent(company.gstin || company.gst) ? (
                  <p>GSTIN: {company.gstin || company.gst}</p>
                ) : null}

                {isPresent(company.udyamNumber) ? (
                  <p>Udyam No: {company.udyamNumber}</p>
                ) : null}

                {isPresent(company.state) || isPresent(company.stateCode) ? (
                  <p>
                    State: {valueOrFallback(company.state)}
                    {isPresent(company.stateCode)
                      ? ` | State Code: ${company.stateCode}`
                      : ''}
                  </p>
                ) : null}

                {isPresent(company.mobile || company.phone) ||
                  isPresent(company.email) ? (
                  <p className="break-words">
                    {isPresent(company.mobile || company.phone)
                      ? `Phone: ${company.mobile || company.phone}`
                      : ''}

                    {isPresent(company.mobile || company.phone) &&
                      isPresent(company.email)
                      ? ' | '
                      : ''}

                    {isPresent(company.email) ? `Email: ${company.email}` : ''}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 text-sm print:text-[10px]">
              {invoiceDetailRows.map(([label, value], index) => {
                if (!isPresent(value)) return null;

                return (
                  <div
                    key={`${label}-${index}`}
                    className="min-h-[50px] border-b border-heading px-2 py-1.5 odd:border-r print:min-h-[34px] print:px-1 print:py-1"
                  >
                    <p className="text-[12px] font-medium leading-tight text-body print:text-[7px]">
                      {label}
                    </p>

                    <p className="mt-2 break-words font-semibold text-[12px] leading-tight text-heading print:mt-0.5">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buyer and status */}
          <div className="grid break-inside-avoid grid-cols-2 border-b border-heading">
            <div className="border-r border-heading p-3 print:p-2">
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-heading print:text-[7px]">
                Buyer Details
              </p>

              <h3 className="mt-1 break-words text-sm font-bold leading-tight text-heading print:text-[9px]">
                {customerName}
              </h3>

              <div className="mt-1 space-y-0.5 text-sm leading-snug text-body print:text-[8px] print:leading-[1.2]">
                <p>Mobile: {valueOrFallback(sale.customerMobile)}</p>

                <p className="break-words">
                  Address: {valueOrFallback(sale.customerAddress)}
                </p>

                <p>Location: {valueOrFallback(sale.customerLocation)}</p>
                <p>GSTIN: {valueOrFallback(sale.customerGST)}</p>
              </div>
            </div>

            <div className="p-3 print:p-2">
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-heading print:text-[7px]">
                Invoice Status
              </p>

              <div className="mt-1.5 flex flex-wrap gap-1.5 print:mt-1 print:gap-1">
                <Badge variant={getPaymentBadgeVariant(sale.paymentType)}>
                  {sale.paymentType || fallback}
                </Badge>

                <Badge variant={getInvoiceStatusBadgeVariant(sale.invoiceStatus)}>
                  {sale.invoiceStatus || fallback}
                </Badge>
              </div>

              {showTransport ? (
                <div className="mt-2 space-y-0.5 text-sm leading-snug text-body print:mt-1 print:text-[8px]">
                  <p className="font-semibold text-heading">Transport Details</p>

                  {isPresent(sale.parcelCount) ? (
                    <p>Parcel Count: {sale.parcelCount}</p>
                  ) : null}

                  {isPresent(sale.transportName) ? (
                    <p>Transport: {sale.transportName}</p>
                  ) : null}

                  {isPresent(sale.vehicleNumber) ? (
                    <p>Vehicle No: {sale.vehicleNumber}</p>
                  ) : null}

                  {isPresent(sale.destination) ? (
                    <p>Destination: {sale.destination}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="invoice-table w-full min-w-[100px] table-auto border-collapse text-[12px] print:min-w-0 print:table-fixed print:text-[12px] print:leading-[1.1]">
              <thead>
                <tr className="bg-background text-left text-heading">
                  <th className="w-8 border-b border-r border-heading px-1.5 py-1.5 text-center print:px-1 print:py-1">
                    Sl No
                  </th>

                  <th className="border-b border-r border-heading px-1.5 py-1.5 print:px-1 print:py-1">
                    Description Of Goods & Services
                  </th>

                  <th className="w-20 border-b border-r border-heading px-1.5 py-1.5 print:w-[12%] print:px-1 print:py-1">
                    HSN/SAC
                  </th>

                  <th className="w-14 border-b border-r border-heading px-1.5 py-1.5 text-right print:w-[7%] print:px-1 print:py-1">
                    Quality
                  </th>

                  <th className="w-14 border-b border-r border-heading px-1.5 py-1.5 print:w-[7%] print:px-1 print:py-1">
                    Rate
                  </th>

                  <th className="w-20 border-b border-r border-heading px-1.5 py-1.5 text-right print:w-[11%] print:px-1 print:py-1">
                    Per
                  </th>

                  <th className="w-24 border-b border-heading px-1.5 py-1.5 text-right print:w-[13%] print:px-1 print:py-1">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.length ? (
                  items.map((item, index) => (
                    <tr
                      className="break-inside-avoid"
                      key={
                        item.id ||
                        item._id ||
                        `${item.stockType}-${item.stockRef}-${index}`
                      }
                    >
                      <td className="border-b border-r border-heading px-1.5 py-1.5 text-center print:px-1 print:py-1">
                        {index + 1}
                      </td>

                      <td className="border-b border-r border-heading px-1.5 py-1.5 print:px-1 print:py-1">
                        <p className="font-semibold leading-tight text-heading">
                          {valueOrFallback(item.productName)}
                        </p>

                        {getDescriptionLines(item).map((line) => (
                          <p key={line} className="leading-tight text-body">
                            {line}
                          </p>
                        ))}
                      </td>

                      <td className="break-words border-b border-r border-heading px-1.5 py-1.5 print:px-1 print:py-1">
                        {valueOrFallback(item.hsnSac)}
                      </td>

                      <td className="border-b border-r border-heading px-1.5 py-1.5 text-right print:px-1 print:py-1">
                        {item.quantity ?? 0}
                      </td>

                      <td className="border-b border-r border-heading px-1.5 py-1.5 print:px-1 print:py-1">
                        {formatCurrency(item.sellingPrice)}
                      </td>

                      <td className="border-b border-r border-heading px-1.5 py-1.5 text-right print:px-1 print:py-1">
                        {valueOrFallback(item.sellingUnit)} <br />
                        {Number(item.gstRate || 0)}%
                      </td>

                      <td className="border-b border-r border-heading px-1.5 py-1.5 text-right print:px-1 print:py-1">
                        {formatCurrency(item.lineSubtotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="border-b border-heading px-2 py-5 text-center text-body print:py-2"
                    >
                      No sale items are available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Amount and totals */}
          <div className="grid break-inside-avoid grid-cols-[1fr_230px] border-b border-heading print:grid-cols-[1fr_210px]">
            <div className="border-r border-heading p-3 print:p-2">
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-heading print:text-[7px]">
                Amount in Words
              </p>

              <p className="mt-1 text-sm font-semibold leading-tight text-heading print:text-[8px]">
                {numberToIndianWords(totals.grandTotal)}
              </p>

              <p className="mt-2 text-[12px] font-black uppercase tracking-[0.14em] text-heading print:mt-1 print:text-[7px]">
                Tax Amount in Words
              </p>

              <p className="mt-1 text-sm font-semibold leading-tight text-heading print:text-[8px]">
                {numberToIndianWords(totals.gstAmount)}
              </p>

              {gstSummary.length ? (
                <div className="mt-2 break-inside-avoid print:mt-1">
                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-heading print:text-[7px]">
                    GST Summary
                  </p>

                  <table className="mt-1 w-full border-collapse text-[12px] print:text-[7px]">
                    <thead>
                      <tr className="bg-background text-heading">
                        <th className="border border-heading px-1.5 py-1 text-left print:px-1 print:py-0.5">
                          HSN/SAC
                        </th>

                        <th className="border border-heading px-1.5 py-1 text-right print:px-1 print:py-0.5">
                          Taxable
                        </th>

                        <th className="border border-heading px-1.5 py-1 text-right print:px-1 print:py-0.5">
                          GST Rate
                        </th>

                        <th className="border border-heading px-1.5 py-1 text-right print:px-1 print:py-0.5">
                          GST Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {gstSummary.map((group) => (
                        <tr key={group.rate}>
                          <td className="border border-heading px-1.5 py-1 print:px-1 print:py-0.5">
                            {valueOrFallback(group.hsnSac)}
                          </td>

                          <td className="border border-heading px-1.5 py-1 text-right print:px-1 print:py-0.5">
                            {formatCurrency(group.taxable)}
                          </td>

                          <td className="border border-heading px-1.5 py-1 text-right print:px-1 print:py-0.5">
                            {group.rate}%
                          </td>

                          <td className="border border-heading px-1.5 py-1 text-right print:px-1 print:py-0.5">
                            {formatCurrency(group.gst)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <div className="p-3 text-sm print:p-2 print:text-[8px]">
              <div className="space-y-1 print:space-y-0.5">
                <div className="flex justify-between gap-3">
                  <span className="text-body">Subtotal</span>

                  <span className="font-semibold text-heading">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-body">GST Amount</span>

                  <span className="font-semibold text-heading">
                    {formatCurrency(totals.gstAmount)}
                  </span>
                </div>

                {Number(totals.freightCharges || 0) ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-body">Freight Charges</span>

                    <span className="font-semibold text-heading">
                      {formatCurrency(totals.freightCharges)}
                    </span>
                  </div>
                ) : null}

                {Number(totals.roundOff || 0) ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-body">Round Off</span>

                    <span className="font-semibold text-heading">
                      {formatCurrency(totals.roundOff)}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between gap-3 border-t border-heading pt-1">
                  <span className="font-black uppercase text-heading">
                    Grand Total
                  </span>

                  <span className="font-black text-heading">
                    {formatCurrency(totals.grandTotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-body">Paid</span>

                  <span className="font-semibold text-heading">
                    {formatCurrency(totals.paidAmount)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-body">Outstanding</span>

                  <span className="font-semibold text-heading">
                    {formatCurrency(totals.outstandingAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank, terms and notes */}
          {showBankDetails || showTerms || showNotes ? (
            <div className="grid break-inside-avoid grid-cols-2 border-b border-heading">
              {showBankDetails ? (
                <div
                  className={`p-3 print:p-2 ${showTerms || showNotes ? 'border-r border-heading' : 'col-span-2'
                    }`}
                >
                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-heading print:text-[7px]">
                    Company&apos;s Bank Details
                  </p>

                  <div className="mt-1 space-y-0.5 text-sm leading-snug text-body print:text-[8px] print:leading-[1.2]">
                    {isPresent(bankDetails.accountHolderName) ? (
                      <p>
                        Account Holder: {bankDetails.accountHolderName}
                      </p>
                    ) : null}

                    <p>
                      Bank:{' '}
                      {valueOrFallback(
                        bankDetails.bankName || bankDetails.name,
                      )}
                    </p>

                    <p>
                      Account No:{' '}
                      {valueOrFallback(bankDetails.accountNumber)}
                    </p>

                    <p>
                      Branch: {valueOrFallback(bankDetails.branch)}
                    </p>

                    <p>
                      IFSC:{' '}
                      {valueOrFallback(
                        bankDetails.ifsc || bankDetails.ifscCode,
                      )}
                    </p>
                  </div>
                </div>
              ) : null}

              {showTerms || showNotes ? (
                <div
                  className={`p-3 print:p-2 ${!showBankDetails ? 'col-span-2' : ''
                    }`}
                >
                  {showTerms ? (
                    <>
                      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-heading print:text-[7px]">
                        Terms & Conditions
                      </p>

                      <ul className="mt-1 space-y-0.5 text-sm leading-snug text-body print:text-[8px]">
                        {terms.map((term, index) => (
                          <li key={`${term}-${index}`}>
                            {term}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {showNotes ? (
                    <div className={showTerms ? 'mt-2 print:mt-1' : ''}>
                      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-heading print:text-[7px]">
                        Notes
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-body print:text-[8px]">
                        {sale.notes || sale.remarks}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Footer and signature */}
          <div className="grid min-h-24 break-inside-avoid grid-cols-2 print:min-h-[60px]">
            <div className="flex flex-col justify-between border-r border-heading p-3 text-[12px] leading-snug text-body print:p-2 print:text-[7px]">
              <p>
                Certified that the particulars given above are true and correct
                to the best of available invoice records.
              </p>

              <p className="mt-4 text-center font-semibold uppercase text-heading print:mt-2">
                {company.jurisdiction ||
                  STATIC_COMPANY_SETTINGS.jurisdiction}
              </p>
            </div>

            <div className="flex flex-col justify-between p-3 text-right print:p-2">
              <p className="text-sm font-bold text-heading print:text-[8px]">
                For {companyName}
              </p>

              <p className="mt-10 text-sm font-bold text-heading print:mt-6 print:text-[8px]">
                Authorized Signature
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SaleInvoicePreviewPage;
