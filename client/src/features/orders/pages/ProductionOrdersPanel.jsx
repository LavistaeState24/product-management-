import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Plus, RefreshCw } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Textarea from '@/components/ui/Textarea';
import { fetchFinishedGoodsStock } from '@/features/finished-goods-stock/services/finishedGoodsStockService';
import { PERMISSIONS } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import { useCan } from '@/hooks/useCan';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import {
  acceptProductionOrder,
  addProductionProgress,
  assignOrderItemNumbers,
  getProductionActiveOrders,
  getProductionOrders,
  getProductionPendingOrders,
  markProductionOrderReady,
} from '@/features/orders/services/orderService';

const productionTabs = [
  { key: 'pending', label: 'Pending Orders' },
  { key: 'active', label: 'In Production' },
  { key: 'ready', label: 'Mark Ready', assignLabel: 'Assign Item No.' },
  { key: 'all', label: 'All Orders' },
];

const statusLabels = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_production: 'In Production',
  ready: 'Ready',
  dispatched: 'Dispatched',
};

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatStatus(value) {
  return statusLabels[value] || value || '-';
}

function renderProductionItems(items = []) {
  if (!items.length) {
    return '-';
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={`${item.itemDesc}-${index}`}
          className="min-w-[260px] text-sm leading-6"
        >
          <p className="font-semibold text-heading">
            {item.itemDesc || 'Item'}
          </p>
          <p className="text-body">
            Size: {item.size || '-'} | Colour: {item.colour || '-'} | Hardness:{' '}
            {item.hardness || '-'} | Qty: {item.quantity ?? '-'}
          </p>
          <p className="text-body">Item No: {item.itemNo || '-'}</p>
        </div>
      ))}
    </div>
  );
}

function renderProgressTimeline(updates = []) {
  if (!updates.length) {
    return <span className="text-body">No updates</span>;
  }

  return (
    <div className="space-y-2">
      {updates.map((update, index) => (
        <div
          key={`${update.createdAt}-${index}`}
          className="min-w-[260px] rounded-lg border border-border bg-background px-3 py-2"
        >
          <p className="whitespace-pre-wrap text-sm text-heading">
            {update.note}
          </p>
          <p className="mt-1 text-xs text-body">{formatDate(update.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function toStockOptions(stockItems = []) {
  return stockItems
    .filter((item) => item.itemNumber)
    .map((item) => ({
      value: `${item.type}|${item.stockId}|${item.itemNumber}`,
      label: `${item.itemNumber} - ${item.productName || 'Stock'} (${item.stockType})`,
    }));
}

function parseStockOption(value) {
  const [stockType, stockRef, itemNo] = String(value || '').split('|');

  if (!stockType || !stockRef || !itemNo) {
    return null;
  }

  return {
    stockType,
    stockRef,
    itemNo,
  };
}

function getInitialReadyItems(order) {
  return (order?.items || []).map((item) => ({
    itemNo: item.itemNo || '',
    stockType: item.stockType || 'manual',
    stockRef: item.stockRef || null,
    selectedStock: '',
  }));
}

function ProductionOrdersPanel() {
  const toast = useToast();
  const can = useCan();
  const [activeTab, setActiveTab] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [stockOptions, setStockOptions] = useState([]);
  const [readyDaysByOrder, setReadyDaysByOrder] = useState({});
  const [progressNoteByOrder, setProgressNoteByOrder] = useState({});
  const [readyItemsByOrder, setReadyItemsByOrder] = useState({});
  const [busyKey, setBusyKey] = useState('');

  const canAcceptOrders = can(PERMISSIONS.canAcceptOrder);
  const canUpdateProduction = can(PERMISSIONS.canUpdateOrderProduction);
  const canAssignItemNumbers = can(PERMISSIONS.canAssignOrderItemNumber);
  const canMarkReady = can(PERMISSIONS.canMarkOrderReady);

  const availableTabs = useMemo(
    () =>
      productionTabs.filter((tab) => {
        if (tab.key === 'pending') {
          return canAcceptOrders;
        }

        if (tab.key === 'active') {
          return canUpdateProduction;
        }

        if (tab.key === 'ready') {
          return canAssignItemNumbers || canMarkReady;
        }

        return true;
      }),
    [
      canAcceptOrders,
      canAssignItemNumbers,
      canMarkReady,
      canUpdateProduction,
    ],
  );

  const markReadyOrders = useMemo(
    () =>
      activeOrders.filter((order) =>
        ['accepted', 'in_production'].includes(order.status),
      ),
    [activeOrders],
  );

  const loadProductionData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [pendingResponse, activeResponse, allResponse] = await Promise.all([
        getProductionPendingOrders(),
        getProductionActiveOrders(),
        getProductionOrders(),
      ]);

      setPendingOrders(pendingResponse.items || []);
      setActiveOrders(activeResponse.items || []);
      setAllOrders(allResponse.items || []);

      if (!canAssignItemNumbers) {
        setStockOptions([]);
        return;
      }

      try {
        const stockResponse = await fetchFinishedGoodsStock({ limit: 200 });
        setStockOptions(toStockOptions(stockResponse.data || []));
      } catch {
        setStockOptions([]);
      }
    } catch (error) {
      toast.error('Unable to load production orders', getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [canAssignItemNumbers, toast]);

  useEffect(() => {
    loadProductionData();
  }, [loadProductionData]);

  useEffect(() => {
    if (
      availableTabs.length &&
      !availableTabs.some((tab) => tab.key === activeTab)
    ) {
      setActiveTab(availableTabs[0].key);
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    setReadyItemsByOrder((current) => {
      const next = { ...current };

      markReadyOrders.forEach((order) => {
        if (!next[order.id]) {
          next[order.id] = getInitialReadyItems(order);
        }
      });

      return next;
    });
  }, [markReadyOrders]);

  async function handleAccept(orderId) {
    const readyDays = Number(readyDaysByOrder[orderId]);

    if (!Number.isInteger(readyDays) || readyDays <= 0) {
      toast.error('Ready days required', 'Enter a positive whole number.');
      return;
    }

    setBusyKey(`accept-${orderId}`);

    try {
      await acceptProductionOrder(orderId, readyDays);
      toast.success('Order accepted');
      await loadProductionData();
      setActiveTab('active');
    } catch (error) {
      toast.error('Unable to accept order', getApiErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  }

  async function handleAddProgress(orderId) {
    const note = String(progressNoteByOrder[orderId] || '').trim();

    if (!note) {
      toast.error('Progress note required');
      return;
    }

    setBusyKey(`progress-${orderId}`);

    try {
      await addProductionProgress(orderId, note);
      setProgressNoteByOrder((current) => ({
        ...current,
        [orderId]: '',
      }));
      toast.success('Progress update added');
      await loadProductionData();
    } catch (error) {
      toast.error('Unable to add progress', getApiErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  }

  function updateReadyItem(orderId, itemIndex, patch) {
    setReadyItemsByOrder((current) => ({
      ...current,
      [orderId]: (current[orderId] || []).map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));
  }

  function handleStockSelect(orderId, itemIndex, value) {
    const parsed = parseStockOption(value);

    if (!parsed) {
      updateReadyItem(orderId, itemIndex, {
        selectedStock: '',
        itemNo: '',
        stockType: 'manual',
        stockRef: null,
      });
      return;
    }

    updateReadyItem(orderId, itemIndex, {
      selectedStock: value,
      itemNo: parsed.itemNo,
      stockType: parsed.stockType,
      stockRef: parsed.stockRef,
    });
  }

  function handleManualItemNo(orderId, itemIndex, value) {
    updateReadyItem(orderId, itemIndex, {
      selectedStock: '',
      itemNo: value,
      stockType: 'manual',
      stockRef: null,
    });
  }

  function isReadyBlocked(order) {
    const readyItems = readyItemsByOrder[order.id] || [];

    return (
      readyItems.length !== order.items.length ||
      readyItems.some((item) => !String(item.itemNo || '').trim())
    );
  }

  async function handleMarkReady(order) {
    if (isReadyBlocked(order)) {
      toast.error('Item numbers required', 'Assign every item number first.');
      return;
    }

    setBusyKey(`ready-${order.id}`);

    try {
      await markProductionOrderReady(
        order.id,
        readyItemsByOrder[order.id].map((item) => ({
          itemNo: item.itemNo,
          stockType: item.stockType || 'manual',
          stockRef: item.stockType === 'manual' ? null : item.stockRef,
        })),
      );
      toast.success('Order marked Ready');
      await loadProductionData();
      setActiveTab('all');
    } catch (error) {
      toast.error('Unable to mark Ready', getApiErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  }

  async function handleAssignItemNumbers(order) {
    if (isReadyBlocked(order)) {
      toast.error('Item numbers required', 'Assign every item number first.');
      return;
    }

    setBusyKey(`assign-${order.id}`);

    try {
      await assignOrderItemNumbers(
        order.id,
        readyItemsByOrder[order.id].map((item) => ({
          itemNo: item.itemNo,
          stockType: item.stockType || 'manual',
          stockRef: item.stockType === 'manual' ? null : item.stockRef,
        })),
      );
      toast.success('Item numbers assigned');
      await loadProductionData();
    } catch (error) {
      toast.error('Unable to assign item numbers', getApiErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  }

  const pendingColumns = [
    { key: 'orderNo', title: 'Order No.' },
    {
      key: 'items',
      title: 'Items',
      render: renderProductionItems,
    },
    { key: 'remarks', title: 'Remarks' },
    {
      key: 'actions',
      title: 'Accept',
      render: (_, order) => (
        <div className="flex min-w-[240px] flex-wrap items-end gap-2">
          <Input
            label="Ready in Days"
            type="number"
            min="1"
            step="1"
            value={readyDaysByOrder[order.id] || ''}
            onChange={(event) =>
              setReadyDaysByOrder((current) => ({
                ...current,
                [order.id]: event.target.value,
              }))
            }
          />
          <Button
            type="button"
            className="h-10 w-auto gap-2 rounded-lg px-3"
            loading={busyKey === `accept-${order.id}`}
            disabled={!canAcceptOrders}
            onClick={() => handleAccept(order.id)}
          >
            <CheckCircle2 className="h-4 w-4" />
            Accept Order
          </Button>
        </div>
      ),
    },
  ];

  const activeColumns = [
    { key: 'orderNo', title: 'Order No.' },
    {
      key: 'items',
      title: 'Items',
      render: renderProductionItems,
    },
    {
      key: 'readyByDate',
      title: 'Ready Date',
      render: formatDate,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => <Badge>{formatStatus(value)}</Badge>,
    },
    {
      key: 'dailyUpdates',
      title: 'Progress Timeline',
      render: renderProgressTimeline,
    },
    {
      key: 'actions',
      title: 'Progress Note',
      render: (_, order) => (
        <div className="min-w-[300px] space-y-2">
          <Textarea
            rows={3}
            value={progressNoteByOrder[order.id] || ''}
            onChange={(event) =>
              setProgressNoteByOrder((current) => ({
                ...current,
                [order.id]: event.target.value,
              }))
            }
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 w-auto gap-2 rounded-lg px-3"
            loading={busyKey === `progress-${order.id}`}
            disabled={!canUpdateProduction}
            onClick={() => handleAddProgress(order.id)}
          >
            <Plus className="h-4 w-4" />
            Add Update
          </Button>
        </div>
      ),
    },
  ];

  const allColumns = [
    { key: 'orderNo', title: 'Order No.' },
    {
      key: 'items',
      title: 'Items',
      render: renderProductionItems,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => <Badge>{formatStatus(value)}</Badge>,
    },
    {
      key: 'readyByDate',
      title: 'Ready By',
      render: formatDate,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: formatDate,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Production Orders</h1>
          <p className="mt-1 text-sm text-body">
            Accept orders, update production progress, and assign item numbers.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-auto gap-2 rounded-lg px-3"
          loading={isLoading}
          onClick={loadProductionData}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableTabs.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant={activeTab === tab.key ? 'primary' : 'outline'}
            className="h-10 w-auto rounded-lg px-4"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.key === 'ready' && !canMarkReady
              ? tab.assignLabel
              : tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'pending' ? (
        <Table
          columns={pendingColumns}
          data={pendingOrders}
          emptyContent={
            <EmptyState
              title="No pending orders"
              description="Pending production orders will appear here."
              icon={ClipboardList}
            />
          }
        />
      ) : null}

      {activeTab === 'active' ? (
        <Table
          columns={activeColumns}
          data={activeOrders}
          emptyContent={
            <EmptyState
              title="No active production orders"
              description="Accepted and in-production orders will appear here."
              icon={ClipboardList}
            />
          }
        />
      ) : null}

      {activeTab === 'ready' ? (
        <div className="space-y-4">
          {markReadyOrders.length ? (
            markReadyOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-3xl border border-border bg-card p-5"
              >
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-heading">
                      {order.orderNo}
                    </h2>
                    <p className="text-sm text-body">
                      Ready By: {formatDate(order.readyByDate)}
                    </p>
                  </div>
                  <Badge>{formatStatus(order.status)}</Badge>
                </div>

                <div className="space-y-4">
                  {order.items.map((item, index) => {
                    const readyItem = readyItemsByOrder[order.id]?.[index] || {};

                    return (
                      <div
                        key={`${order.id}-${index}`}
                        className="rounded-2xl border border-border bg-background p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-3">
                          <Input label="Product" value={item.itemDesc || ''} readOnly />
                          <Input label="Size" value={item.size || ''} readOnly />
                          <Input label="Colour" value={item.colour || ''} readOnly />
                          <Input label="Hardness" value={item.hardness || ''} readOnly />
                          <Input label="Quantity" value={item.quantity ?? ''} readOnly />
                          <Select
                            label="Stock Item"
                            options={stockOptions}
                            placeholder="Manual item number"
                            value={readyItem.selectedStock || ''}
                            disabled={!canAssignItemNumbers}
                            onChange={(event) =>
                              handleStockSelect(
                                order.id,
                                index,
                                event.target.value,
                              )
                            }
                          />
                          <Input
                            label="Manual Item Number"
                            value={readyItem.itemNo || ''}
                            readOnly={!canAssignItemNumbers}
                            onChange={(event) =>
                              handleManualItemNo(
                                order.id,
                                index,
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-10 w-auto gap-2 rounded-lg px-3"
                  loading={busyKey === `assign-${order.id}`}
                  disabled={!canAssignItemNumbers || isReadyBlocked(order)}
                  onClick={() => handleAssignItemNumbers(order)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Assign Item No.
                </Button>
                {canMarkReady ? (
                  <Button
                    type="button"
                    className="ml-2 mt-4 h-10 w-auto gap-2 rounded-lg px-3"
                    loading={busyKey === `ready-${order.id}`}
                    disabled={isReadyBlocked(order)}
                    onClick={() => handleMarkReady(order)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Ready
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyState
              title="No orders to mark Ready"
              description="Accepted or in-production orders will appear here."
              icon={ClipboardList}
            />
          )}
        </div>
      ) : null}

      {activeTab === 'all' ? (
        <Table
          columns={allColumns}
          data={allOrders}
          emptyContent={
            <EmptyState
              title="No production orders"
              description="Production-safe order history will appear here."
              icon={ClipboardList}
            />
          }
        />
      ) : null}
    </div>
  );
}

export default ProductionOrdersPanel;
