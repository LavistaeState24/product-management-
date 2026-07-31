import { useEffect, useMemo, useState } from 'react';
import { Eye, FilePenLine, Factory, Plus, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Table from '@/components/ui/Table';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';
import {
  deleteSheetProduction,
  fetchSheetProductions,
} from '@/features/sheet-productions/services/sheetProductionService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function formatQuantity(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function SheetProductionListPage() {
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

    async function loadProductions() {
      setLoading(true);

      try {
        const data = await fetchSheetProductions({
          page: Number(searchParams.get('page') || 1),
          search: searchParams.get('search') || undefined,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load sheet production', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProductions();

    return () => {
      ignore = true;
    };
  }, [searchParams, toast]);

  async function handleDelete(batch) {
    const confirmed = window.confirm(`Delete sheet production batch ${batch.batchId}?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(batch.id);

    try {
      await deleteSheetProduction(batch.id);
      toast.success('Production deleted', 'Raw material and sheet stock were reconciled.');
      const data = await fetchSheetProductions({
        page: Number(searchParams.get('page') || 1),
        search: searchParams.get('search') || undefined,
      });
      setState(data);
    } catch (error) {
      toast.error('Unable to delete sheet production', getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'batchId',
        title: 'Batch Number',
        render: (value, row) => (
          <Link className="font-semibold text-primary" to={`/sheet-productions/${row.id}`}>
            {value}
          </Link>
        ),
      },
      {
        key: 'rawMaterialItem',
        title: 'Raw Material',
      },
      {
        key: 'quantityUsed',
        title: 'Quantity Used',
        render: (value) => formatQuantity(value),
      },
      {
        key: 'sheets',
        title: 'Sheets',
        render: (value) => <Badge variant="neutral">{value?.length || 0}</Badge>,
      },
      {
        key: 'dateTime',
        title: 'Production Date',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Button as={Link} to={`/sheet-productions/${row.id}`} size="sm" variant="primary">
              <Eye className="h-4 w-4" />
            </Button>
            <Button as={Link} to={`/sheet-productions/${row.id}/edit`} size="sm" variant="warning">
              <FilePenLine className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              loading={deletingId === row.id}
              onClick={() => handleDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [deletingId],
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
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 2</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Sheet Production</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Review, edit, and reconcile sheet production batches.
            </p>
          </div>
          <Button as={Link} to="/sheet-productions/new">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={applySearch}>
          <SearchBox
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search batch, raw material, item number, item name, size, colour"
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
            <h2 className="section-title">Production Batches</h2>
            <p className="section-copy mt-2">
              {state.pagination.totalItems} sheet production batch
              {state.pagination.totalItems === 1 ? '' : 'es'} found.
            </p>
          </div>
          <Badge variant="neutral">Page {state.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-border bg-background p-8 text-center text-sm text-body">
              Loading sheet production...
            </div>
          ) : state.items.length ? (
            <Table columns={columns} data={state.items} />
          ) : (
            <EmptyState
              title="No sheet production found"
              description="Sheet production batches appear here after production is completed."
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

export default SheetProductionListPage;
