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
    sale?.transportDetails?.transportName,
    sale?.transportDetails?.vehicleNumber,
  ].some(isPresent);
}

function DetailLine({ label, value }) {
  if (!isPresent(value)) {
    return null;
  }

  return (
    <div className="flex justify-between gap-4 border-b border-border/70 py-1.5 text-xs">
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
    };
  }, [items, sale]);

  const gstSummary = useMemo(() => {
    const groups = new Map();

    items.forEach((item) => {
      const rate = Number(item.gstRate || 0);
      const current = groups.get(rate) || {
        rate,
        taxable: 0,
        gst: 0,
      };

      current.taxable += Number(item.lineSubtotal || 0);
      current.gst += Number(item.gstAmount || 0);
      groups.set(rate, current);
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

        <div className="flex flex-wrap gap-3">
          <Link to={`/sales/${currentSaleId}`}>
            <Button type="button" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to details
            </Button>
          </Link>

          {hasPermission(PERMISSIONS.canEditSales) && !isCancelled ? (
            <Link to={`/sales/${currentSaleId}/edit`}>
              <Button type="button" variant="ghost">
                <Pencil className="h-4 w-4" />
                Edit Sale
              </Button>
            </Link>
          ) : null}

          <Button type="button" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </section>

      <section className="invoice-print-root relative mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-sm print:m-0 print:w-full print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        {isCancelled ? (
          <>
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="-rotate-12 border-4 border-danger px-10 py-4 text-6xl font-black uppercase tracking-[0.2em] text-danger opacity-10">
                Cancelled
              </div>
            </div>
            <div className="mb-4 break-inside-avoid rounded-2xl border border-danger bg-danger-tint p-4 text-sm text-danger print:rounded-none">
              Cancelled on {formatDate(sale.cancelledAt)}. Reason:{' '}
              {valueOrFallback(sale.cancellationReason)}
            </div>
          </>
        ) : null}

        <div className="border border-heading">
          <div className="border-b border-heading px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-body">
              Original for Recipient
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.12em] text-heading">
              Tax Invoice
            </h2>
          </div>

          <div className="grid break-inside-avoid border-b border-heading lg:grid-cols-[1.25fr_0.75fr]">
            <div className="border-b border-heading p-4 lg:border-b-0 lg:border-r">
              <h3 className="break-words text-xl font-black uppercase text-heading">
                {companyName}
              </h3>
              <div className="mt-2 space-y-1 text-sm text-body">
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
                    {isPresent(company.stateCode) ? ` | State Code: ${company.stateCode}` : ''}
                  </p>
                ) : null}
                {isPresent(company.mobile || company.phone) || isPresent(company.email) ? (
                  <p className="break-words">
                    {isPresent(company.mobile || company.phone)
                      ? `Phone: ${company.mobile || company.phone}`
                      : ''}
                    {isPresent(company.mobile || company.phone) && isPresent(company.email)
                      ? ' | '
                      : ''}
                    {isPresent(company.email) ? `Email: ${company.email}` : ''}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="p-4">
              <DetailLine label="Invoice No." value={sale.invoiceNumber} />
              <DetailLine label="Invoice Date" value={formatDate(sale.invoiceDate)} />
              <DetailLine label="Payment Type" value={sale.paymentType} />
              <DetailLine label="Payment Status" value={sale.paymentStatus || sale.invoiceStatus} />
              <DetailLine label="Due Date" value={sale.dueDate ? formatDate(sale.dueDate) : ''} />
            </div>
          </div>

          <div className="grid break-inside-avoid border-b border-heading lg:grid-cols-2">
            <div className="border-b border-heading p-4 lg:border-b-0 lg:border-r">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-heading">
                Buyer Details
              </p>
              <h3 className="mt-2 break-words text-base font-bold text-heading">{customerName}</h3>
              <div className="mt-2 space-y-1 text-sm text-body">
                <p>Mobile: {valueOrFallback(sale.customerMobile)}</p>
                <p className="break-words">Address: {valueOrFallback(sale.customerAddress)}</p>
                <p>Location: {valueOrFallback(sale.customerLocation)}</p>
                <p>GSTIN: {valueOrFallback(sale.customerGST)}</p>
              </div>
            </div>

            <div className="p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-heading">
                Invoice Status
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={getPaymentBadgeVariant(sale.paymentType)}>
                  {sale.paymentType || fallback}
                </Badge>
                <Badge variant={getInvoiceStatusBadgeVariant(sale.invoiceStatus)}>
                  {sale.invoiceStatus || fallback}
                </Badge>
              </div>
              {showTransport ? (
                <div className="mt-4 space-y-1 text-sm text-body">
                  <p className="font-semibold text-heading">Transport Details</p>
                  {isPresent(sale.parcelCount) ? <p>Parcel Count: {sale.parcelCount}</p> : null}
                  {isPresent(sale.transportName) ? <p>Transport: {sale.transportName}</p> : null}
                  {isPresent(sale.vehicleNumber) ? <p>Vehicle No: {sale.vehicleNumber}</p> : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="invoice-table w-full min-w-[960px] table-auto border-collapse text-xs print:min-w-0 print:table-fixed">
              <thead>
                <tr className="bg-background text-left text-heading">
                  <th className="w-10 border-b border-r border-heading px-2 py-2 text-center">Sr</th>
                  <th className="border-b border-r border-heading px-2 py-2">Description</th>
                  <th className="w-20 border-b border-r border-heading px-2 py-2">Item No.</th>
                  <th className="w-16 border-b border-r border-heading px-2 py-2">Size</th>
                  <th className="w-16 border-b border-r border-heading px-2 py-2">Colour</th>
                  <th className="w-16 border-b border-r border-heading px-2 py-2 text-right">Qty</th>
                  <th className="w-16 border-b border-r border-heading px-2 py-2">Unit</th>
                  <th className="w-20 border-b border-r border-heading px-2 py-2 text-right">Rate</th>
                  <th className="w-16 border-b border-r border-heading px-2 py-2 text-right">GST</th>
                  <th className="w-24 border-b border-heading px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item, index) => (
                    <tr className="break-inside-avoid" key={item.id || item._id || `${item.stockType}-${item.stockRef}-${index}`}>
                      <td className="border-b border-r border-heading px-2 py-2 text-center">
                        {index + 1}
                      </td>
                      <td className="border-b border-r border-heading px-2 py-2">
                        <p className="font-semibold text-heading">
                          {valueOrFallback(item.productName)}
                        </p>
                        <p className="text-body">
                          {formatStockType(item.stockType)}
                          {isPresent(item.weight) ? ` | Weight: ${item.weight} KG` : ''}
                        </p>
                      </td>
                      <td className="border-b border-r border-heading px-2 py-2">
                        {valueOrFallback(item.itemNumber)}
                      </td>
                      <td className="border-b border-r border-heading px-2 py-2">
                        {valueOrFallback(item.size)}
                      </td>
                      <td className="border-b border-r border-heading px-2 py-2">
                        {valueOrFallback(item.colour || item.color)}
                      </td>
                      <td className="border-b border-r border-heading px-2 py-2 text-right">
                        {item.quantity ?? 0}
                      </td>
                      <td className="border-b border-r border-heading px-2 py-2">
                        {valueOrFallback(item.sellingUnit)}
                      </td>
                      <td className="border-b border-r border-heading px-2 py-2 text-right">
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td className="border-b border-r border-heading px-2 py-2 text-right">
                        {Number(item.gstRate || 0)}%
                      </td>
                      <td className="border-b border-heading px-2 py-2 text-right font-semibold">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="border-b border-heading px-2 py-8 text-center text-body">
                      No sale items are available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid break-inside-avoid border-b border-heading lg:grid-cols-[1fr_330px]">
            <div className="border-b border-heading p-4 lg:border-b-0 lg:border-r">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-heading">
                Amount in Words
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {numberToIndianWords(totals.grandTotal)}
              </p>

              {gstSummary.length ? (
                <div className="mt-5 break-inside-avoid">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-heading">
                    GST Summary
                  </p>
                  <table className="mt-2 w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-background text-heading">
                        <th className="border border-heading px-2 py-1 text-left">GST Rate</th>
                        <th className="border border-heading px-2 py-1 text-right">Taxable</th>
                        <th className="border border-heading px-2 py-1 text-right">GST Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstSummary.map((group) => (
                        <tr key={group.rate}>
                          <td className="border border-heading px-2 py-1">{group.rate}%</td>
                          <td className="border border-heading px-2 py-1 text-right">
                            {formatCurrency(group.taxable)}
                          </td>
                          <td className="border border-heading px-2 py-1 text-right">
                            {formatCurrency(group.gst)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <div className="p-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-body">Subtotal</span>
                  <span className="font-semibold text-heading">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-body">GST Amount</span>
                  <span className="font-semibold text-heading">{formatCurrency(totals.gstAmount)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-heading pt-2">
                  <span className="font-black uppercase text-heading">Grand Total</span>
                  <span className="font-black text-heading">{formatCurrency(totals.grandTotal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-body">Paid</span>
                  <span className="font-semibold text-heading">{formatCurrency(totals.paidAmount)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-body">Outstanding</span>
                  <span className="font-semibold text-heading">
                    {formatCurrency(totals.outstandingAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {(showBankDetails || showTerms || showNotes) ? (
            <div className="grid break-inside-avoid border-b border-heading lg:grid-cols-2">
              {showBankDetails ? (
                <div className="border-b border-heading p-4 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-heading">
                    Company&apos;s Bank Details
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-body">
                    {isPresent(bankDetails.accountHolderName) ? (
                      <p>Account Holder: {bankDetails.accountHolderName}</p>
                    ) : null}
                    <p>Bank: {valueOrFallback(bankDetails.bankName || bankDetails.name)}</p>
                    <p>Account No: {valueOrFallback(bankDetails.accountNumber)}</p>
                    <p>Branch: {valueOrFallback(bankDetails.branch)}</p>
                    <p>IFSC: {valueOrFallback(bankDetails.ifsc || bankDetails.ifscCode)}</p>
                  </div>
                </div>
              ) : null}

              {(showTerms || showNotes) ? (
                <div className="p-4">
                  {showTerms ? (
                    <>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-heading">
                        Terms & Conditions
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-body">
                        {terms.map((term, index) => (
                          <li key={`${term}-${index}`}>{term}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {showNotes ? (
                    <div className={showTerms ? 'mt-4' : ''}>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-heading">
                        Notes
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-body">
                        {sale.notes || sale.remarks}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid min-h-32 break-inside-avoid lg:grid-cols-2">
            <div className="flex flex-col justify-between border-b border-heading p-4 text-xs text-body lg:border-b-0 lg:border-r">
              <p>
                Certified that the particulars given above are true and correct to the best of
                available invoice records.
              </p>
              <p className="mt-8 text-center font-semibold uppercase text-heading">
                {company.jurisdiction || STATIC_COMPANY_SETTINGS.jurisdiction}
              </p>
            </div>
            <div className="flex flex-col justify-between p-4 text-right">
              <p className="text-sm font-bold text-heading">For {companyName}</p>
              <p className="mt-16 text-sm font-bold text-heading">Authorized Signature</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SaleInvoicePreviewPage;