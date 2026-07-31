import { useEffect, useState } from 'react';
import { Factory, FilePenLine, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingPage from '@/components/LoadingPage';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';
import { formatStockNumber } from '@/features/production/components/FinishedStockPage';
import {
  deletePUProductManufacturing,
  fetchPUProductManufacturingBatch,
} from '@/features/pu-product-manufacturing/services/puProductManufacturingService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">{label}</p>
      <p className="mt-2 text-sm font-semibold text-heading">{value || 'Not available'}</p>
    </div>
  );
}

function PUProductManufacturingDetailsPage() {
  const { manufacturingId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadBatch() {
      setLoading(true);

      try {
        const data = await fetchPUProductManufacturingBatch(manufacturingId);
        if (!ignore) {
          setBatch(data.batch);
        }
      } catch (error) {
        if (!ignore) {
          setNotFound(true);
          toast.error('Unable to load PU product manufacturing', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadBatch();

    return () => {
      ignore = true;
    };
  }, [manufacturingId, toast]);

  if (loading) {
    return <LoadingPage />;
  }

  if (notFound || !batch) {
    return (
      <EmptyState
        title="PU product manufacturing not found"
        description="The selected manufacturing batch could not be loaded."
        icon={Factory}
      />
    );
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete manufacturing batch ${batch.batchId}? This will restore PU chemical and MOCA stock and remove related product stock.`,
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      await deletePUProductManufacturing(manufacturingId);
      toast.success('Manufacturing deleted', 'PU chemical stock, MOCA stock, and product stock were reconciled.');
      navigate('/pu-product-manufacturing');
    } catch (error) {
      toast.error('Unable to delete manufacturing', getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 5</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{batch.batchId}</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              PU product manufacturing batch created on {formatDateTime(batch.dateTime)}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="neutral">{batch.itemNumber}</Badge>
            <Button as={Link} to={`/pu-product-manufacturing/${manufacturingId}/edit`} variant="warning">
              <FilePenLine className="h-4 w-4" />
            </Button>
            <Button type="button" variant="danger" loading={deleting} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Chemical Consumption</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="PU Chemical" value={batch.puChemicalItem} />
          <DetailItem
            label="Chemical Quantity"
            value={`${formatStockNumber(batch.chemicalQuantityKg)} Kg`}
          />
          <DetailItem label="MOCA" value={batch.mocaItem} />
          <DetailItem label="MOCA Quantity" value={`${formatStockNumber(batch.mocaQuantityKg)} Kg`} />
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Finished Product</h2>
            <p className="section-copy mt-2">{batch.productName}</p>
          </div>
          <Badge variant="neutral">{batch.sellingUnit}</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Product Name" value={batch.productName} />
          <DetailItem label="Item Number" value={batch.itemNumber} />
          <DetailItem label="Size" value={batch.size} />
          <DetailItem label="Colour" value={batch.colour} />
          <DetailItem label="Quantity" value={formatStockNumber(batch.quantity)} />
          <DetailItem label="Selling Unit" value={batch.sellingUnit} />
          <DetailItem label="Production Date" value={formatDateTime(batch.dateTime)} />
          <DetailItem label="Remarks" value={batch.remarks} />
        </div>
      </section>
    </div>
  );
}

export default PUProductManufacturingDetailsPage;
