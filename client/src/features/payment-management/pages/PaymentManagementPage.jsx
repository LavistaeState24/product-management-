import { useEffect, useMemo, useState } from 'react';
import { CreditCard, History, ReceiptText, SearchX, WalletCards } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Textarea from '@/components/ui/Textarea';
import { PERMISSION_GROUPS } from '@/constants/permissions';
import { useCan } from '@/hooks/useCan';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/features/sales/utils/saleHelpers';
import {
  fetchPurchasePaymentHistory,
  fetchPaymentManagementCustomers,
  fetchPaymentManagementPurchases,
  fetchSalePaymentHistory,
  recordPurchasePayment,
  recordSalePayment,
} from '@/features/payment-management/services/paymentManagementService';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { cn } from '@/utils/cn';

const tabs = [
  { value: 'purchases', label: 'Purchase Payments' },
  { value: 'customers', label: 'Customer Payments' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Partially Paid', label: 'Partially Paid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Overdue', label: 'Overdue' },
];

function getStatusBadgeVariant(status) {
  if (status === 'Paid') {
    return 'success';
  }

  if (status === 'Partially Paid') {
    return 'warning';
  }

  if (status === 'Overdue') {
    return 'danger';
  }

  return 'info';
}

function getOutstandingAmount(row, activeTab) {
  return activeTab === 'purchases'
    ? Number(row.outstandingAmount || 0)
    : Number(row.amountReceivable || 0);
}

function toDateInputValue(value = new Date()) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getPartyName(row, type) {
  return type === 'purchase'
    ? row.supplierName || row.supplier?.name || '-'
    : row.customerName || row.customer?.name || '-';
}

function getTotalAmount(row) {
  return Number(row.totalAmount || 0);
}

function getPaidAmount(row, type) {
  return type === 'purchase'
    ? Number(row.paidAmount || 0)
    : Number(row.receivedAmount || 0);
}

function getRecordId(row, type) {
  return type === 'purchase'
    ? row.purchaseId || row.id
    : row.saleId || row.id;
}

function getRecordedByName(recordedBy) {
  if (!recordedBy) {
    return '-';
  }

  if (typeof recordedBy === 'string') {
    return recordedBy;
  }

  return recordedBy.name || recordedBy.email || '-';
}

const initialPaymentForm = {
  amount: '',
  paymentDate: toDateInputValue(),
  paymentMethod: 'Cash',
  chequeNumber: '',
  chequeDate: '',
  bankName: '',
  remarks: '',
};

function PaymentManagementPage() {
  const [activeTab, setActiveTab] = useState('purchases');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });
  const [purchaseState, setPurchaseState] = useState({
    items: [],
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 10,
    },
  });
  const [customerState, setCustomerState] = useState({
    items: [],
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 10,
    },
  });
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [paymentErrors, setPaymentErrors] = useState({});
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const can = useCan();
  const toast = useToast();

  const canManagePayments = can(PERMISSION_GROUPS.createPayments);
  const currentState = activeTab === 'purchases' ? purchaseState : customerState;

  useEffect(() => {
    let ignore = false;

    async function loadPaymentRecords() {
      setLoading(true);

      try {
        const loader =
          activeTab === 'purchases'
            ? fetchPaymentManagementPurchases
            : fetchPaymentManagementCustomers;
        const data = await loader({
          page: currentState.pagination.page,
          search: filters.search.trim() || undefined,
        });

        if (!ignore) {
          if (activeTab === 'purchases') {
            setPurchaseState(data);
          } else {
            setCustomerState(data);
          }
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load payment records', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPaymentRecords();

    return () => {
      ignore = true;
    };
  }, [activeTab, currentState.pagination.page, filters.search, reloadKey, toast]);

  useEffect(() => {
    let ignore = false;

    async function loadPaymentHistory() {
      if (!historyTarget) {
        setHistoryItems([]);
        return;
      }

      setHistoryLoading(true);

      try {
        const loader =
          historyTarget.type === 'purchase'
            ? fetchPurchasePaymentHistory
            : fetchSalePaymentHistory;
        const data = await loader(getRecordId(historyTarget.row, historyTarget.type));

        if (!ignore) {
          setHistoryItems(data.items || []);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load payment history', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    }

    loadPaymentHistory();

    return () => {
      ignore = true;
    };
  }, [historyTarget, reloadKey, toast]);

  const filteredItems = useMemo(() => {
    if (!filters.status) {
      return currentState.items;
    }

    return currentState.items.filter((item) => item.paymentStatus === filters.status);
  }, [currentState.items, filters.status]);

  const purchaseColumns = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        title: 'Invoice/Purchase No.',
        render: (value) => value || '-',
      },
      {
        key: 'supplier',
        title: 'Supplier',
        render: (value, row) => row.supplierName || value?.name || '-',
      },
      {
        key: 'totalAmount',
        title: 'Total',
        render: (value) => formatCurrency(value),
      },
      {
        key: 'paidAmount',
        title: 'Paid',
        render: (value) => formatCurrency(value),
      },
      {
        key: 'outstandingAmount',
        title: 'Outstanding',
        render: (value) => (
          <span className={Number(value || 0) > 0 ? 'font-semibold text-warning' : 'text-success'}>
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        key: 'dueDate',
        title: 'Due Date',
        render: (value) => formatDate(value),
      },
      {
        key: 'paymentStatus',
        title: 'Status',
        render: (value) => (
          <Badge variant={getStatusBadgeVariant(value)}>
            {value || 'Pending'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_, row) => {
          const outstandingAmount = getOutstandingAmount(row, 'purchases');

          return (
            <div className="flex flex-wrap gap-2">
              {canManagePayments ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={outstandingAmount <= 0}
                  title={outstandingAmount <= 0 ? 'Invoice is fully paid' : undefined}
                  onClick={() => openPaymentModal('purchase', row)}
                >
                  <CreditCard className="h-4 w-4" />
                  Record Payment
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setHistoryTarget({ type: 'purchase', row })}
              >
                <History className="h-4 w-4" />
                View History
              </Button>
            </div>
          );
        },
      },
    ],
    [canManagePayments],
  );

  const customerColumns = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        title: 'Invoice No.',
        render: (value) => value || '-',
      },
      {
        key: 'customer',
        title: 'Customer',
        render: (value, row) => row.customerName || value?.name || '-',
      },
      {
        key: 'totalAmount',
        title: 'Total',
        render: (value) => formatCurrency(value),
      },
      {
        key: 'receivedAmount',
        title: 'Received',
        render: (value) => formatCurrency(value),
      },
      {
        key: 'amountReceivable',
        title: 'Receivable',
        render: (value) => (
          <span className={Number(value || 0) > 0 ? 'font-semibold text-warning' : 'text-success'}>
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        key: 'dueDate',
        title: 'Due Date',
        render: (value) => formatDate(value),
      },
      {
        key: 'paymentStatus',
        title: 'Status',
        render: (value) => (
          <Badge variant={getStatusBadgeVariant(value)}>
            {value || 'Pending'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_, row) => {
          const outstandingAmount = getOutstandingAmount(row, 'customers');

          return (
            <div className="flex flex-wrap gap-2">
              {canManagePayments ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={outstandingAmount <= 0}
                  title={outstandingAmount <= 0 ? 'Invoice is fully paid' : undefined}
                  onClick={() => openPaymentModal('sale', row)}
                >
                  <CreditCard className="h-4 w-4" />
                  Record Payment
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setHistoryTarget({ type: 'sale', row })}
              >
                <History className="h-4 w-4" />
                View History
              </Button>
            </div>
          );
        },
      },
    ],
    [canManagePayments],
  );

  const columns = activeTab === 'purchases' ? purchaseColumns : customerColumns;
  const activeTabLabel = tabs.find((tab) => tab.value === activeTab)?.label;
  const hasActiveFilters = Boolean(filters.search || filters.status);
  const paymentPartyLabel = paymentTarget?.type === 'purchase' ? 'Supplier' : 'Customer';
  const paymentOutstandingLabel =
    paymentTarget?.type === 'purchase' ? 'Outstanding' : 'Receivable';
  const paymentPaidLabel = paymentTarget?.type === 'purchase' ? 'Paid' : 'Received';
  const paymentOutstandingAmount = paymentTarget
    ? getOutstandingAmount(
        paymentTarget.row,
        paymentTarget.type === 'purchase' ? 'purchases' : 'customers',
      )
    : 0;

  function applyFilters(event) {
    event.preventDefault();

    if (activeTab === 'purchases') {
      setPurchaseState((current) => ({
        ...current,
        pagination: {
          ...current.pagination,
          page: 1,
        },
      }));
    } else {
      setCustomerState((current) => ({
        ...current,
        pagination: {
          ...current.pagination,
          page: 1,
        },
      }));
    }
  }

  function resetFilters() {
    setFilters({
      search: '',
      status: '',
    });
    setPurchaseState((current) => ({
      ...current,
      pagination: {
        ...current.pagination,
        page: 1,
      },
    }));
    setCustomerState((current) => ({
      ...current,
      pagination: {
        ...current.pagination,
        page: 1,
      },
    }));
  }

  function handlePageChange(page) {
    if (activeTab === 'purchases') {
      setPurchaseState((current) => ({
        ...current,
        pagination: {
          ...current.pagination,
          page,
        },
      }));
      return;
    }

    setCustomerState((current) => ({
      ...current,
      pagination: {
        ...current.pagination,
        page,
      },
    }));
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setFilters({
      search: '',
      status: '',
    });
  }

  function openPaymentModal(type, row) {
    setPaymentTarget({ type, row });
    setPaymentForm({
      ...initialPaymentForm,
      paymentDate: toDateInputValue(),
    });
    setPaymentErrors({});
  }

  function closePaymentModal() {
    if (paymentSaving) {
      return;
    }

    setPaymentTarget(null);
    setPaymentErrors({});
  }

  function validatePaymentForm() {
    const errors = {};
    const outstandingAmount = getOutstandingAmount(
      paymentTarget.row,
      paymentTarget.type === 'purchase' ? 'purchases' : 'customers',
    );
    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'Payment amount must be greater than 0.';
    } else if (amount > outstandingAmount) {
      errors.amount = 'Payment amount cannot exceed outstanding amount.';
    }

    if (!paymentForm.paymentDate) {
      errors.paymentDate = 'Payment date is required.';
    }

    if (paymentForm.paymentMethod === 'Cheque') {
      if (!paymentForm.chequeNumber.trim()) {
        errors.chequeNumber = 'Cheque number is required.';
      }

      if (!paymentForm.chequeDate) {
        errors.chequeDate = 'Cheque date is required.';
      }

      if (!paymentForm.bankName.trim()) {
        errors.bankName = 'Bank name is required.';
      }
    }

    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitPayment(event) {
    event.preventDefault();

    if (!paymentTarget || !validatePaymentForm()) {
      return;
    }

    setPaymentSaving(true);

    const payload = {
      amount: Number(paymentForm.amount),
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod,
      remarks: paymentForm.remarks.trim(),
    };

    if (paymentForm.paymentMethod === 'Cheque') {
      payload.chequeNumber = paymentForm.chequeNumber.trim();
      payload.chequeDate = paymentForm.chequeDate;
      payload.bankName = paymentForm.bankName.trim();
    }

    try {
      const submitter =
        paymentTarget.type === 'purchase'
          ? recordPurchasePayment
          : recordSalePayment;

      await submitter(getRecordId(paymentTarget.row, paymentTarget.type), payload);
      toast.success('Payment recorded', 'Invoice balance and payment history were updated.');
      setPaymentTarget(null);
      setReloadKey((current) => current + 1);
    } catch (error) {
      toast.error('Unable to record payment', getApiErrorMessage(error));
    } finally {
      setPaymentSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">
              Payment Module
            </p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Payment Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Track purchase payables and customer receivables from existing invoices.
            </p>
          </div>
          <Badge variant="neutral">
            {currentState.pagination.totalItems} record
            {currentState.pagination.totalItems === 1 ? '' : 's'}
          </Badge>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={cn(
                'border-b-2 px-4 py-3 text-sm font-semibold transition',
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-body hover:text-heading',
              )}
              onClick={() => handleTabChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          className="mt-6 grid gap-4 rounded-3xl border border-border bg-background p-4 lg:grid-cols-[1fr_220px_auto_auto]"
          onSubmit={applyFilters}
        >
          <SearchBox
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder={
              activeTab === 'purchases'
                ? 'Search supplier, invoice, remarks'
                : 'Search customer, invoice, mobile'
            }
          />
          <Select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value }))
            }
            options={statusOptions.filter((option) => option.value)}
            placeholder="All Statuses"
            aria-label="Payment status"
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
            <h2 className="section-title">{activeTabLabel}</h2>
            <p className="section-copy mt-2">
              {activeTab === 'purchases'
                ? 'Supplier payable invoices from purchase records.'
                : 'Customer receivable invoices from sales records.'}
            </p>
          </div>
          <Badge variant="neutral">Page {currentState.pagination.page}</Badge>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl border border-border bg-background"
                />
              ))}
            </div>
          ) : filteredItems.length ? (
            <Table columns={columns} data={filteredItems} />
          ) : (
            <EmptyState
              title={hasActiveFilters ? 'No payment records match these filters' : 'No payment records found'}
              description={
                hasActiveFilters
                  ? 'Try a broader search or clear the status filter.'
                  : 'Records will appear here when purchase or sales invoices are available.'
              }
              actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
              icon={hasActiveFilters ? SearchX : activeTab === 'purchases' ? ReceiptText : WalletCards}
            />
          )}
        </div>

        {!loading && currentState.items.length && currentState.pagination.totalPages > 1 ? (
          <div className="mt-6 flex justify-end">
            <Pagination
              page={currentState.pagination.page}
              totalPages={currentState.pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(paymentTarget)}
        title="Record Payment"
        description="Record a cash or cheque payment against the selected invoice."
        onClose={closePaymentModal}
        className="max-w-3xl"
      >
        {paymentTarget ? (
          <form className="space-y-6" onSubmit={submitPayment}>
            <div className="grid gap-3 rounded-3xl border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
                  Invoice
                </p>
                <p className="mt-1 text-sm font-semibold text-heading">
                  {paymentTarget.row.invoiceNumber || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
                  {paymentPartyLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-heading">
                  {getPartyName(paymentTarget.row, paymentTarget.type)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
                  Total
                </p>
                <p className="mt-1 text-sm font-semibold text-heading">
                  {formatCurrency(getTotalAmount(paymentTarget.row))}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
                  {paymentPaidLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-heading">
                  {formatCurrency(getPaidAmount(paymentTarget.row, paymentTarget.type))}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
                  {paymentOutstandingLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-warning">
                  {formatCurrency(paymentOutstandingAmount)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Payment Amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, amount: event.target.value }))
                }
                error={paymentErrors.amount}
              />
              <Input
                label="Payment Date"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))
                }
                error={paymentErrors.paymentDate}
              />
              <Select
                label="Payment Method"
                value={paymentForm.paymentMethod}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    paymentMethod: event.target.value,
                    chequeNumber: event.target.value === 'Cash' ? '' : current.chequeNumber,
                    chequeDate: event.target.value === 'Cash' ? '' : current.chequeDate,
                    bankName: event.target.value === 'Cash' ? '' : current.bankName,
                  }))
                }
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Cheque', label: 'Cheque' },
                ]}
                placeholder="Payment Method"
              />
              <Textarea
                label="Remarks"
                value={paymentForm.remarks}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, remarks: event.target.value }))
                }
                rows={3}
                className="md:col-span-2"
                error={paymentErrors.remarks}
              />
            </div>

            {paymentForm.paymentMethod === 'Cheque' ? (
              <div className="grid gap-4 rounded-3xl border border-border bg-background p-4 md:grid-cols-3">
                <Input
                  label="Cheque Number"
                  value={paymentForm.chequeNumber}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      chequeNumber: event.target.value,
                    }))
                  }
                  error={paymentErrors.chequeNumber}
                />
                <Input
                  label="Cheque Date"
                  type="date"
                  value={paymentForm.chequeDate}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      chequeDate: event.target.value,
                    }))
                  }
                  error={paymentErrors.chequeDate}
                />
                <Input
                  label="Bank Name"
                  value={paymentForm.bankName}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      bankName: event.target.value,
                    }))
                  }
                  error={paymentErrors.bankName}
                />
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closePaymentModal}
                disabled={paymentSaving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={paymentSaving}>
                Save Payment
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(historyTarget)}
        title="Payment History"
        description="Recorded payments for the selected invoice."
        onClose={() => setHistoryTarget(null)}
        className="max-w-4xl"
      >
        {historyTarget ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-3xl border border-border bg-background p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
                  Invoice
                </p>
                <p className="mt-1 text-sm font-semibold text-heading">
                  {historyTarget.row.invoiceNumber || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
                  {historyTarget.type === 'purchase' ? 'Supplier' : 'Customer'}
                </p>
                <p className="mt-1 text-sm font-semibold text-heading">
                  {getPartyName(historyTarget.row, historyTarget.type)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-body">
                  Balance
                </p>
                <p className="mt-1 text-sm font-semibold text-warning">
                  {formatCurrency(
                    getOutstandingAmount(
                      historyTarget.row,
                      historyTarget.type === 'purchase' ? 'purchases' : 'customers',
                    ),
                  )}
                </p>
              </div>
            </div>

            {historyLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-2xl border border-border bg-background"
                  />
                ))}
              </div>
            ) : historyItems.length ? (
              <Table
                columns={[
                  {
                    key: 'paymentDate',
                    title: 'Payment Date',
                    render: (value) => formatDate(value),
                  },
                  {
                    key: 'amount',
                    title: 'Amount',
                    render: (value) => formatCurrency(value),
                  },
                  {
                    key: 'paymentMethod',
                    title: 'Method',
                    render: (value, row) => (
                      <div className="space-y-1">
                        <Badge variant={value === 'Cheque' ? 'warning' : 'success'}>
                          {value}
                        </Badge>
                        {value === 'Cheque' ? (
                          <div className="text-xs text-body">
                            <p>Cheque {row.chequeNumber}</p>
                            <p>{formatDate(row.chequeDate)}</p>
                            <p>{row.bankName}</p>
                          </div>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: 'remarks',
                    title: 'Remarks',
                    render: (value) => value || '-',
                  },
                  {
                    key: 'recordedBy',
                    title: 'Recorded By',
                    render: (value) => getRecordedByName(value),
                  },
                ]}
                data={historyItems}
              />
            ) : (
              <EmptyState
                title="No payment history"
                description="Payments recorded against this invoice will appear here."
                icon={History}
              />
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default PaymentManagementPage;
