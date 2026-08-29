import { useEffect, useMemo, useState } from 'react';
import { Boxes, FlaskConical, PackageOpen, TestTubeDiagonal } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { fetchStocks } from '@/features/stock/services/stockService';
import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';

const stockTabs = [
  {
    key: 'rawMaterials',
    label: 'Raw Material Stock',
    icon: Boxes,
  },
  {
    key: 'puChemicals',
    label: 'PU Chemical Stock',
    icon: FlaskConical,
  },
  {
    key: 'mocaStock',
    label: 'MOCA Stock',
    icon: TestTubeDiagonal,
  },
];

function isMocaStock(stock) {
  return String(stock?.itemName || '').trim().toLowerCase().includes('moca');
}

function formatQuantity(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function StockManagementPage() {
  const [activeTab, setActiveTab] = useState('rawMaterials');
  const [stocks, setStocks] = useState({ rawMaterials: [], puChemicals: [], mocaStock: [] });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    async function loadStocks() {
      setLoading(true);

      try {
        const data = await fetchStocks();
        const puChemicalRecords = data.puChemicals || [];

        if (!cancelled) {
          setStocks({
            rawMaterials: data.rawMaterials || [],
            puChemicals: puChemicalRecords.filter((stock) => !isMocaStock(stock)),
            mocaStock: puChemicalRecords.filter(isMocaStock),
          });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error('Unable to load stock', getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStocks();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const columns = useMemo(
    () => [
      {
        key: 'itemName',
        title: 'Item',
        render: (row) => <span className="font-semibold">{row.itemName}</span>,
      },
      {
        key: 'availableQuantity',
        title: 'Available Quantity',
        render: (row) => formatQuantity(row.availableQuantity),
      },
      {
        key: 'unit',
        title: 'Unit',
        render: (row) => <Badge variant="neutral">{row.unit}</Badge>,
      },
      {
        key: 'updatedAt',
        title: 'Last Updated',
        render: (row) => formatDateTime(row.updatedAt),
      },
    ],
    [],
  );

  // const activeItems = stocks[activeTab] || [];
  // const activeLabel = stockTabs.find((tab) => tab.key === activeTab)?.label;

  const activeItems = useMemo(() => {
  const items = stocks[activeTab] || [];
  return [...items].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}, [stocks, activeTab]);
const activeLabel = stockTabs.find((tab) => tab.key === activeTab)?.label;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-bold text-heading">Stock Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Review live raw material and PU chemical inventory from purchase stock records.
            </p>
          </div>
          <Badge variant="info">
            {stocks.rawMaterials.length + stocks.puChemicals.length + stocks.mocaStock.length} stock items
          </Badge>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap gap-3 border-b border-border pb-4">
          {stockTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? 'bg-primary text-white shadow-panel'
                    : 'bg-background text-body hover:text-heading'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    selected ? 'bg-white/20 text-white' : 'bg-card text-body'
                  }`}
                >
                  {stocks[tab.key].length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title">{activeLabel}</h2>
              <p className="section-copy mt-2">
                {activeItems.length} item{activeItems.length === 1 ? '' : 's'} available.
              </p>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={activeItems}
            loading={loading}
            loadingContent="Loading stock records..."
            emptyContent={
              <EmptyState
                title={`No ${activeLabel?.toLowerCase()} yet`}
                description="Stock appears here after purchases are recorded for this inventory type."
                icon={PackageOpen}
              />
            }
          />
        </div>
      </section>
    </div>
  );
}

export default StockManagementPage;
