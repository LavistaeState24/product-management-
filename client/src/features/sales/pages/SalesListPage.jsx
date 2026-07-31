import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Ban, Edit, Eye, FileText, PackageSearch, Pencil, Plus, ReceiptText, View } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Textarea from '@/components/ui/Textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { cancelSale, fetchSales } from '@/features/sales/services/saleService';
import {
  formatCurrency,
  formatDate,
  getInvoiceStatusBadgeVariant,
  getPaymentBadgeVariant,
} from '@/features/sales/utils/saleHelpers';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { PERMISSIONS } from '@/constants/permissions';
import SalesPageSkeleton from '@/features/sales/components/SalesPageSkeleton';

const paymentTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Credit', label: 'Credit' },
];

const invoiceStatusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Partially Paid', label: 'Partially Paid' },
  { value: 'Unpaid', label: 'Unpaid' },
];

function SalesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({
    items: [],
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 10,
    },
  });
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    paymentType: searchParams.get('paymentType') || '',
    invoiceStatus: searchParams.get('invoiceStatus') || '',
  });
  const { hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      paymentType: searchParams.get('paymentType') || '',
      invoiceStatus: searchParams.get('invoiceStatus') || '',
    });
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    async function loadSales() {
      setLoading(true);

      try {
        const data = await fetchSales({
          page: Number(searchParams.get('page') || 1),
          search: searchParams.get('search') || undefined,
          paymentType: searchParams.get('paymentType') || undefined,
          invoiceStatus: searchParams.get('invoiceStatus') || undefined,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load sales', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSales();

    return () => {
      ignore = true;
    };
  }, [searchParams, toast]);

  const columns = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        title: 'Invoice Number',
      },
      {
        key: 'customer',
        title: 'Party',
        render: (value, row) => row.customerName || value?.name || '-',
      },
      {
        key: 'customerMobile',
        title: 'Mobile',
        render: (value, row) => value || row.customer?.mobile || '-',
      },
      {
        key: 'invoiceDate',
        title: 'Date',
        render: (value) => formatDate(value),
      },
      {
        key: 'totalAmount',
        title: 'Total',
        render: (value, row) => formatCurrency(value ?? row.grandTotal),
      },
      {
        key: 'paidAmount',
        title: 'Paid',
        render: (value, row) => formatCurrency(value ?? row.paid),
      },
      {
        key: 'outstandingAmount',
        title: 'Outstanding',
        render: (value, row) => formatCurrency(value ?? row.outstanding),
      },
      {
        key: 'paymentStatus',
        title: 'Payment Status',
        render: (value, row) => (
          <Badge variant={getPaymentBadgeVariant(row.paymentType)}>
            {value || row.paymentType || '-'}
          </Badge>
        ),
      },
      {
        key: 'invoiceStatus',
        title: 'Invoice Status',
        render: (value) => (
          <Badge variant={getInvoiceStatusBadgeVariant(value)}>
            {value || '-'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_, row) => (
          <div className="flex flex-wrap gap-2">
            <Link to={`/sales/${row.id}`}>
              <Button type="button" size="sm" variant="primary"  title="Edit">
                <Eye className="h-4 w-4"/>
              </Button>
            </Link>
            <Link to={`/sales/${row.id}/invoice`}>
              <Button type="button" size="sm" variant="secondary" title="Print">
                <ReceiptText className="h-4 w-4" />
              </Button>
            </Link>
            {hasPermission(PERMISSIONS.canEditSales) ? (
              <Link to={`/sales/${row.id}/edit`}>
                <Button type="button" size="sm" variant="success" title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
            {hasPermission(PERMISSIONS.canDeleteSales) && row.invoiceStatus !== 'Cancelled' ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                title="Cancel"
                onClick={() => {
                  setCancelTarget(row);
                  setCancelReason('');
                }}
              >
                <Ban className="h-4 w-4" />
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

    if (filters.invoiceStatus) {
      nextParams.set('invoiceStatus', filters.invoiceStatus);
    }

    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }

  function resetFilters() {
    setFilters({
      search: '',
      paymentType: '',
      invoiceStatus: '',
    });
    setSearchParams({ page: '1' });
  }

  async function handleCancelSale() {
    if (!cancelTarget) {
      return;
    }

    const reason = cancelReason.trim();

    if (!reason) {
      toast.error('Cancellation reason required', 'Enter a reason before cancelling this sale.');
      return;
    }

    setCancelLoading(true);

    try {
      const data = await cancelSale(cancelTarget.id, reason);
      toast.success('Sale cancelled', 'Stock and receivables were adjusted successfully.');
      const cancelledId = cancelTarget.id;
      const updatedSale = data.sale;
      setState((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === cancelledId
            ? { ...item, ...updatedSale }
            : item,
        ),
      }));
      setCancelTarget(null);
      setCancelReason('');
    } catch (error) {
      toast.error('Unable to cancel sale', getApiErrorMessage(error));
    } finally {
      setCancelLoading(false);
    }
  }

  if (loading) {
    return <SalesPageSkeleton />;
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.paymentType || filters.invoiceStatus,
  );

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Sales Module</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Sales & Billing</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Track invoices, reduce stock automatically, and monitor outstanding customer balances.
            </p>
          </div>
          {hasPermission(PERMISSIONS.canCreateSales) ? (
            <Link to="/sales/new">
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
            placeholder="Search invoice, customer, product, notes"
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
            value={filters.invoiceStatus}
            onChange={(event) =>
              setFilters((current) => ({ ...current, invoiceStatus: event.target.value }))
            }
            options={invoiceStatusOptions.filter((option) => option.value)}
            placeholder="All Statuses"
            aria-label="Invoice status"
          />
          <Button type="submit">Apply</Button>
          <Button type="button" variant="success" onClick={resetFilters}>
            Reset
          </Button>
        </form>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Sales Records</h2>
            <p className="section-copy mt-2">
              {state.pagination.totalItems} sale
              {state.pagination.totalItems === 1 ? '' : 's'} found.
            </p>
          </div>
          <Badge variant="neutral">Page {state.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          {state.items.length ? (
            <Table columns={columns} data={state.items} />
          ) : (
            <EmptyState
              title={hasActiveFilters ? 'No sales match these filters' : 'No sales yet'}
              description={
                hasActiveFilters
                  ? 'Try a broader search or clear one of the active filters.'
                  : 'Create the first sale to start updating stock and customer receivables.'
              }
              actionLabel={
                hasActiveFilters
                  ? 'Reset Filters'
                  : hasPermission(PERMISSIONS.canCreateSales)
                    ? 'Add Sale'
                    : undefined
              }
              onAction={
                hasActiveFilters
                  ? resetFilters
                  : hasPermission(PERMISSIONS.canCreateSales)
                    ? () => navigate('/sales/new')
                    : undefined
              }
              icon={hasActiveFilters ? PackageSearch : FileText}
            />
          )}
        </div>

        {state.items.length && state.pagination.totalPages > 1 ? (
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

      <Modal
        open={Boolean(cancelTarget)}
        title="Cancel sale"
        description="This keeps the invoice history and restores stock through the backend transaction."
        onClose={() => !cancelLoading && setCancelTarget(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            {cancelTarget
              ? `Cancel invoice ${cancelTarget.invoiceNumber} for ${
                  cancelTarget.customerName || cancelTarget.customer?.name || 'this party'
                }?`
              : ''}
          </p>
          <Textarea
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={4}
            placeholder="Enter reason"
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelLoading}
            >
              Close
            </Button>
            <Button type="button" variant="danger" loading={cancelLoading} onClick={handleCancelSale}>
              Cancel Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SalesListPage;
