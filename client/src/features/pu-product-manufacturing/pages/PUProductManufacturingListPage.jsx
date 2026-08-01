import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Factory, FilePenLine, Plus, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Table from '@/components/ui/Table';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';
import { formatStockNumber } from '@/features/production/components/FinishedStockPage';
import {
  deletePUProductManufacturing,
  fetchPUProductManufacturing,
} from '@/features/pu-product-manufacturing/services/puProductManufacturingService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function PUProductManufacturingListPage() {
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
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    async function loadManufacturing() {
      setLoading(true);

      try {
        const data = await fetchPUProductManufacturing({
          page: Number(searchParams.get('page') || 1),
          search: searchParams.get('search') || undefined,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load PU product manufacturing', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadManufacturing();

    return () => {
      ignore = true;
    };
  }, [searchParams, toast]);

  const handleDelete = useCallback(async (batch) => {
    const confirmed = window.confirm(
      `Delete manufacturing batch ${batch.batchId}? This will restore PU chemical and MOCA stock and remove related product stock.`,
    );

    if (!confirmed) return;

    setDeletingId(batch.id);

    try {
      await deletePUProductManufacturing(batch.id);
      toast.success('Manufacturing deleted', 'PU chemical stock, MOCA stock, and product stock were reconciled.');

      const data = await fetchPUProductManufacturing({
        page: Number(searchParams.get('page') || 1),
        search: searchParams.get('search') || undefined,
      });
      setState(data);
    } catch (error) {
      toast.error('Unable to delete manufacturing', getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }, [searchParams, toast]);

  const columns = useMemo(
    () => [
      {
        key: 'batchId',
        title: 'Batch Number',
        render: (value, row) => (
          <Link className="font-semibold text-primary" to={`/pu-product-manufacturing/${row.id}`}>
            {value}
          </Link>
        ),
      },
      {
        key: 'productName',
        title: 'Product Name',
      },
      {
        key: 'itemNumber',
        title: 'Item Number',
        render: (value) => <span className="font-semibold text-heading">{value}</span>,
      },
      {
        key: 'puChemicalItem',
        title: 'PU Chemical',
      },
      {
        key: 'mocaItem',
        title: 'MOCA',
      },
      {
        key: 'quantity',
        title: 'Quantity',
        render: (value) => formatStockNumber(value),
      },
      {
        key: 'sellingUnit',
        title: 'Selling Unit',
        render: (value) => <Badge variant="neutral">{value}</Badge>,
      },
      {
        key: 'dateTime',
        title: 'Date',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Button as={Link} to={`/pu-product-manufacturing/${row.id}`} size="sm" variant="primary">
              <Eye className="h-4 w-4" />
            </Button>
            <Button as={Link} to={`/pu-product-manufacturing/${row.id}/edit`} size="sm" variant="warning">
              <FilePenLine className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={deletingId === row.id}
              onClick={() => handleDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [deletingId, handleDelete],
  );

  function applySearch(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    if (search.trim()) nextParams.set('search', search.trim());
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 5</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">PU Product Manufacturing</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Review PU product manufacturing batches and finished product output.
            </p>
          </div>
          <Button as={Link} to="/pu-product-manufacturing/new">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={applySearch}>
          <SearchBox
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search batch, product, chemical, MOCA, size, colour"
          />
          <Button type="submit">Search</Button>
          <Button type="button" variant="outline" onClick={() => setSearchParams({ page: '1' })}>
            Reset
          </Button>
        </form>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Manufacturing Batches</h2>
            <p className="section-copy mt-2">
              {state.pagination.totalItems} PU product manufacturing batch
              {state.pagination.totalItems === 1 ? '' : 'es'} found.
            </p>
          </div>
          <Badge variant="neutral">Page {state.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-border bg-background p-8 text-center text-sm text-body">
              Loading PU product manufacturing...
            </div>
          ) : state.items.length ? (
            <Table columns={columns} data={state.items} />
          ) : (
            <EmptyState
              title="No PU product manufacturing found"
              description="PU product manufacturing batches appear here after manufacturing is completed."
              icon={Factory}
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

export default PUProductManufacturingListPage;
