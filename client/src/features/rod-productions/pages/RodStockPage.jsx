import { useEffect, useMemo, useState } from 'react';
import { PackageSearch, Warehouse } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Table from '@/components/ui/Table';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { fetchRodStocks } from '@/features/rod-productions/services/rodProductionService';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function resolveBatchId(value) {
  if (!value) return 'Not available';
  if (typeof value === 'string') return value;
  return value.batchId || value.batchNumber || value._id || 'Not available';
}

function RodStockPage() {
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
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    itemNumber: searchParams.get('itemNumber') || '',
    item: searchParams.get('item') || '',
    size: searchParams.get('size') || '',
    colour: searchParams.get('colour') || '',
    weight: searchParams.get('weight') || '',
  });
  const toast = useToast();

  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      itemNumber: searchParams.get('itemNumber') || '',
      item: searchParams.get('item') || '',
      size: searchParams.get('size') || '',
      colour: searchParams.get('colour') || '',
      weight: searchParams.get('weight') || '',
    });
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    async function loadRodStocks() {
      setLoading(true);

      try {
        const hasColumnFilters = [
          'itemNumber',
          'item',
          'size',
          'colour',
          'weight',
        ].some((key) => searchParams.get(key));
        const data = await fetchRodStocks({
          page: hasColumnFilters ? 1 : Number(searchParams.get('page') || 1),
          limit: hasColumnFilters ? 100 : undefined,
          search: searchParams.get('search') || undefined,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load rod stock', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadRodStocks();

    return () => {
      ignore = true;
    };
  }, [searchParams, toast]);

  const visibleItems = useMemo(() => {
    return state.items.filter((item) => {
      const itemNumberMatch = item.itemNumber
        .toLowerCase()
        .includes(filters.itemNumber.trim().toLowerCase());
      const itemMatch = item.item.toLowerCase().includes(filters.item.trim().toLowerCase());
      const sizeMatch = item.size.toLowerCase().includes(filters.size.trim().toLowerCase());
      const colourMatch = item.colour.toLowerCase().includes(filters.colour.trim().toLowerCase());
      const weightMatch = filters.weight.trim()
        ? String(item.weightKg).includes(filters.weight.trim())
        : true;

      return itemNumberMatch && itemMatch && sizeMatch && colourMatch && weightMatch;
    });
  }, [filters.colour, filters.item, filters.itemNumber, filters.size, filters.weight, state.items]);

  const columns = useMemo(
    () => [
      {
        key: 'itemNumber',
        title: 'Item Number',
        render: (value) => <span className="font-semibold text-heading">{value}</span>,
      },
      {
        key: 'item',
        title: 'Item',
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
        key: 'weightKg',
        title: 'Weight (Kg)',
        render: (value) => formatNumber(value),
      },
      {
        key: 'quantity',
        title: 'Quantity',
        render: (value) => formatNumber(value),
      },
      {
        key: 'productionDate',
        title: 'Production Date',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'productionBatchId',
        title: 'Production Batch ID',
        render: (value) => resolveBatchId(value),
      },
    ],
    [],
  );

  function applyFilters(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    if (filters.search.trim()) nextParams.set('search', filters.search.trim());
    if (filters.itemNumber.trim()) nextParams.set('itemNumber', filters.itemNumber.trim());
    if (filters.item.trim()) nextParams.set('item', filters.item.trim());
    if (filters.size.trim()) nextParams.set('size', filters.size.trim());
    if (filters.colour.trim()) nextParams.set('colour', filters.colour.trim());
    if (filters.weight.trim()) nextParams.set('weight', filters.weight.trim());

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
      weight: '',
    });
    setSearchParams({ page: '1' });
  }

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.itemNumber ||
      filters.item ||
      filters.size ||
      filters.colour ||
      filters.weight,
  );

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 2</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Rod Stock</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Track finished rods by item number, dimensions, colour, weight, and production batch.
            </p>
          </div>
          <Warehouse className="h-10 w-10 text-primary" />
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
            placeholder="Search item number, item, size, colour"
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
            placeholder="Item"
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
            value={filters.weight}
            onChange={(event) =>
              setFilters((current) => ({ ...current, weight: event.target.value }))
            }
            placeholder="Weight"
          />
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </form>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Finished Rod Inventory</h2>
            <p className="section-copy mt-2">
              {visibleItems.length} of {state.pagination.totalItems} rod stock item
              {state.pagination.totalItems === 1 ? '' : 's'} found.
            </p>
          </div>
          <Badge variant="neutral">Page {state.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-border bg-background p-8 text-center text-sm text-body">
              Loading rod stock...
            </div>
          ) : visibleItems.length ? (
            <Table columns={columns} data={visibleItems} />
          ) : (
            <EmptyState
              title={hasActiveFilters ? 'No rods match these filters' : 'No rod stock yet'}
              description={
                hasActiveFilters
                  ? 'Try a broader search or clear the active filters.'
                  : 'Finished rods appear here after rod production is completed.'
              }
              actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
              icon={PackageSearch}
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

export default RodStockPage;
