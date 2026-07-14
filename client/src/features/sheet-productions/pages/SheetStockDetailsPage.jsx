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
import { fetchSheetStock } from '@/features/sheet-productions/services/sheetProductionService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function SheetStockDetailsPage() {
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
        const data = await fetchSheetStock(stockId);
        if (!ignore) {
          setStock(data.stock);
        }
      } catch (error) {
        if (!ignore) {
          setNotFound(true);
          toast.error('Unable to load sheet stock', getApiErrorMessage(error));
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
        title="Sheet stock not found"
        description="The selected sheet stock item could not be loaded."
        icon={PackageSearch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 2</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{stock.itemNumber}</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Finished sheet stock created from batch {resolveBatchId(stock.productionBatchId)}.
            </p>
          </div>
          <Badge variant="neutral">{resolveBatchId(stock.productionBatchId)}</Badge>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Sheet Stock Details</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
              Item Name
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">{stock.itemName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">Size</p>
            <p className="mt-2 text-sm font-semibold text-heading">{stock.size}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">Colour</p>
            <p className="mt-2 text-sm font-semibold text-heading">{stock.colour}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
              Weight
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">
              {formatStockNumber(stock.weight)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
              Quantity
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">
              {formatStockNumber(stock.quantity)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
              Production Date
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">
              {formatDateTime(stock.productionDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
              Created At
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">
              {formatDateTime(stock.createdAt)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SheetStockDetailsPage;
