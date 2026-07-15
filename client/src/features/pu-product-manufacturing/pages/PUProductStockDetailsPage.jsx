import { useEffect, useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { useParams } from 'react-router-dom';
import LoadingPage from '@/components/LoadingPage';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';
import {
  formatStockNumber,
  resolveBatchId,
} from '@/features/production/components/FinishedStockPage';
import { fetchPUProductStockItem } from '@/features/pu-product-manufacturing/services/puProductManufacturingService';
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

function PUProductStockDetailsPage() {
  const { stockId } = useParams();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadStock() {
      setLoading(true);

      try {
        const data = await fetchPUProductStockItem(stockId);
        if (!ignore) {
          setStock(data.stock);
        }
      } catch (error) {
        if (!ignore) {
          setNotFound(true);
          toast.error('Unable to load PU product stock', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadStock();

    return () => {
      ignore = true;
    };
  }, [stockId, toast]);

  if (loading) {
    return <LoadingPage />;
  }

  if (notFound || !stock) {
    return (
      <EmptyState
        title="PU product stock not found"
        description="The selected PU product stock item could not be loaded."
        icon={PackageSearch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 5</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{stock.itemNumber}</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Finished PU product stock created from batch {resolveBatchId(stock.manufacturingBatchId)}.
            </p>
          </div>
          <Badge variant="neutral">{resolveBatchId(stock.manufacturingBatchId)}</Badge>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-title">PU Product Stock Details</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Product Name" value={stock.productName} />
          <DetailItem label="Size" value={stock.size} />
          <DetailItem label="Colour" value={stock.colour} />
          <DetailItem label="Selling Unit" value={stock.sellingUnit} />
          <DetailItem label="Quantity" value={formatStockNumber(stock.quantity)} />
          <DetailItem label="Manufacturing Date" value={formatDateTime(stock.productionDate)} />
          <DetailItem label="Created At" value={formatDateTime(stock.createdAt)} />
          <DetailItem label="Updated At" value={formatDateTime(stock.updatedAt)} />
        </div>
      </section>
    </div>
  );
}

export default PUProductStockDetailsPage;
