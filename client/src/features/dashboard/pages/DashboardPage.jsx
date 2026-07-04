import { useMemo, useState } from 'react';
import { FolderLock, Layers3, ShieldCheck } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import KpiCard from '@/features/dashboard/components/KpiCard';

const activityData = [
  { day: 'Mon', value: 18 },
  { day: 'Tue', value: 22 },
  { day: 'Wed', value: 20 },
  { day: 'Thu', value: 28 },
  { day: 'Fri', value: 25 },
  { day: 'Sat', value: 30 },
  { day: 'Sun', value: 34 },
];

const foundationRows = [
  { area: 'Authentication', status: 'Ready', notes: 'JWT login, current-user API, logout flow' },
  { area: 'RBAC', status: 'Ready', notes: 'Role and permission-aware route protection' },
  { area: 'Purchase', status: 'Ready', notes: 'Supplier bills, stock mutation, and payable logic are active' },
  { area: 'Sales', status: 'Locked', notes: 'Reserved for future phase' },
  { area: 'Stock', status: 'Locked', notes: 'Reserved for future phase' },
];

function DashboardPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const columns = useMemo(
    () => [
      { key: 'area', title: 'Foundation Area' },
      { key: 'status', title: 'Status' },
      { key: 'notes', title: 'Notes' },
    ],
    [],
  );

  const filteredRows = foundationRows.filter((row) =>
    [row.area, row.status, row.notes].some((field) =>
      field.toLowerCase().includes(query.toLowerCase()),
    ),
  );

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6 lg:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary-tint blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Dashboard Access</p>
            <h1 className="mt-3 text-3xl font-bold text-heading lg:text-4xl">
              Welcome back, {user?.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-body lg:text-base">
              The platform now includes the system shell, secure authentication flow, reusable components, and the first transactional purchase workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setModalOpen(true)}>Open Foundation Notes</Button>
            <Button variant="outline">Current User API Connected</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Active Role" value={user?.role} change="Role aware" trend="info" />
        <KpiCard title="Permissions Granted" value={user?.permissions?.length || 0} change="RBAC ready" trend="success" />
        <KpiCard title="Protected Screens" value="8" change="Auth guard" trend="warning" />
        <KpiCard title="Locked Modules" value="4" change="Future phases" trend="danger" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="panel p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title">Workspace Readiness</h2>
              <p className="section-copy">
                Dashboard activity is placeholder telemetry for the foundation shell only.
              </p>
            </div>
            <Select
              className="w-full sm:w-56"
              options={[
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
              ]}
              defaultValue="week"
              aria-label="Activity period"
            />
          </div>

          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="foundationArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-body)" />
                <YAxis stroke="var(--color-body)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '16px',
                    color: 'var(--color-heading)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  fillOpacity={1}
                  fill="url(#foundationArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <h2 className="section-title">Security Controls</h2>
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-background p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-success" />
                <div>
                  <p className="font-semibold text-heading">JWT-protected APIs</p>
                  <p className="text-sm text-body">`/auth/login` and `/auth/me` are wired to Express and MongoDB.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-background p-4">
                <Layers3 className="mt-0.5 h-5 w-5 text-info" />
                <div>
                  <p className="font-semibold text-heading">Reusable UI system</p>
                  <p className="text-sm text-body">Buttons, forms, tables, badges, pagination, modal, and empty states are centralized.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-background p-4">
                <FolderLock className="mt-0.5 h-5 w-5 text-warning" />
                <div>
                  <p className="font-semibold text-heading">Business modules withheld</p>
                  <p className="text-sm text-body">Sales, stock, payments, and reports are still withheld. Purchase is now active.</p>
                </div>
              </div>
            </div>
          </div>

          <EmptyState
            title="Purchase workflow is ready"
            description="Use the purchase module to create supplier transactions, upload bills, and update stock."
            actionLabel="Review Foundation"
            onAction={() => setModalOpen(true)}
            icon={FolderLock}
          />
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="section-title">Implementation Scope</h2>
            <p className="section-copy">
              Searchable table preview using the shared table, input, and pagination components.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchBox
              className="sm:w-72"
              placeholder="Search foundation items"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <Table columns={columns} data={filteredRows} />
        </div>

        <div className="mt-6 flex justify-end">
          <Pagination page={page} totalPages={1} onPageChange={setPage} />
        </div>
      </section>

      <Modal
        open={modalOpen}
        title="Phase 1 Delivery"
        description="The base system is ready and now includes the first live domain transaction workflow."
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4 text-sm text-body">
          <p>Included: app shell, theme tokens, reusable UI primitives, protected routing, JWT login, current user hydration, logout, RBAC, boss seeding, and the purchase workflow.</p>
          <p>Excluded: sales, stock management screens, payments, reports, and analytics beyond the current foundation plus purchase release.</p>
          <div className="flex justify-end">
            <Button onClick={() => setModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default DashboardPage;
