import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, Warehouse } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';
import { fetchFinishedGoodsStock } from '@/features/finished-goods-stock/services/finishedGoodsStockService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

const typeOptions = [
  { value: 'rod', label: 'Rod Stock' },
  { value: 'sheet', label: 'Sheet Stock' },
  { value: 'rod-product', label: 'Rod-based Product Stock' },
  { value: 'sheet-product', label: 'Sheet-based Product Stock' },
  { value: 'pu-product', label: 'PU Product Stock' },
];

const typeLabels = {
  rod: 'Rod Stock',
  sheet: 'Sheet Stock',
  'rod-product': 'Rod-based Product Stock',
  'sheet-product': 'Sheet-based Product Stock',
  'pu-product': 'PU Product Stock',
};

function formatStockNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function resolveBatchLabel(batch) {
  if (!batch) return 'Not available';
  return batch.batchId || batch.batchNumber || batch.id || 'Not available';
}

function buildParams(searchParams) {
  return {
    page: Number(searchParams.get('page') || 1),
    search: searchParams.get('search') || '',
    type: searchParams.get('type') || '',
  };
}

function FinishedGoodsStockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => buildParams(searchParams));
  const [state, setState] = useState({
    data: [],
    summary: { totalItems: 0, byType: {} },
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 1,
    },
  });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setFilters(buildParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadFinishedGoodsStock() {
      setLoading(true);

      try {
        const data = await fetchFinishedGoodsStock({
          page: Number(searchParams.get('page') || 1),
          search: searchParams.get('search') || undefined,
          type: searchParams.get('type') || undefined,
        });

        if (!cancelled) {
          setState(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error('Unable to load finished goods stock', getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFinishedGoodsStock();

    return () => {
      cancelled = true;
    };
  }, [searchParams, toast]);

  const columns = useMemo(
    () => [
      {
        key: 'stockType',
        title: 'Stock Type',
        render: (value) => <Badge variant="neutral">{value}</Badge>,
      },
      {
        key: 'itemNumber',
        title: 'Item Number',
        render: (value) => value || 'Not available',
      },
      {
        key: 'productName',
        title: 'Item',
        render: (value) => <span className="font-semibold">{value}</span>,
      },
      {
        key: 'size',
        title: 'Size',
        render: (value) => value || 'Not available',
      },
      {
        key: 'colour',
        title: 'Colour',
        render: (value) => value || 'Not available',
      },
      {
        key: 'weight',
        title: 'Weight',
        render: (value, row) => (
          <div>
            <p className="font-semibold text-heading">
              {typeof value === 'number' ? formatStockNumber(value) : 'Not available'}
            </p>
            {row.sellingUnit ? <p className="mt-1 text-xs text-body">{row.sellingUnit}</p> : null}
          </div>
        ),
      },
      {
        key: 'quantity',
        title: 'Quantity',
        render: (value) => formatStockNumber(value),
      },
      {
        key: 'sellingUnit',
        title: 'Selling Unit',
        render: (value) => value || 'Not available',
      },
      {
        key: 'productionDate',
        title: 'Production Date',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'productionBatch',
        title: 'Production Batch',
        render: (value) => resolveBatchLabel(value),
      },
    ],
    [],
  );

  function applyFilters(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    if (filters.search.trim()) nextParams.set('search', filters.search.trim());
    if (filters.type) nextParams.set('type', filters.type);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }

  function resetFilters() {
    setSearchParams({ page: '1' });
  }

  const hasFilters = Boolean(searchParams.get('search') || searchParams.get('type'));
  const totalItems = state.summary?.totalItems || state.pagination.totalItems || 0;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 6</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Finished Goods Stock</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Centralized view of existing finished rod, sheet, product, and PU product stock records.
            </p>
          </div>
          <Warehouse className="h-10 w-10 text-primary" />
        </div>

        <form
          className="mt-6 grid gap-4 rounded-3xl border border-border bg-background p-4 md:grid-cols-[1fr_220px_auto_auto]"
          onSubmit={applyFilters}
        >
          <SearchBox
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Search item, item number, size, colour, unit"
          />
          <Select
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({ ...current, type: event.target.value }))
            }
            options={typeOptions}
            placeholder="All stock types"
          />
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {typeOptions.map((type) => (
          <div key={type.value} className="panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-body">
              {type.label}
            </p>
            <p className="mt-3 text-2xl font-bold text-heading">
              {formatStockNumber(state.summary?.byType?.[type.value]?.totalItems || 0)}
            </p>
          </div>
        ))}
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">
              {typeLabels[searchParams.get('type')] || 'All Finished Goods'}
            </h2>
            <p className="section-copy mt-2">
              {formatStockNumber(totalItems)} stock item{totalItems === 1 ? '' : 's'} found.
            </p>
          </div>
          <Badge variant="info">Page {state.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-border bg-background p-8 text-center text-sm text-body">
              Loading finished goods stock...
            </div>
          ) : state.data.length ? (
            <Table columns={columns} data={state.data} />
          ) : (
            <EmptyState
              title={hasFilters ? 'No finished goods match these filters' : 'No finished goods stock yet'}
              description={
                hasFilters
                  ? 'Try a broader search or clear the active filters.'
                  : 'Finished goods appear here after production, manufacturing, or product stock records exist.'
              }
              actionLabel={hasFilters ? 'Reset Filters' : undefined}
              onAction={hasFilters ? resetFilters : undefined}
              icon={PackageSearch}
            />
          )}
        </div>

        {!loading && state.pagination.totalPages > 1 ? (
          <div className="mt-6 flex justify-end">
            <Pagination
              page={state.pagination.page}
              totalPages={state.pagination.totalPages}
              onPageChange={(page) => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('page', String(page));
                setSearchParams(nextParams);
              }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default FinishedGoodsStockPage;
