import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
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
          setSale(data.sale);
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

  if (loading || !sale) {
    return <SalesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Invoice Preview</p>
          <h1 className="mt-2 text-3xl font-bold text-heading">{sale.invoiceNumber}</h1>
          <p className="mt-2 text-sm text-body">
            Printable invoice summary for {sale.customer.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to={`/sales/${sale.id}`}>
            <Button type="button" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to details
            </Button>
          </Link>
          {hasPermission(PERMISSIONS.canEditSales) ? (
            <Link to={`/sales/${sale.id}/edit`}>
              <Button type="button" variant="ghost">
                <Pencil className="h-4 w-4" />
                Edit Sale
              </Button>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="panel p-6 lg:p-8">
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-body">Operations CRM</p>
            <h2 className="mt-2 text-2xl font-bold text-heading">Sales Invoice</h2>
            <p className="mt-2 text-sm text-body">Invoice No: {sale.invoiceNumber}</p>
            <p className="mt-1 text-sm text-body">Invoice Date: {formatDate(sale.invoiceDate)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={getPaymentBadgeVariant(sale.paymentType)}>{sale.paymentType}</Badge>
            <Badge variant={getInvoiceStatusBadgeVariant(sale.invoiceStatus)}>
              {sale.invoiceStatus}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-background p-5">
            <p className="text-sm font-semibold text-heading">Bill To</p>
            <p className="mt-3 text-base font-semibold text-heading">{sale.customer.name}</p>
            <p className="mt-2 text-sm text-body">
              Outstanding balance across customer account:{' '}
              {formatCurrency(sale.customer.outstandingReceivable)}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-background p-5">
            <p className="text-sm font-semibold text-heading">Invoice Summary</p>
            <div className="mt-3 space-y-2 text-sm text-body">
              <div className="flex items-center justify-between gap-4">
                <span>Payment Type</span>
                <span className="font-semibold text-heading">{sale.paymentType}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Invoice Status</span>
                <span className="font-semibold text-heading">{sale.invoiceStatus}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Current Product Stock</span>
                <span className="font-semibold text-heading">
                  {sale.product.currentStock ?? 'Not available'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-border">
          <table className="w-full border-collapse">
            <thead className="bg-background">
              <tr className="text-left text-sm text-body">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Selling Price</th>
                <th className="px-4 py-3 font-semibold">Line Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border text-sm text-heading">
                <td className="px-4 py-4 font-semibold">{sale.product.name}</td>
                <td className="px-4 py-4">{sale.quantity}</td>
                <td className="px-4 py-4">{formatCurrency(sale.sellingPrice)}</td>
                <td className="px-4 py-4">{formatCurrency(sale.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-border bg-background p-5">
            <p className="text-sm font-semibold text-heading">Notes</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-body">
              {sale.notes || 'No notes were added to this invoice.'}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-background p-5">
            <div className="space-y-3 text-sm text-body">
              <div className="flex items-center justify-between gap-4">
                <span>Total Amount</span>
                <span className="font-semibold text-heading">{formatCurrency(sale.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Paid Amount</span>
                <span className="font-semibold text-heading">{formatCurrency(sale.paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <span>Outstanding Amount</span>
                <span className="text-lg font-bold text-heading">
                  {formatCurrency(sale.outstandingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SaleInvoicePreviewPage;
