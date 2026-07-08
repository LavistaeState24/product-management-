import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, Pencil, ReceiptText, Trash2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SalesPageSkeleton from '@/features/sales/components/SalesPageSkeleton';
import { deleteSale, fetchSaleById } from '@/features/sales/services/saleService';
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

function DetailCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <p className="text-sm text-body">{label}</p>
      <p className="mt-2 text-base font-semibold text-heading">{value}</p>
    </div>
  );
}

function SaleDetailsPage() {
  const { saleId } = useParams();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    let ignore = false;

    async function loadSale() {
      try {
        const data = await fetchSaleById(saleId);

        if (!ignore) {
          setSale(data.sale);
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

    loadSale();

    return () => {
      ignore = true;
    };
  }, [navigate, saleId, toast]);

  async function handleDelete() {
    setDeleteLoading(true);

    try {
      await deleteSale(saleId);
      toast.success('Sale deleted', 'The sale was removed and stock was restored.');
      navigate('/sales');
    } catch (error) {
      toast.error('Unable to delete sale', getApiErrorMessage(error));
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading || !sale) {
    return <SalesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Sale Details</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{sale.invoiceNumber}</h1>
            <p className="mt-2 text-sm text-body">
              Customer: {sale.customer.name} | Invoice date: {formatDate(sale.invoiceDate)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/sales">
              <Button type="button" variant="outline">
                Back to sales
              </Button>
            </Link>
            <Link to={`/sales/${sale.id}/invoice`}>
              <Button type="button" variant="ghost">
                <ReceiptText className="h-4 w-4" />
                Invoice Preview
              </Button>
            </Link>
            {hasPermission(PERMISSIONS.canEditSales) ? (
              <Link to={`/sales/${sale.id}/edit`}>
                <Button type="button" variant="ghost">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            ) : null}
            {hasPermission(PERMISSIONS.canDeleteSales) ? (
              <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="panel p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Invoice Snapshot</h2>
                <p className="section-copy mt-2">
                  Sales totals and status are calculated on the backend.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={getPaymentBadgeVariant(sale.paymentType)}>{sale.paymentType}</Badge>
                <Badge variant={getInvoiceStatusBadgeVariant(sale.invoiceStatus)}>
                  {sale.invoiceStatus}
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailCard label="Invoice Number" value={sale.invoiceNumber} />
              <DetailCard label="Invoice Date" value={formatDate(sale.invoiceDate)} />
              <DetailCard label="Customer" value={sale.customer.name} />
              <DetailCard label="Product" value={sale.product.name} />
              <DetailCard label="Quantity" value={String(sale.quantity)} />
              <DetailCard label="Selling Price" value={formatCurrency(sale.sellingPrice)} />
              <DetailCard label="Payment Type" value={sale.paymentType} />
              <DetailCard label="Invoice Status" value={sale.invoiceStatus} />
              <DetailCard label="Total Amount" value={formatCurrency(sale.totalAmount)} />
              <DetailCard label="Paid Amount" value={formatCurrency(sale.paidAmount)} />
              <DetailCard
                label="Outstanding Amount"
                value={formatCurrency(sale.outstandingAmount)}
              />
              <DetailCard
                label="Customer Outstanding"
                value={formatCurrency(sale.customer.outstandingReceivable)}
              />
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="section-title">Notes</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-body">
              {sale.notes || 'No notes were added to this sale.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-primary-tint p-3 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="section-title">Invoice Preview</h2>
                <p className="section-copy mt-1">
                  Open the dedicated invoice preview for a printable summary.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-background p-4">
              <p className="text-sm text-body">
                The invoice preview shows the invoice number, customer details, line item, totals,
                and outstanding amount in a simplified invoice layout.
              </p>
              <Link to={`/sales/${sale.id}/invoice`} className="mt-4 inline-flex">
                <Button type="button" variant="outline">
                  <ReceiptText className="h-4 w-4" />
                  Open Invoice Preview
                </Button>
              </Link>
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="section-title">Current Product Stock</h2>
            <p className="section-copy mt-2">
              This reflects the product stock after the sale impact has been applied.
            </p>
            <p className="mt-4 text-3xl font-bold text-heading">
              {sale.product.currentStock ?? 'Not available'}
            </p>
          </div>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        title="Delete sale"
        description="This action restores stock and removes the linked customer receivable entry."
        onClose={() => !deleteLoading && setDeleteOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Delete invoice {sale.invoiceNumber} for {sale.customer.name}?
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={deleteLoading} onClick={handleDelete}>
              Delete Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SaleDetailsPage;
