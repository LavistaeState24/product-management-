import { useEffect, useMemo, useState } from 'react';
import { FilePenLine, Factory } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import LoadingPage from '@/components/LoadingPage';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Table from '@/components/ui/Table';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';
import { formatStockNumber } from '@/features/production/components/FinishedStockPage';
import { fetchSheetProduction } from '@/features/sheet-productions/services/sheetProductionService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function SheetProductionDetailsPage() {
  const { productionId } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadBatch() {
      setLoading(true);

      try {
        const data = await fetchSheetProduction(productionId);
        if (!ignore) {
          setBatch(data.batch);
        }
      } catch (error) {
        if (!ignore) {
          setNotFound(true);
          toast.error('Unable to load sheet production', getApiErrorMessage(error));
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
  }, [productionId, toast]);

  const columns = useMemo(
    () => [
      {
        key: 'itemNumber',
        title: 'Item Number',
        render: (value) => <span className="font-semibold text-heading">{value}</span>,
      },
      {
        key: 'itemName',
        title: 'Item Name',
      },
      {
        key: 'size',
        title: 'Size',
        render: (value) => <Badge variant="neutral">{value}</Badge>,
      },
      {
        key: 'colour',
        title: 'Colour',
      },
      {
        key: 'weight',
        title: 'Weight (Kg)',
        render: (value) => formatStockNumber(value),
      },
      {
        key: 'quantity',
        title: 'Quantity',
        render: (value) => formatStockNumber(value),
      },
    ],
    [],
  );

  if (loading) {
    return <LoadingPage />;
  }

  if (notFound || !batch) {
    return (
      <EmptyState
        title="Sheet production not found"
        description="The selected sheet production batch could not be loaded."
        icon={Factory}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 2</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{batch.batchId}</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Sheet production batch created on {formatDateTime(batch.dateTime)}.
            </p>
          </div>
          <Button as={Link} to={`/sheet-productions/${batch.id}/edit`} variant="warning">
            <FilePenLine className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Raw Material Consumption</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
              Raw Material
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">{batch.rawMaterialItem}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
              Quantity Used
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">
              {formatStockNumber(batch.quantityUsed)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
              Production Date
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">
              {formatDateTime(batch.dateTime)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">Remarks</p>
            <p className="mt-2 text-sm font-semibold text-heading">
              {batch.remarks || 'Not available'}
            </p>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Produced Sheets</h2>
            <p className="section-copy mt-2">{batch.sheets?.length || 0} sheet rows recorded.</p>
          </div>
          <Badge variant="neutral">{batch.batchNumber}</Badge>
        </div>

        <div className="mt-6">
          <Table columns={columns} data={batch.sheets || []} />
        </div>
      </section>
    </div>
  );
}

export default SheetProductionDetailsPage;
