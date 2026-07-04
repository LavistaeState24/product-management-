import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileUp, Pencil, ReceiptText, Trash2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PurchasePageSkeleton from '@/features/purchases/components/PurchasePageSkeleton';
import {
  deletePurchase,
  fetchPurchaseById,
} from '@/features/purchases/services/purchaseService';
import {
  formatCurrency,
  formatDate,
  formatGstTypeLabel,
  getPaymentBadgeVariant,
  resolveAssetUrl,
} from '@/features/purchases/utils/purchaseHelpers';
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

function PurchaseDetailsPage() {
  const { purchaseId } = useParams();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    let ignore = false;

    async function loadPurchase() {
      try {
        const data = await fetchPurchaseById(purchaseId);

        if (!ignore) {
          setPurchase({
            ...data.purchase,
            bill: data.purchase.bill
              ? {
                  ...data.purchase.bill,
                  url: resolveAssetUrl(data.purchase.bill.url),
                }
              : null,
          });
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load purchase', getApiErrorMessage(error));
          navigate('/purchases');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPurchase();

    return () => {
      ignore = true;
    };
  }, [navigate, purchaseId, toast]);

  async function handleDelete() {
    setDeleteLoading(true);

    try {
      await deletePurchase(purchaseId);
      toast.success('Purchase deleted', 'The purchase was removed and stock was reconciled.');
      navigate('/purchases');
    } catch (error) {
      toast.error('Unable to delete purchase', getApiErrorMessage(error));
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading || !purchase) {
    return <PurchasePageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Purchase Details</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{purchase.product.name}</h1>
            <p className="mt-2 text-sm text-body">
              Supplier: {purchase.supplier.name} | Recorded on {formatDate(purchase.purchaseDate)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/purchases">
              <Button type="button" variant="outline">
                Back to purchases
              </Button>
            </Link>
            {hasPermission(PERMISSIONS.canEditPurchase) ? (
              <Link to={`/purchases/${purchase.id}/edit`}>
                <Button type="button" variant="ghost">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            ) : null}
            {hasPermission(PERMISSIONS.canDeletePurchase) ? (
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="section-title">Transaction Snapshot</h2>
                <p className="section-copy mt-2">
                  Financial values are calculated on the backend.
                </p>
              </div>
              <Badge variant={getPaymentBadgeVariant(purchase.paymentType, purchase.dueAmount)}>
                {purchase.paymentType}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailCard label="Supplier" value={purchase.supplier.name} />
              <DetailCard label="Product" value={purchase.product.name} />
              <DetailCard label="Purchase Date" value={formatDate(purchase.purchaseDate)} />
              <DetailCard label="Quantity" value={String(purchase.quantity)} />
              <DetailCard label="Purchase Price" value={formatCurrency(purchase.purchasePrice)} />
              <DetailCard label="Basic Amount" value={formatCurrency(purchase.basicAmount)} />
              <DetailCard label="GST Type" value={formatGstTypeLabel(purchase.gstType)} />
              <DetailCard label="GST Rate" value={`${purchase.gstRate}%`} />
              <DetailCard label="GST Amount" value={formatCurrency(purchase.gstAmount)} />
              <DetailCard label="CGST Amount" value={formatCurrency(purchase.cgstAmount)} />
              <DetailCard label="SGST Amount" value={formatCurrency(purchase.sgstAmount)} />
              <DetailCard label="IGST Amount" value={formatCurrency(purchase.igstAmount)} />
              <DetailCard label="Total Amount" value={formatCurrency(purchase.totalAmount)} />
              <DetailCard label="Paid Amount" value={formatCurrency(purchase.paidAmount)} />
              <DetailCard label="Due Amount" value={formatCurrency(purchase.dueAmount)} />
              <DetailCard
                label="Credit Due Date"
                value={purchase.creditDueDate ? formatDate(purchase.creditDueDate) : 'Not applicable'}
              />
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="section-title">Notes</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-body">
              {purchase.notes || 'No notes were added to this purchase.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-primary-tint p-3 text-primary">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="section-title">Bill Upload</h2>
                <p className="section-copy mt-1">
                  Open the uploaded bill or verify that none was attached.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-background p-4">
              {purchase.bill?.url ? (
                <>
                  <p className="text-sm font-semibold text-heading">{purchase.bill.originalName}</p>
                  <p className="mt-2 text-xs text-body">
                    {(purchase.bill.size / 1024).toFixed(1)} KB | {purchase.bill.mimeType}
                  </p>
                  <a
                    href={purchase.bill.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    <FileUp className="h-4 w-4" />
                    Open Bill
                  </a>
                </>
              ) : (
                <p className="text-sm text-body">No bill was uploaded for this purchase.</p>
              )}
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="section-title">Current Product Stock</h2>
            <p className="section-copy mt-2">
              This reflects the product stock after the purchase impact has been applied.
            </p>
            <p className="mt-4 text-3xl font-bold text-heading">
              {purchase.product.currentStock ?? 'Not available'}
            </p>
          </div>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        title="Delete purchase"
        description="This action reverses stock and removes the linked supplier payable entry."
        onClose={() => !deleteLoading && setDeleteOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Delete the purchase for {purchase.product.name} from {purchase.supplier.name}?
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
              Delete Purchase
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PurchaseDetailsPage;
