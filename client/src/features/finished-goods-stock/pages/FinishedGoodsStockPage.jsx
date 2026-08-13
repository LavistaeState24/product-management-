import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, PackageSearch, Warehouse } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import SearchBox from '@/components/ui/SearchBox';
import Select from '@/components/ui/Select';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';
import { formatStockNumber } from '@/features/production/components/FinishedStockPage';
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

const sortByOptions = [
  { value: 'quantity', label: 'Quantity' },
  { value: 'productionDate', label: 'Production Date' },
];

const sortOrderOptions = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
];

function getSelectedType(searchParams) {
  return searchParams.get('type') || 'rod';
}

function buildParams(searchParams) {
  return {
    page: Number(searchParams.get('page') || 1),
    limit: Number(searchParams.get('limit') || 15),
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'productionDate',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    type: getSelectedType(searchParams),
  };
}

function normalizeResponse(payload) {
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    summary: payload?.summary || { totalItems: 0, byType: {} },
    pagination: payload?.pagination || {
      page: 1,
      limit: 15,
      totalItems: 0,
      totalPages: 1,
    },
  };
}

function renderOptionalValue(value) {
  return value == null ? '—' : value;
}

function formatOptionalDateTime(value) {
  return value == null ? '—' : formatDateTime(value);
}

function FinishedGoodsStockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => buildParams(searchParams));
  const [state, setState] = useState({
    data: [],
    summary: { totalItems: 0, byType: {} },
    pagination: {
      page: 1,
      limit: 15,
      totalItems: 0,
      totalPages: 1,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const toast = useToast();

  useEffect(() => {
    setFilters(buildParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadFinishedGoodsStock() {
      setLoading(true);
      setError(null);
      setState((current) => ({
        ...current,
        data: [],
      }));

      try {
        const data = await fetchFinishedGoodsStock({
          page: Number(searchParams.get('page') || 1),
          limit: Number(searchParams.get('limit') || 15),
          search: searchParams.get('search') || undefined,
          sortBy: searchParams.get('sortBy') || 'productionDate',
          sortOrder: searchParams.get('sortOrder') || 'desc',
          type: getSelectedType(searchParams),
        });

        if (!cancelled) {
          setState(normalizeResponse(data));
        }
      } catch (error) {
        if (!cancelled) {
          const message = getApiErrorMessage(error);
          setError(message);
          toast.error('Unable to load finished goods stock', message);
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
  }, [searchParams, toast, reloadKey]);

  const columns = useMemo(
    () => [
      {
        key: 'itemNumber',
        title: 'Item Number',
        render: (row) => renderOptionalValue(row.itemNumber),
      },
      {
        key: 'productName',
        title: 'Product Name',
        render: (row) => <span className="font-semibold">{renderOptionalValue(row.productName)}</span>,
      },
      {
        key: 'size',
        title: 'Size',
        render: (row) => renderOptionalValue(row.size),
      },
      {
        key: 'colour',
        title: 'Colour',
        render: (row) => renderOptionalValue(row.colour),
      },
      {
        key: 'weight',
        title: 'Weight',
        render: (row) => (
          <div>
            <p className="font-semibold text-heading">
              {typeof row.weight === 'number'
                ? formatStockNumber(row.weight)
                : renderOptionalValue(row.weight)}
            </p>
            {row.sellingUnit ? <p className="mt-1 text-xs text-body">{row.sellingUnit}</p> : null}
          </div>
        ),
      },
      {
        key: 'quantity',
        title: 'Quantity',
        render: (row) => formatStockNumber(row.quantity),
      },
      {
        key: 'sellingUnit',
        title: 'Selling Unit',
        render: (row) => renderOptionalValue(row.sellingUnit),
      },
      {
        key: 'productionDate',
        title: 'Production Date',
        render: (row) => formatOptionalDateTime(row.productionDate),
      },
    ],
    [],
  );

  function applyFilters(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    if (filters.search.trim()) nextParams.set('search', filters.search.trim());
    if (filters.type) nextParams.set('type', filters.type);
    if (filters.sortBy) nextParams.set('sortBy', filters.sortBy);
    if (filters.sortOrder) nextParams.set('sortOrder', filters.sortOrder);
    nextParams.set('limit', String(filters.limit || 15));
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }

  function updateSort(field, value) {
    const nextFilters = {
      ...filters,
      [field]: value,
      page: 1,
    };
    const nextParams = new URLSearchParams();

    if (nextFilters.search.trim()) nextParams.set('search', nextFilters.search.trim());
    if (nextFilters.type) nextParams.set('type', nextFilters.type);
    if (nextFilters.sortBy) nextParams.set('sortBy', nextFilters.sortBy);
    if (nextFilters.sortOrder) nextParams.set('sortOrder', nextFilters.sortOrder);
    nextParams.set('limit', String(nextFilters.limit || 15));
    nextParams.set('page', '1');

    setFilters(nextFilters);
    setSearchParams(nextParams);
  }

  function selectType(type) {
    setFilters({
      search: '',
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: filters.limit,
      type,
      page: 1,
    });
    setState((current) => ({
      ...current,
      data: [],
    }));
    setSearchParams({
      type,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: String(filters.limit || 15),
      page: '1',
    });
  }

  function resetFilters() {
    setSearchParams({
      type: filters.type,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: String(filters.limit || 15),
      page: '1',
    });
  }

  function handleRowsPerPageChange(limit) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('limit', String(limit));
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }

  function retryLoad() {
    setReloadKey((current) => current + 1);
  }

  const selectedType = getSelectedType(searchParams);
  const hasFilters = Boolean(searchParams.get('search'));
  const totalItems = state.pagination.totalItems || 0;
  const summaryCards = [
    { label: 'Total Rod Stock', value: state.summary?.totalRodStock || 0 },
    { label: 'Total Sheet Stock', value: state.summary?.totalSheetStock || 0 },
    { label: 'Total Rod Product Stock', value: state.summary?.totalRodProductStock || 0 },
    { label: 'Total Sheet Product Stock', value: state.summary?.totalSheetProductStock || 0 },
    { label: 'Total PU Product Stock', value: state.summary?.totalPUProductStock || 0 },
    { label: 'Low Stock', value: state.summary?.lowStock || 0 },
    { label: 'Out Of Stock', value: state.summary?.outOfStock || 0 },
  ];

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 6</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Finished Goods Stock</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Centralized view of existing finished rod, sheet, and PU product stock records.
            </p>
          </div>
          <Warehouse className="h-10 w-10 text-primary" />
        </div>

        <form
          className="mt-6 grid gap-4 rounded-3xl border border-border bg-background p-4 lg:grid-cols-[1fr_minmax(150px,190px)_minmax(150px,190px)_auto_auto]"
          onSubmit={applyFilters}
        >
          <SearchBox
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Search item number, product name, size, colour, weight"
          />
          <Select
            value={filters.sortBy}
            onChange={(event) => updateSort('sortBy', event.target.value || 'productionDate')}
            options={sortByOptions}
            placeholder="Sort field"
          />
          <Select
            value={filters.sortOrder}
            onChange={(event) => updateSort('sortOrder', event.target.value || 'desc')}
            options={sortOrderOptions}
            placeholder="Sort order"
          />
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </form>
      </section>

      <section className="panel p-4">
        <div className="flex flex-wrap gap-3">
          {typeOptions.map((type) => {
            const selected = selectedType === type.value;

            return (
              <button
                key={type.value}
                type="button"
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? 'bg-primary text-white shadow-panel'
                    : 'bg-background text-body hover:text-heading'
                }`}
                onClick={() => selectType(type.value)}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-body">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-bold text-heading">
              {formatStockNumber(card.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">
              {typeLabels[selectedType]}
            </h2>
            <p className="section-copy mt-2">
              {formatStockNumber(totalItems)} stock item{totalItems === 1 ? '' : 's'} found.
            </p>
          </div>
          <Badge variant="info">Page {state.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          {error ? (
            <EmptyState
              title="Unable to load finished goods stock"
              description={error}
              actionLabel="Retry"
              onAction={retryLoad}
              icon={AlertCircle}
            />
          ) : (
            <DataTable
              columns={columns}
              data={state.data}
              loading={loading}
              loadingContent="Loading finished goods stock..."
              pagination={state.pagination}
              onPageChange={(page) => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('page', String(page));
                setSearchParams(nextParams);
              }}
              onRowsPerPageChange={handleRowsPerPageChange}
              emptyContent={
                <EmptyState
                  title="No finished stock records found for this category."
                  description={
                    hasFilters
                      ? 'Try a broader search or clear the active filters.'
                      : `${typeLabels[selectedType]} records appear here when backend stock exists for this category.`
                  }
                  actionLabel={hasFilters ? 'Reset Filters' : undefined}
                  onAction={hasFilters ? resetFilters : undefined}
                  icon={PackageSearch}
                />
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default FinishedGoodsStockPage;
