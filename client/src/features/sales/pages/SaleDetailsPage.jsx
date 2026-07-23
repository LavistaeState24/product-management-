import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ban, FileText, Pencil, ReceiptText } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import SalesPageSkeleton from '@/features/sales/components/SalesPageSkeleton';
import { cancelSale, fetchSaleById } from '@/features/sales/services/saleService';
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

const emptyValue = '-';

function valueOrFallback(value) {
  if (value === 0 || value === false) {
    return String(value);
  }

  return value || emptyValue;
}

function resolveSale(data) {
  return data?.sale || data?.data?.sale || data?.data || data || null;
}

function formatStockType(stockType) {
  const labels = {
    rod: 'Rod',
    sheet: 'Sheet',
    'pu-product': 'PU Product',
    'legacy-product': 'Legacy Product',
  };

  return labels[stockType] || stockType || emptyValue;
}

function getItems(sale) {
  if (Array.isArray(sale?.items) && sale.items.length) {
    return sale.items;
  }

  if (sale?.product || sale?.productName) {
    return [
      {
        stockType: 'legacy-product',
        itemNumber: '',
        productName: sale.product?.name || sale.productName,
        quantity: sale.quantity,
        sellingPrice: sale.sellingPrice,
        gstRate: sale.gstRate || 0,
        lineSubtotal: sale.subtotal || sale.totalAmount,
        gstAmount: sale.gstAmount || 0,
        lineTotal: sale.totalAmount,
      },
    ];
  }

  return [];
}

function getTerms(sale) {
  if (Array.isArray(sale?.termsAndConditions)) {
    return sale.termsAndConditions.filter(Boolean);
  }

  if (typeof sale?.termsAndConditions === 'string') {
    return sale.termsAndConditions
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-sm text-body">{label}</p>
      <p className="mt-2 break-words text-base font-semibold text-heading">
        {valueOrFallback(value)}
      </p>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="panel p-6">
      <div>
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-copy mt-2">{description}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SaleDetailsPage() {
  const { saleId } = useParams();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  async function loadSale() {
    setLoading(true);

    try {
      const data = await fetchSaleById(saleId);
      setSale(resolveSale(data));
    } catch (error) {
      toast.error('Unable to load sale', getApiErrorMessage(error));
      navigate('/sales');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);

      try {
        const data = await fetchSaleById(saleId);

        if (!ignore) {
          setSale(resolveSale(data));
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load sale', getApiErrorMessage(error));
          navigate('/sales');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [navigate, saleId, toast]);

  const items = useMemo(() => getItems(sale), [sale]);
  const terms = useMemo(() => getTerms(sale), [sale]);
  const saleRecordId = sale?.id || sale?._id || saleId;
  const isCancelled = sale?.invoiceStatus === 'Cancelled';

  async function handleCancelSale() {
    const reason = cancelReason.trim();

    if (!reason) {
      toast.error('Cancellation reason required', 'Enter a reason before cancelling this sale.');
      return;
    }

    setCancelLoading(true);

    try {
      const data = await cancelSale(saleRecordId, reason);
      setSale(resolveSale(data));
      setCancelOpen(false);
      setCancelReason('');
      toast.success('Sale cancelled', 'Stock and receivables were adjusted successfully.');
      await loadSale();
    } catch (error) {
      toast.error('Unable to cancel sale', getApiErrorMessage(error));
    } finally {
      setCancelLoading(false);
    }
  }

  if (loading || !sale) {
    return <SalesPageSkeleton />;
  }

  const customerName = sale.customerName || sale.customer?.name;
  const bankDetails = sale.bankDetails || {};
  const printable = sale.printableInvoice || {};
  const company = sale.companySettings || printable.companySettings || {};
  const outstanding = sale.outstandingAmount ?? sale.outstanding ?? 0;
  const grandTotal = sale.grandTotal ?? sale.totalAmount ?? 0;
  const subtotal = sale.subtotal ?? items.reduce(
    (total, item) => total + Number(item.lineSubtotal || 0),
    0,
  );
  const gstAmount = sale.gstAmount ?? items.reduce(
    (total, item) => total + Number(item.gstAmount || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Sale Details</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{sale.invoiceNumber}</h1>
            <p className="mt-2 text-sm text-body">
              {valueOrFallback(customerName)} | {formatDate(sale.invoiceDate)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/sales">
              <Button type="button" variant="outline">
                Back to sales
              </Button>
            </Link>
            <Link to={`/sales/${saleRecordId}/invoice`}>
              <Button type="button" variant="ghost">
                <ReceiptText className="h-4 w-4" />
                Print
              </Button>
            </Link>
            {hasPermission(PERMISSIONS.canEditSales) && !isCancelled ? (
              <Link to={`/sales/${saleRecordId}/edit`}>
                <Button type="button" variant="ghost">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            ) : null}
            {hasPermission(PERMISSIONS.canDeleteSales) && !isCancelled ? (
              <Button type="button" variant="danger" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Invoice Number" value={sale.invoiceNumber} />
        <DetailCard label="Invoice Date" value={formatDate(sale.invoiceDate)} />
        <DetailCard
          label="Invoice Status"
          value={(
            <Badge variant={getInvoiceStatusBadgeVariant(sale.invoiceStatus)}>
              {sale.invoiceStatus || emptyValue}
            </Badge>
          )}
        />
        <DetailCard
          label="Payment Status"
          value={(
            <Badge variant={getPaymentBadgeVariant(sale.paymentType)}>
              {sale.paymentStatus || sale.invoiceStatus || emptyValue}
            </Badge>
          )}
        />
      </section>

      <Section title="Party Details">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailCard label="Party Name" value={customerName} />
          <DetailCard label="Mobile" value={sale.customerMobile} />
          <DetailCard label="Location" value={sale.customerLocation} />
          <DetailCard label="GST" value={sale.customerGST} />
          <div className="md:col-span-2 xl:col-span-4">
            <DetailCard label="Address" value={sale.customerAddress} />
          </div>
        </div>
      </Section>

      <Section title="Items Table">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-[1120px] w-full border-collapse">
            <thead className="bg-background">
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-body">
                <th className="px-4 py-3 font-semibold">Item Number</th>
                <th className="px-4 py-3 font-semibold">Product Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Colour</th>
                <th className="px-4 py-3 font-semibold">Weight</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">GST</th>
                <th className="px-4 py-3 font-semibold">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item, index) => (
                  <tr
                    key={item.id || item._id || `${item.stockType}-${item.stockRef}-${index}`}
                    className="border-t border-border text-sm text-heading"
                  >
                    <td className="px-4 py-4">{valueOrFallback(item.itemNumber)}</td>
                    <td className="px-4 py-4 font-semibold">{valueOrFallback(item.productName)}</td>
                    <td className="px-4 py-4">{formatStockType(item.stockType)}</td>
                    <td className="px-4 py-4">{valueOrFallback(item.size)}</td>
                    <td className="px-4 py-4">{valueOrFallback(item.colour || item.color)}</td>
                    <td className="px-4 py-4">{item.weight ?? emptyValue}</td>
                    <td className="px-4 py-4">{valueOrFallback(item.sellingUnit)}</td>
                    <td className="px-4 py-4">{item.quantity ?? 0}</td>
                    <td className="px-4 py-4">{formatCurrency(item.sellingPrice)}</td>
                    <td className="px-4 py-4">
                      {Number(item.gstRate || 0)}% / {formatCurrency(item.gstAmount)}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-body">
                    No sale items are available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Section title="Payment">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailCard label="Payment Type" value={sale.paymentType} />
              <DetailCard label="Paid Amount" value={formatCurrency(sale.paidAmount ?? sale.paid)} />
              <DetailCard label="Outstanding" value={formatCurrency(outstanding)} />
              <DetailCard label="Payment Status" value={sale.paymentStatus || sale.invoiceStatus} />
            </div>
          </Section>

          <Section title="Credit">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailCard label="Credit Days" value={sale.creditDays ?? 0} />
              <DetailCard label="Due Date" value={sale.dueDate ? formatDate(sale.dueDate) : emptyValue} />
            </div>
          </Section>

          <Section title="Transport">
            <div className="grid gap-4 md:grid-cols-3">
              <DetailCard label="Parcel Count" value={sale.parcelCount ?? 0} />
              <DetailCard label="Transport Name" value={sale.transportName} />
              <DetailCard label="Vehicle Number" value={sale.vehicleNumber} />
            </div>
          </Section>

          <Section title="Bank Details">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailCard label="Bank Name" value={bankDetails.bankName || bankDetails.name} />
              <DetailCard label="Account Number" value={bankDetails.accountNumber} />
              <DetailCard label="IFSC" value={bankDetails.ifsc || bankDetails.ifscCode} />
              <DetailCard label="Branch" value={bankDetails.branch} />
            </div>
          </Section>

          <Section title="Terms">
            {terms.length ? (
              <ul className="space-y-2 text-sm text-body">
                {terms.map((term, index) => (
                  <li key={`${term}-${index}`}>{term}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-body">No terms were added.</p>
            )}
          </Section>

          <Section title="Notes">
            <p className="whitespace-pre-wrap text-sm text-body">
              {sale.notes || sale.remarks || 'No notes were added.'}
            </p>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Totals">
            <div className="space-y-3 text-sm text-body">
              <div className="flex items-center justify-between gap-4">
                <span>Subtotal</span>
                <span className="font-semibold text-heading">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>GST Amount</span>
                <span className="font-semibold text-heading">{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <span>Grand Total</span>
                <span className="text-lg font-bold text-heading">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Paid</span>
                <span className="font-semibold text-heading">
                  {formatCurrency(sale.paidAmount ?? sale.paid)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <span>Outstanding</span>
                <span className="text-lg font-bold text-heading">{formatCurrency(outstanding)}</span>
              </div>
            </div>
          </Section>

          <Section title="Audit Information">
            <div className="space-y-4">
              <DetailCard label="Created At" value={formatDate(sale.createdAt)} />
              <DetailCard label="Updated At" value={formatDate(sale.updatedAt)} />
              <DetailCard label="Confirmed By" value={sale.confirmedBy?.name || sale.confirmedBy} />
              <DetailCard label="Confirmed At" value={sale.confirmedAt ? formatDate(sale.confirmedAt) : emptyValue} />
              <DetailCard label="Cancelled By" value={sale.cancelledBy?.name || sale.cancelledBy} />
              <DetailCard label="Cancelled At" value={sale.cancelledAt ? formatDate(sale.cancelledAt) : emptyValue} />
              <DetailCard label="Cancellation Reason" value={sale.cancellationReason} />
            </div>
          </Section>

          <Section title="Company">
            <div className="space-y-4">
              <DetailCard label="Company Name" value={company.name || company.companyName} />
              <DetailCard label="GST" value={company.gst || company.gstin} />
              <DetailCard label="Address" value={company.address} />
            </div>
          </Section>

          <section className="panel p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary-tint p-3 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="section-title">Printable Invoice</h2>
                <p className="section-copy mt-1">Open the print view for A4 invoice output.</p>
              </div>
            </div>
            <Link to={`/sales/${saleRecordId}/invoice`} className="mt-4 inline-flex">
              <Button type="button" variant="outline">
                <ReceiptText className="h-4 w-4" />
                Open Print View
              </Button>
            </Link>
          </section>
        </div>
      </section>

      <Modal
        open={cancelOpen}
        title="Cancel sale"
        description="This keeps the invoice history and restores stock through the backend transaction."
        onClose={() => !cancelLoading && setCancelOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Cancel invoice {sale.invoiceNumber} for {valueOrFallback(customerName)}?
          </p>
          <Textarea
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={4}
            placeholder="Enter reason"
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelLoading}
            >
              Close
            </Button>
            <Button type="button" variant="danger" loading={cancelLoading} onClick={handleCancelSale}>
              Cancel Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SaleDetailsPage;
