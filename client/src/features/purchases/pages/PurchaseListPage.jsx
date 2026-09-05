import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, PackageSearch, Pencil, Plus, Trash2, Eye } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import SearchBox from '@/components/ui/SearchBox';
import Select from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  deletePurchase,
  fetchPurchases,
} from '@/features/purchases/services/purchaseService';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatGstTypeLabel,
  getPaymentBadgeVariant,
} from '@/features/purchases/utils/purchaseHelpers';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { PERMISSIONS } from '@/constants/permissions';

const paymentTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Credit', label: 'Credit' },
  { value: 'Advance', label: 'Advance' },
];

const purchaseTypeOptions = [
  { value: '', label: 'All Purchase Types' },
  { value: 'Raw Material', label: 'Raw Material' },
  { value: 'PU Chemical', label: 'PU Chemical' },
  { value: 'Mocha Chemical', label: 'Mocha Chemical' },
];

const purchaseTypeDisplayLabels = {
  'PU Chemical': 'PU Chemical',
  'Mocha Chemical': 'Mocha',
};

function PurchaseListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({
    items: [],
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 15,
    },
  });
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    paymentType: searchParams.get('paymentType') || '',
    purchaseType: searchParams.get('purchaseType') || '',
  });
  const { hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      paymentType: searchParams.get('paymentType') || '',
      purchaseType: searchParams.get('purchaseType') || '',
    });
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    async function loadPurchases() {
      setLoading(true);

      try {
        const data = await fetchPurchases({
          page: Number(searchParams.get('page') || 1),
          limit: Number(searchParams.get('limit') || 15),
          search: searchParams.get('search') || undefined,
          paymentType: searchParams.get('paymentType') || undefined,
          purchaseType: searchParams.get('purchaseType') || undefined,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load purchases', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPurchases();

    return () => {
      ignore = true;
    };
  }, [searchParams, toast]);

  const columns = useMemo(
    () => [
      {
        key: 'supplier',
        title: 'Supplier',
        render: (row) => (
          <div>
            <p className="font-semibold text-heading">{row.supplierName || row.supplier?.name}</p>
            <p className="text-xs text-body">{row.supplierAddress || 'Address not available'}</p>
            <p className="text-xs text-body">
              {row.supplierLocation || 'Location not available'} | GST {row.gstNo || 'N/A'}
            </p>
          </div>
        ),
      },
      {
        key: 'purchaseType',
        title: 'Type',
        render: (row) => (
          <Badge variant={row.purchaseType === 'PU Chemical' ? 'warning' : 'neutral'}>
            {purchaseTypeDisplayLabels[row.purchaseType] || row.purchaseType || 'Raw Material'}
          </Badge>
        ),
      },
      {
        key: 'itemName',
        title: 'Item',
        render: (row) => (
          <div>
            <p className="font-semibold text-heading">{row.itemName || row.product?.name}</p>
            <p className="text-xs text-body">
              {row.unit || 'Unit not set'} | Qty {row.quantity}
            </p>
            <p className="text-xs text-body">
              {formatCurrency(row.pricePerUnit || row.purchasePrice)} per {row.unit || 'unit'}
            </p>
          </div>
        ),
      },
      {
        key: 'recordedAt',
        title: 'Recorded',
        render: (row) => formatDateTime(row.recordedAt),
      },
      {
        key: 'paymentType',
        title: 'Payment',
        render: (row) => (
          <div className="space-y-1">
            <Badge variant={getPaymentBadgeVariant(row.paymentType, row.dueAmount)}>
              {row.paymentType}
            </Badge>
            <p className="text-xs text-body">
              Due: {row.dueDate ? formatDate(row.dueDate) : 'Not applicable'}
            </p>
          </div>
        ),
      },
      {
        key: 'gstType',
        title: 'GST',
        render: (row) =>
          row.gstType === 'None' ? 'None' : `${formatGstTypeLabel(row.gstType)} ${row.gstRate}%`,
      },
      {
        key: 'totalAmount',
        title: 'Total',
        render: (row) => formatCurrency(row.totalAmount),
      },
      {
        key: 'dueAmount',
        title: 'Due',
        render: (row) => formatCurrency(row.dueAmount),
      },
      {
        key: 'remarks',
        title: 'Remarks',
        render: (row) => row.remarks || 'No remarks',
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-2">
            <Link to={`/purchases/${row.id}`}>
              <Button type="button" size="sm" variant="primary">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>

            {hasPermission(PERMISSIONS.canEditPurchase) ? (
              <Link to={`/purchases/${row.id}/edit`}>
                <Button type="button" size="sm" variant="warning">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}

            {hasPermission(PERMISSIONS.canDeletePurchase) ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => setDeleteTarget(row)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [hasPermission],
  );

  function applyFilters(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams();

    if (filters.search.trim()) {
      nextParams.set('search', filters.search.trim());
    }

    if (filters.paymentType) {
      nextParams.set('paymentType', filters.paymentType);
    }

    // NEW
    if (filters.purchaseType) {
      nextParams.set('purchaseType', filters.purchaseType);
    }

    nextParams.set('limit', searchParams.get('limit') || '15');
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }

  function resetFilters() {
    setFilters({ search: '', paymentType: '', purchaseType: '' });
    setSearchParams({ page: '1', limit: searchParams.get('limit') || '15' });
  }

  function handleRowsPerPageChange(limit) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('limit', String(limit));
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }

  async function handleDeletePurchase() {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);

    try {
      await deletePurchase(deleteTarget.id);
      toast.success('Purchase deleted', 'Stock and payables were adjusted successfully.');
      const deletedId = deleteTarget.id;
      setState((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== deletedId),
        pagination: {
          ...current.pagination,
          totalItems: Math.max(current.pagination.totalItems - 1, 0),
        },
      }));
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Unable to delete purchase', getApiErrorMessage(error));
    } finally {
      setDeleteLoading(false);
    }
  }

  const hasActiveFilters = Boolean(filters.search || filters.paymentType || filters.purchaseType);

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-bold text-heading">Purchases</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Track raw material and PU chemical purchases, stock impact, bills, and pending balances.
            </p>
          </div>
          {hasPermission(PERMISSIONS.canCreatePurchase) ? (
            <Link to="/purchases/new">
              <Button>
                <Plus className="h-4 w-4" /> 
              </Button>
            </Link>
          ) : null}
        </div>

        <form
          className="mt-6 grid gap-4 rounded-3xl border border-border bg-background p-4 lg:grid-cols-[1fr_220px_220px_auto_auto]"
          onSubmit={applyFilters}
        >
          <SearchBox
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Search supplier, item, location, GST, remarks"
          />
          <Select
            value={filters.paymentType}
            onChange={(event) =>
              setFilters((current) => ({ ...current, paymentType: event.target.value }))
            }
            options={paymentTypeOptions.filter((option) => option.value)}
            placeholder="All Types"
            aria-label="Payment type"
          />
          <Select
            value={filters.purchaseType}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                purchaseType: event.target.value,
              }))
            }
            options={purchaseTypeOptions.filter((option) => option.value)}
            placeholder="All Purchase Types"
            aria-label="Purchase type"
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
            <h2 className="section-title">Purchase Records</h2>
            <p className="section-copy mt-2">
              {state.pagination.totalItems} purchase
              {state.pagination.totalItems === 1 ? '' : 's'} found.
            </p>
          </div>
          <Badge variant="neutral">Page {state.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          <DataTable
            columns={columns}
            data={state.items}
            loading={loading}
            loadingContent="Loading purchases..."
            pagination={state.pagination}
            onPageChange={(page) => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.set('page', String(page));
              setSearchParams(nextParams);
            }}
            onRowsPerPageChange={handleRowsPerPageChange}
            emptyContent={
              <EmptyState
                title={hasActiveFilters ? 'No purchases match these filters' : 'No purchases yet'}
                description={
                  hasActiveFilters
                    ? 'Try a broader search or clear the payment filter.'
                    : 'Create the first raw material purchase to start updating stock and supplier balances.'
                }
                actionLabel={
                  hasActiveFilters
                    ? 'Reset Filters'
                    : hasPermission(PERMISSIONS.canCreatePurchase)
                      ? 'Add Purchase'
                      : undefined
                }
                onAction={
                  hasActiveFilters
                    ? resetFilters
                    : hasPermission(PERMISSIONS.canCreatePurchase)
                      ? () => navigate('/purchases/new')
                      : undefined
                }
                icon={hasActiveFilters ? PackageSearch : FileText}
              />
            }
          />
        </div>
      </section>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete purchase"
        description="This will reverse the stock impact for the purchase and remove its payable entry."
        onClose={() => !deleteLoading && setDeleteTarget(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            {deleteTarget
              ? `Delete the purchase for ${deleteTarget.itemName || deleteTarget.product?.name} from ${deleteTarget.supplierName || deleteTarget.supplier?.name}?`
              : ''}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={deleteLoading} onClick={handleDeletePurchase}>
              Delete Purchase
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PurchaseListPage;
