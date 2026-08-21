import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Factory,
  PackageCheck,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Select from '@/components/ui/Select';
import { fetchDashboard } from '@/features/dashboard/services/dashboardService';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { cn } from '@/utils/cn';

const periodOptions = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'last-6-months', label: 'Last 6 Months' },
  { value: 'this-year', label: 'This Year' },
];

const compactNumberFormat = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
});

const currencyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const shortCurrencyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
});

function formatCurrency(value) {
  return currencyFormat.format(Number(value || 0));
}

function formatShortCurrency(value) {
  return shortCurrencyFormat.format(Number(value || 0));
}

function formatQuantity(value) {
  return compactNumberFormat.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return dateFormat.format(date);
}

function normalizeUnitLabel(unit) {
  if (unit === 'Per PCS') return 'PCS';
  if (unit === 'Per Kg') return 'Kg';
  return unit || 'PCS';
}

function mergeUnits(...summaries) {
  return summaries.reduce((merged, summary) => {
    Object.entries(summary?.byUnit || {}).forEach(([unit, value]) => {
      const label = normalizeUnitLabel(unit);
      merged[label] = Number(merged[label] || 0) + Number(value || 0);
    });

    return merged;
  }, {});
}

function formatUnitLines(summary, fallbackUnit = 'PCS') {
  const units = Object.entries(summary?.byUnit || {})
    .map(([unit, value]) => [normalizeUnitLabel(unit), Number(value || 0)])
    .filter(([, value]) => value > 0);

  if (!units.length) {
    return [{ value: 0, unit: fallbackUnit }];
  }

  return units.map(([unit, value]) => ({
    value,
    unit,
  }));
}

function getFinishedProductLines(stock) {
  return formatUnitLines({
    byUnit: mergeUnits(
      stock?.finishedProductStock?.rod,
      stock?.finishedProductStock?.sheet,
      stock?.finishedProductStock?.puProduct,
      stock?.finishedProductStock?.legacyProduct,
    ),
  });
}

function getStatusVariant(type) {
  if (type === 'Out of Stock' || type === 'Supplier Payment Overdue' || type === 'Customer Payment Overdue') {
    return 'danger';
  }

  if (type === 'Low Stock') {
    return 'warning';
  }

  return 'info';
}

function formatAlertTitle(alert) {
  if (alert.type === 'Supplier Payment Overdue') {
    return alert.supplier?.name || 'Supplier payment overdue';
  }

  if (alert.type === 'Customer Payment Overdue') {
    return alert.customer?.name || 'Customer payment overdue';
  }

  return alert.itemName || 'Stock alert';
}

function formatAlertDetail(alert) {
  if (alert.type === 'Supplier Payment Overdue') {
    return `${formatCurrency(alert.outstandingAmount)} outstanding`;
  }

  if (alert.type === 'Customer Payment Overdue') {
    return `${formatCurrency(alert.amountReceivable)} receivable`;
  }

  return `${formatQuantity(alert.quantity)} in ${alert.stockType}`;
}

function formatAlertMeta(alert) {
  const dueDate = formatDate(alert.dueDate);

  if (alert.type === 'Supplier Payment Overdue' || alert.type === 'Customer Payment Overdue') {
    return dueDate ? `Due ${dueDate}` : 'Payment overdue';
  }

  if (alert.itemNumber) {
    return alert.itemNumber;
  }

  return alert.type;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }, (_, section) => (
        <section key={section} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: section === 3 ? 2 : 5 }, (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-3xl border border-border bg-card"
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function SectionHeader({ title, eyebrow, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-copy mt-1">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StockCard({ title, icon: Icon, lines, to }) {
  return (
    <Link
      to={to}
      className="group block rounded-3xl border border-border bg-card p-5 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold text-body">{title}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary transition group-hover:bg-primary group-hover:text-card">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-6 space-y-2">
        {lines.map((line) => (
          <p key={line.unit} className="flex items-baseline gap-2 text-3xl font-bold text-heading">
            {formatQuantity(line.value)}
            <span className="text-sm font-semibold uppercase tracking-[0.12em] text-body">
              {line.unit}
            </span>
          </p>
        ))}
      </div>
    </Link>
  );
}

function AttentionCard({ title, value, meta, icon: Icon, variant = 'info', to, critical = false }) {
  return (
    <Link
      to={to}
      className={cn(
        'group block rounded-3xl border bg-card p-5 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        critical ? 'border-danger/30' : 'border-border hover:border-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-body">{title}</p>
          <p className={cn('mt-4 text-2xl font-bold', critical ? 'text-danger' : 'text-heading')}>
            {value}
          </p>
          {meta ? <p className="mt-1 text-sm font-medium text-body">{meta}</p> : null}
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition',
            critical ? 'bg-danger-tint text-danger' : 'bg-primary-tint text-primary',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <Badge variant={variant} className="mt-5">
        Review
      </Badge>
    </Link>
  );
}

function BusinessCard({ title, value, tone = 'neutral' }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-body">{title}</p>
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            tone === 'success' && 'bg-success',
            tone === 'warning' && 'bg-warning',
            tone === 'danger' && 'bg-danger',
            tone === 'info' && 'bg-info',
            tone === 'neutral' && 'bg-primary',
          )}
        />
      </div>
      <p className="mt-5 text-3xl font-bold text-heading">{value}</p>
    </div>
  );
}

function ChartPanel({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-panel sm:p-6">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="mt-5 h-72 sm:h-80">{children}</div>
    </section>
  );
}

const chartTooltipStyle = {
  backgroundColor: 'var(--color-card)',
  borderColor: 'var(--color-border)',
  borderRadius: '16px',
  color: 'var(--color-heading)',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)',
};

function DashboardPage() {
  const [period, setPeriod] = useState('this-month');
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchDashboard(
          { period },
          { force: reloadKey > 0 },
        );

        if (!ignore) {
          setDashboard(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [period, reloadKey]);

  const stockCards = useMemo(() => {
    const stock = dashboard?.stock || {};

    return [
      {
        title: 'Raw Material',
        icon: Boxes,
        lines: formatUnitLines(stock.rawMaterialStock),
        to: '/stock',
      },
      {
        title: 'PU Chemical',
        icon: Boxes,
        lines: formatUnitLines(stock.puChemicalStock),
        to: '/stock',
      },
      {
        title: 'Rod Stock',
        icon: Factory,
        lines: formatUnitLines(stock.rodStock),
        to: '/rod-stocks',
      },
      {
        title: 'Sheet Stock',
        icon: Factory,
        lines: formatUnitLines(stock.sheetStock),
        to: '/sheet-stock',
      },
      {
        title: 'Finished Products',
        icon: PackageCheck,
        lines: getFinishedProductLines(stock),
        to: '/finished-goods-stock',
      },
    ];
  }, [dashboard]);

  if (loading && !dashboard) {
    return <DashboardSkeleton />;
  }

  if (error && !dashboard) {
    return (
      <EmptyState
        title="Unable to load dashboard"
        description={error}
        actionLabel="Retry"
        onAction={() => setReloadKey((current) => current + 1)}
        icon={AlertTriangle}
      />
    );
  }

  const alerts = dashboard?.alerts || {};
  const payments = dashboard?.payments || {};
  const business = dashboard?.businessSummary || {};
  const graphData = dashboard?.graphData || {};
  const importantAlerts = dashboard?.importantAlerts || [];
  const grossDifference = Number(business.grossDifference || 0);

  return (
    <div className="space-y-7">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-panel sm:p-6">
        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          {/* Left Side */}
          <div className="max-w-2xl">

            <h1 className="mt-2 text-3xl font-bold text-heading lg:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-body">
              Live stock, payment exposure, business movement, and the few alerts
              that need attention.
            </p>
          </div>

          {/* Right Side */}
          <div className="w-full lg:ml-auto lg:w-56 lg:shrink-0">
            <Select
              className="w-full"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              options={periodOptions}
              placeholder="Select Period"
              aria-label="Dashboard period"
            />
          </div>

        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Stock"
          subtitle="Current available stock by unit. These cards always reflect live stock."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stockCards.map((card) => (
            <StockCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-4 sm:p-5">
        <SectionHeader
          eyebrow="Needs Attention"
          title="Operational Exceptions"
          subtitle="Critical stock and payment signals that should be reviewed first."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AttentionCard
            title="Low Stock"
            value={formatQuantity(alerts.lowStockCount)}
            meta={`At or below ${alerts.lowStockThreshold || 10}`}
            icon={AlertTriangle}
            variant="warning"
            critical={Number(alerts.lowStockCount || 0) > 0}
            to="/finished-goods-stock"
          />
          <AttentionCard
            title="Out of Stock"
            value={formatQuantity(alerts.outOfStockCount)}
            meta="Needs replenishment"
            icon={AlertTriangle}
            variant="danger"
            critical={Number(alerts.outOfStockCount || 0) > 0}
            to="/finished-goods-stock"
          />
          <AttentionCard
            title="Purchase Due"
            value={formatCurrency(payments.purchaseOutstandingAmount)}
            meta={`${formatQuantity(payments.purchaseOverdueCount)} overdue`}
            icon={ReceiptText}
            variant={payments.purchaseOverdueCount ? 'danger' : 'info'}
            critical={Number(payments.purchaseOverdueCount || 0) > 0}
            to="/payment-management"
          />
          <AttentionCard
            title="Customer Outstanding"
            value={formatCurrency(payments.customerOutstandingAmount)}
            meta={`${formatQuantity(payments.customerOverdueCount)} overdue`}
            icon={WalletCards}
            variant={payments.customerOverdueCount ? 'danger' : 'info'}
            critical={Number(payments.customerOverdueCount || 0) > 0}
            to="/payment-management"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Business KPIs"
          subtitle="Summary follows the selected period while stock remains live."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BusinessCard
            title="This Month Sales"
            value={formatCurrency(business.totalSales)}
            tone="success"
          />
          <BusinessCard
            title="This Month Purchases"
            value={formatCurrency(business.totalPurchases)}
            tone="warning"
          />
          <BusinessCard
            title="Gross Difference"
            value={formatCurrency(grossDifference)}
            tone={grossDifference >= 0 ? 'success' : 'danger'}
          />
          <BusinessCard
            title="Sales Invoices"
            value={formatQuantity(business.salesInvoiceCount)}
            tone="info"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Monthly Sales" subtitle="Invoice value trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={graphData.monthlySales || []}
              margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="4 8" />
              <XAxis dataKey="label" stroke="var(--color-body)" axisLine={false} tickLine={false} />
              <YAxis
                stroke="var(--color-body)"
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={(value) => formatShortCurrency(value)}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value) => formatCurrency(value)}
                labelStyle={{ color: 'var(--color-heading)', fontWeight: 700 }}
              />
              <Area
                type="monotone"
                dataKey="totalSales"
                name="Sales"
                stroke="var(--color-primary)"
                fill="url(#salesArea)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Monthly Production" subtitle="Rod, sheet, and PU product output">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={graphData.monthlyProduction || []}
              margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="4 8" />
              <XAxis dataKey="label" stroke="var(--color-body)" axisLine={false} tickLine={false} />
              <YAxis stroke="var(--color-body)" axisLine={false} tickLine={false} width={42} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value) => formatQuantity(value)}
                labelStyle={{ color: 'var(--color-heading)', fontWeight: 700 }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey="rod" name="Rod" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="sheet" name="Sheet" fill="var(--color-warning)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="puProduct" name="PU Product" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-1 lg:grid-cols-1 md:grid-cols-1 sm:grid-cols-1">
        <ChartPanel title="Stock Movement" subtitle="Incoming purchase quantity against sold quantity">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={graphData.stockMovement || []}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="4 8" />
              <XAxis dataKey="label" stroke="var(--color-body)" axisLine={false} tickLine={false} />
              <YAxis stroke="var(--color-body)" axisLine={false} tickLine={false} width={42} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value) => formatQuantity(value)}
                labelStyle={{ color: 'var(--color-heading)', fontWeight: 700 }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: 12 }} />
              <Line
                type="monotone"
                dataKey="stockIn"
                name="Stock In"
                stroke="var(--color-success)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="stockOut"
                name="Stock Out"
                stroke="var(--color-danger)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel sm:p-6">
          <SectionHeader
            eyebrow="Needs Attention"
            title="Important Alerts"
            subtitle="Top five issues ordered by stock and payment urgency."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {importantAlerts.length ? (
              importantAlerts.map((alert, index) => (
                <div
                  key={`${alert.type}-${alert.itemName || alert.invoiceNumber || index}`}
                  className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/30 hover:bg-card"
                >
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                        getStatusVariant(alert.type) === "danger" && "bg-danger",
                        getStatusVariant(alert.type) === "warning" && "bg-warning",
                        getStatusVariant(alert.type) === "info" && "bg-info",
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-heading">
                            {formatAlertTitle(alert)}
                          </p>

                          <p className="mt-1 text-sm text-body">
                            {formatAlertDetail(alert)}
                          </p>

                          <p className="mt-1 text-xs font-medium text-body-muted">
                            {formatAlertMeta(alert)}
                          </p>
                        </div>

                        <Badge
                          variant={getStatusVariant(alert.type)}
                          className="shrink-0"
                        >
                          {alert.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="md:col-span-2">
                <EmptyState
                  title="No important alerts"
                  description="Critical stock and payment alerts will appear here."
                  icon={PackageCheck}
                />
              </div>
            )}
          </div>

          <div className="mt-5  flex justify-end">
            <Button
              as={Link}
              to="/payment-management"
              variant="primary"
              className="w-full sm:w-auto gap-3"
            >
             
              <ArrowRight className="h-4 w-4" />
               Review Payments
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

export default DashboardPage;
