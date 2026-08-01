import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  ExternalLink,
  Pencil,
  ReceiptText,
  Trash2,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PurchasePageSkeleton from '@/features/purchases/components/PurchasePageSkeleton';

import {
  deletePurchase,
  fetchPurchaseById,
  getPurchaseBillUrl,
} from '@/features/purchases/services/purchaseService';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatGstTypeLabel,
  getPaymentBadgeVariant,
} from '@/features/purchases/utils/purchaseHelpers';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { PERMISSIONS } from '@/constants/permissions';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function DetailCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <p className="text-sm text-body">{label}</p>

      <p className="mt-2 text-base font-semibold text-heading">
        {value ?? 'Not available'}
      </p>
    </div>
  );
}

function PurchaseDetailsPage() {
  const { purchaseId } = useParams();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billLoading, setBillLoading] = useState(false);
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
          setPurchase(data.purchase);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(
            'Unable to load purchase',
            getApiErrorMessage(error),
          );

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

  async function handleViewBill() {
    if (billLoading) return;

    setBillLoading(true);

    try {
      const data = await getPurchaseBillUrl(
        purchaseId,
      );

      if (!data?.url) {
        throw new Error(
          'Bill URL was not returned by the server.',
        );
      }

      const billWindow = window.open(
        data.url,
        '_blank',
        'noopener,noreferrer',
      );

      if (!billWindow) {
        toast.error(
          'Unable to open bill',
          'Please allow pop-ups for this website.',
        );
      }
    } catch (error) {
      toast.error(
        'Unable to open bill',
        getApiErrorMessage(error),
      );
    } finally {
      setBillLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);

    try {
      await deletePurchase(purchaseId);

      toast.success(
        'Purchase deleted',
        'The purchase was removed and stock was reconciled.',
      );

      navigate('/purchases');
    } catch (error) {
      toast.error(
        'Unable to delete purchase',
        getApiErrorMessage(error),
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading || !purchase) {
    return <PurchasePageSkeleton />;
  }

  const purchaseType =
    purchase.purchaseType || 'Raw Material';

  const currentStock =
    purchase.purchaseStock?.quantity ??
    purchase.rawMaterialStock?.quantity ??
    'Not available';

  const itemName =
    purchase.itemName ||
    purchase.product?.name ||
    'N/A';

  const supplierName =
    purchase.supplierName ||
    purchase.supplier?.name ||
    'N/A';

  const pricePerUnit =
    purchase.pricePerUnit ??
    purchase.purchasePrice ??
    0;

  const billSize =
    Number(purchase.bill?.size) || 0;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">
              Purchase Details
            </p>

            <h1 className="mt-2 text-3xl font-bold text-heading">
              {itemName}
            </h1>

            <p className="mt-2 text-sm text-body">
              Supplier: {supplierName} | Recorded on{' '}
              {formatDateTime(
                purchase.recordedAt ||
                  purchase.createdAt,
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/purchases">
              <Button
                type="button"
                variant="outline"
              >
                Back to purchases
              </Button>
            </Link>

            {hasPermission(
              PERMISSIONS.canEditPurchase,
            ) ? (
              <Link
                to={`/purchases/${purchase.id}/edit`}
              >
                <Button
                  type="button"
                  variant="warning"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}

            {hasPermission(
              PERMISSIONS.canDeletePurchase,
            ) ? (
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  setDeleteOpen(true)
                }
              >
                <Trash2 className="h-4 w-4" />
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
                <h2 className="section-title">
                  Transaction Snapshot
                </h2>

                <p className="section-copy mt-2">
                  Financial values are calculated
                  on the backend.
                </p>
              </div>

              <Badge
                variant={getPaymentBadgeVariant(
                  purchase.paymentType,
                  purchase.dueAmount,
                )}
              >
                {purchase.paymentType ||
                  'Not available'}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailCard
                label="Item Name"
                value={itemName}
              />

              <DetailCard
                label="Purchase Type"
                value={purchaseType}
              />

              <DetailCard
                label="Unit"
                value={
                  purchase.unit ||
                  'Not available'
                }
              />

              <DetailCard
                label="Supplier Name"
                value={supplierName}
              />

              <DetailCard
                label="Address"
                value={
                  purchase.supplierAddress ||
                  'Not available'
                }
              />

              <DetailCard
                label="Location"
                value={
                  purchase.supplierLocation ||
                  'Not available'
                }
              />

              <DetailCard
                label="GST No."
                value={
                  purchase.gstNo ||
                  'Not available'
                }
              />

              <DetailCard
                label="Date & Time"
                value={formatDateTime(
                  purchase.recordedAt ||
                    purchase.createdAt,
                )}
              />

              <DetailCard
                label="Purchase Date"
                value={formatDate(
                  purchase.purchaseDate,
                )}
              />

              <DetailCard
                label="Quantity"
                value={String(
                  purchase.quantity ?? 0,
                )}
              />

              <DetailCard
                label={`Price per ${
                  purchase.unit || 'Unit'
                }`}
                value={formatCurrency(
                  pricePerUnit,
                )}
              />

              <DetailCard
                label="Basic Amount"
                value={formatCurrency(
                  purchase.basicAmount,
                )}
              />

              <DetailCard
                label="GST Type"
                value={formatGstTypeLabel(
                  purchase.gstType,
                )}
              />

              <DetailCard
                label="GST Rate"
                value={`${
                  purchase.gstRate ?? 0
                }%`}
              />

              <DetailCard
                label="GST Amount"
                value={formatCurrency(
                  purchase.gstAmount,
                )}
              />

              <DetailCard
                label="CGST Amount"
                value={formatCurrency(
                  purchase.cgstAmount,
                )}
              />

              <DetailCard
                label="SGST Amount"
                value={formatCurrency(
                  purchase.sgstAmount,
                )}
              />

              <DetailCard
                label="IGST Amount"
                value={formatCurrency(
                  purchase.igstAmount,
                )}
              />

              <DetailCard
                label="Total Amount"
                value={formatCurrency(
                  purchase.totalAmount,
                )}
              />

              <DetailCard
                label="Paid Amount"
                value={formatCurrency(
                  purchase.paidAmount,
                )}
              />

              <DetailCard
                label="Due Amount"
                value={formatCurrency(
                  purchase.dueAmount,
                )}
              />

              <DetailCard
                label="Due Date"
                value={
                  purchase.dueDate
                    ? formatDate(
                        purchase.dueDate,
                      )
                    : 'Not applicable'
                }
              />
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="section-title">
              Remarks
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm text-body">
              {purchase.remarks ||
                purchase.notes ||
                'No remarks were added to this purchase.'}
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
                <h2 className="section-title">
                  Bill Upload
                </h2>

                <p className="section-copy mt-1">
                  Open the uploaded bill or verify
                  that none was attached.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-background p-4">
              {purchase.bill?.storagePath ? (
                <>
                  <p className="break-words text-sm font-semibold text-heading">
                    {purchase.bill.originalName ||
                      purchase.bill.filename ||
                      'Purchase bill'}
                  </p>

                  <p className="mt-2 text-xs text-body">
                    {(billSize / 1024).toFixed(
                      1,
                    )}{' '}
                    KB
                    {purchase.bill.mimeType
                      ? ` • ${purchase.bill.mimeType}`
                      : ''}
                  </p>

                  <p className="mt-3 text-xs text-body">
                    Stored securely in AWS S3.
                  </p>

                  <Button
                    type="button"
                    variant="primary"
                    className="mt-4 gap-2"
                    loading={billLoading}
                    disabled={billLoading}
                    onClick={handleViewBill}
                  >
                    <ExternalLink className="h-4 w-4" />
                     View 
                  </Button>
                </>
              ) : (
                <p className="text-sm text-body">
                  No bill was uploaded for this
                  purchase.
                </p>
              )}
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="section-title">
              Current Stock
            </h2>

            <p className="section-copy mt-2">
              This reflects the latest stock after
              the purchase impact has been applied.
            </p>

            <p className="mt-4 text-3xl font-bold text-heading">
              {currentStock}
            </p>

            <p className="mt-2 text-sm text-body">
              {purchase.unit ||
                'Unit not available'}
            </p>
          </div>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        title="Delete purchase"
        description="This action reverses the purchase stock and removes the linked supplier payable entry."
        onClose={() => {
          if (!deleteLoading) {
            setDeleteOpen(false);
          }
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Delete the purchase for {itemName} from{' '}
            {supplierName}?
          </p>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDeleteOpen(false)
              }
              disabled={deleteLoading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="danger"
              loading={deleteLoading}
              onClick={handleDelete}
            >
              Delete Purchase
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PurchaseDetailsPage;