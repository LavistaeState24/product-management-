import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

export function formatStockNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function resolveBatchId(value) {
  if (!value) return 'Not available';
  if (typeof value === 'string') return value;
  return value.batchId || value.batchNumber || value._id || 'Not available';
}

function buildInitialFilters(searchParams) {
  return {
    search: searchParams.get('search') || '',
    itemNumber: searchParams.get('itemNumber') || '',
    item: searchParams.get('item') || '',
    size: searchParams.get('size') || '',
    colour: searchParams.get('colour') || '',
    metric: searchParams.get('metric') || searchParams.get('weight') || searchParams.get('sellingUnit') || '',
    sort: searchParams.get('sort') || '',
  };
}

function FinishedStockPage({ config }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({
    items: [],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 1,
    },
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => buildInitialFilters(searchParams));
  const toast = useToast();
  const HeaderIcon = config.headerIcon;
  const EmptyIcon = config.emptyIcon;

  useEffect(() => {
    setFilters(buildInitialFilters(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    async function loadStockItems() {
      setLoading(true);

      try {
        const hasColumnFilters = ['itemNumber', 'item', 'size', 'colour', 'metric', 'weight', 'sellingUnit'].some((key) =>
          searchParams.get(key),
        );
        const data = await config.fetchStock({
          page: hasColumnFilters ? 1 : Number(searchParams.get('page') || 1),
          limit: hasColumnFilters ? 100 : undefined,
          search: searchParams.get('search') || undefined,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(config.loadErrorTitle, getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadStockItems();

    return () => {
      ignore = true;
    };
  }, [config, searchParams, toast]);

  const visibleItems = useMemo(() => {
    const filteredItems = state.items.filter((item) => {
      const itemNumberMatch = item.itemNumber
        .toLowerCase()
        .includes(filters.itemNumber.trim().toLowerCase());
      const itemName = config.getItemName(item);
      const itemMatch = itemName.toLowerCase().includes(filters.item.trim().toLowerCase());
      const sizeMatch = item.size.toLowerCase().includes(filters.size.trim().toLowerCase());
      const colourMatch = item.colour.toLowerCase().includes(filters.colour.trim().toLowerCase());
      const metricMatch = filters.metric.trim()
        ? String(config.getMetricValue(item)).toLowerCase().includes(filters.metric.trim().toLowerCase())
        : true;

      return itemNumberMatch && itemMatch && sizeMatch && colourMatch && metricMatch;
    });

    if (!filters.sort) return filteredItems;

    const [field, direction = 'asc'] = filters.sort.split(':');
    const sortConfig = config.sortOptions?.find((option) => option.value === filters.sort);

    if (!sortConfig) return filteredItems;

    return [...filteredItems].sort((left, right) => {
      const leftValue = sortConfig.getValue ? sortConfig.getValue(left) : left[field];
      const rightValue = sortConfig.getValue ? sortConfig.getValue(right) : right[field];
      const leftComparable =
        leftValue instanceof Date || typeof leftValue === 'number'
          ? Number(leftValue)
          : String(leftValue ?? '').toLowerCase();
      const rightComparable =
        rightValue instanceof Date || typeof rightValue === 'number'
          ? Number(rightValue)
          : String(rightValue ?? '').toLowerCase();

      if (leftComparable < rightComparable) return direction === 'asc' ? -1 : 1;
      if (leftComparable > rightComparable) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [config, filters, state.items]);

  const columns = useMemo(
    () => [
      {
        key: 'itemNumber',
        title: 'Item Number',
        render: (value, row) =>
          config.getItemLink ? (
            <Link className="font-semibold text-primary" to={config.getItemLink(row)}>
              {value}
            </Link>
          ) : (
            <span className="font-semibold text-heading">{value}</span>
          ),
      },
      {
        key: config.itemNameKey,
        title: config.itemColumnTitle,
        render: (value) => value || 'Not available',
      },
      {
        key: 'size',
        title: 'Size',
        render: (value) => <Badge variant="neutral">{value}</Badge>,
      },
      {
        key: 'colour',
        title: 'Colour',
        render: (value) => value || 'Not available',
      },
      {
        key: config.metricKey,
        title: config.metricColumnTitle,
        render: (value) => (config.formatMetric ? config.formatMetric(value) : formatStockNumber(value)),
      },
      {
        key: 'quantity',
        title: 'Quantity',
        render: (value) => formatStockNumber(value),
      },
      {
        key: config.dateKey || 'productionDate',
        title: config.dateColumnTitle || 'Production Date',
        render: (value) => formatDateTime(value),
      },
      {
        key: config.batchKey || 'productionBatchId',
        title: config.batchColumnTitle || 'Production Batch ID',
        render: (value) => resolveBatchId(value),
      },
    ],
    [config],
  );

  function applyFilters(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    if (filters.search.trim()) nextParams.set('search', filters.search.trim());
    if (filters.itemNumber.trim()) nextParams.set('itemNumber', filters.itemNumber.trim());
    if (filters.item.trim()) nextParams.set('item', filters.item.trim());
    if (filters.size.trim()) nextParams.set('size', filters.size.trim());
    if (filters.colour.trim()) nextParams.set('colour', filters.colour.trim());
    if (filters.metric.trim()) {
      nextParams.set(config.metricParam || 'metric', filters.metric.trim());
    }
    if (filters.sort) nextParams.set('sort', filters.sort);

    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }

  function resetFilters() {
    setFilters({
      search: '',
      itemNumber: '',
      item: '',
      size: '',
      colour: '',
      metric: '',
      sort: '',
    });
    setSearchParams({ page: '1' });
  }

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.itemNumber ||
      filters.item ||
      filters.size ||
      filters.colour ||
      filters.metric ||
      filters.sort,
  );

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">
              {config.moduleLabel}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{config.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">{config.description}</p>
          </div>
          <HeaderIcon className="h-10 w-10 text-primary" />
        </div>

        <form
          className="mt-6 grid gap-4 rounded-3xl border border-border bg-background p-4 lg:grid-cols-[1fr_repeat(5,minmax(120px,160px))_auto_auto]"
          onSubmit={applyFilters}
        >
          <SearchBox
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder={config.searchPlaceholder}
          />
          <Input
            value={filters.itemNumber}
            onChange={(event) =>
              setFilters((current) => ({ ...current, itemNumber: event.target.value }))
            }
            placeholder="Item number"
          />
          <Input
            value={filters.item}
            onChange={(event) =>
              setFilters((current) => ({ ...current, item: event.target.value }))
            }
            placeholder={config.itemFilterPlaceholder}
          />
          <Input
            value={filters.size}
            onChange={(event) =>
              setFilters((current) => ({ ...current, size: event.target.value }))
            }
            placeholder="Size"
          />
          <Input
            value={filters.colour}
            onChange={(event) =>
              setFilters((current) => ({ ...current, colour: event.target.value }))
            }
            placeholder="Colour"
          />
          <Input
            value={filters.metric}
            onChange={(event) =>
              setFilters((current) => ({ ...current, metric: event.target.value }))
            }
            placeholder={config.metricFilterPlaceholder}
          />
          {config.sortOptions?.length ? (
            <Select
              value={filters.sort}
              onChange={(event) =>
                setFilters((current) => ({ ...current, sort: event.target.value }))
              }
              options={config.sortOptions}
              placeholder="Sort"
            />
          ) : null}
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </form>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">{config.inventoryTitle}</h2>
            <p className="section-copy mt-2">
              {visibleItems.length} of {state.pagination.totalItems} {config.itemCountLabel}
              {state.pagination.totalItems === 1 ? '' : 's'} found.
            </p>
          </div>
          <Badge variant="neutral">Page {state.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-border bg-background p-8 text-center text-sm text-body">
              {config.loadingText}
            </div>
          ) : visibleItems.length ? (
            <Table columns={columns} data={visibleItems} />
          ) : (
            <EmptyState
              title={hasActiveFilters ? config.emptyFilteredTitle : config.emptyTitle}
              description={
                hasActiveFilters ? config.emptyFilteredDescription : config.emptyDescription
              }
              actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
              icon={EmptyIcon}
            />
          )}
        </div>

        {!loading && state.items.length && state.pagination.totalPages > 1 ? (
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

export default FinishedStockPage;
