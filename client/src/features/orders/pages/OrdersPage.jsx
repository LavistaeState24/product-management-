import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  ExternalLink,
  Eye,
  FileText,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import Textarea from '@/components/ui/Textarea';
import { PERMISSIONS } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import { useCan } from '@/hooks/useCan';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import ProductReferenceAttachment from '@/features/orders/components/ProductReferenceAttachment';
import {
  confirmNotificationForClient,
  createOrder,
  dispatchOrder,
  getBossOrders,
  getClientMessageLog,
  getOrderNotifications,
  getReadyForDispatchOrders,
  markNotificationSeen,
  openMessageInWhatsApp,
} from '@/features/orders/services/orderService';
import ProductionOrdersPanel from './ProductionOrdersPanel';

const tabs = [
  { key: 'new', label: 'New Order' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'ready', label: 'Ready for Dispatch' },
  { key: 'all', label: 'All Orders' },
  { key: 'messages', label: 'Message Center' },
];

const statusLabels = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_production: 'In Production',
  ready: 'Ready',
  dispatched: 'Dispatched',
};

const notificationLabels = {
  accepted: 'Accepted',
  progress: 'Progress',
  ready: 'Ready',
};

const messageKindLabels = {
  order_accepted: 'Order Accepted',
  ready_for_dispatch: 'Ready for Dispatch',
};

const maxAttachmentSize = 10 * 1024 * 1024;
const allowedAttachmentTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const allowedAttachmentExtensions = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
];

function createEmptyItem() {
  return {
    itemDesc: '',
    size: '',
    colour: '',
    hardness: '',
    quantity: '',
    rate: '',
  };
}

const initialForm = {
  clientName: '',
  clientMobile: '',
  remarks: '',
  items: [createEmptyItem()],
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

function formatMessageStatus(value) {
  return value === 'opened' ? 'Opened in WhatsApp' : 'Draft';
}

function isImageAttachment(fileOrReference) {
  return String(fileOrReference?.mimeType || fileOrReference?.type || '')
    .startsWith('image/');
}

function isAllowedAttachment(file) {
  const fileName = file.name?.toLowerCase() || '';
  const hasValidExtension = allowedAttachmentExtensions.some((extension) =>
    fileName.endsWith(extension),
  );

  const hasValidMimeType =
    !file.type ||
    allowedAttachmentTypes.includes(file.type);

  return hasValidExtension && hasValidMimeType;
}

function renderAttachment(productReference) {
  return <ProductReferenceAttachment productReference={productReference} />;
}

function renderItems(items = [], { showRate = false } = {}) {
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
            {item.itemNo ? `${item.itemNo} - ` : ''}
            {item.itemDesc || 'Item'}
          </p>
          <p className="text-body">
            Size: {item.size || '-'} | Colour: {item.colour || '-'} | Hardness:{' '}
            {item.hardness || '-'} | Qty: {item.quantity ?? item.qty ?? '-'}
          </p>
          {showRate ? (
            <p className="text-body">Rate: {item.rate ?? '-'}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function OrdersPage() {
  const toast = useToast();
  const can = useCan();
  const productReferenceInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('new');
  const [form, setForm] = useState(initialForm);
  const [productReferenceFile, setProductReferenceFile] = useState(null);
  const [productReferencePreviewUrl, setProductReferencePreviewUrl] =
    useState('');
  const [createdOrderNo, setCreatedOrderNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messageLogs, setMessageLogs] = useState([]);
  const [busyKey, setBusyKey] = useState('');
  const [preparedLogByNotification, setPreparedLogByNotification] = useState(
    {},
  );

  const canCreateOrders = can(PERMISSIONS.canCreateOrder);
  const canViewOrders = can(PERMISSIONS.canViewOrders);
  const canViewBossOrders = can(PERMISSIONS.canViewOrderClientDetails);
  const canDispatchOrders = can(PERMISSIONS.canDispatchOrder);
  const canViewMessageLogs = can(PERMISSIONS.canViewClientMessageLog);
  const canShareWhatsApp = can(PERMISSIONS.canShareOrderMessageOnWhatsApp);

  const availableTabs = useMemo(
    () =>
      tabs.filter((tab) => {
        if (tab.key === 'new') {
          return canCreateOrders;
        }

        if (tab.key === 'ready') {
          return canDispatchOrders;
        }

        if (tab.key === 'messages') {
          return canViewMessageLogs;
        }

        if (tab.key === 'notifications') {
          return canShareWhatsApp;
        }

        return canViewBossOrders;
      }),
    [
      canCreateOrders,
      canDispatchOrders,
      canViewBossOrders,
      canViewMessageLogs,
      canShareWhatsApp,
    ],
  );

  const loadOrdersData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [
        ordersResponse,
        readyResponse,
        notificationsResponse,
        messageLogsResponse,
      ] = await Promise.all([
        canViewBossOrders ? getBossOrders() : Promise.resolve({ items: [] }),
        canDispatchOrders
          ? getReadyForDispatchOrders()
          : Promise.resolve({ items: [] }),
        canShareWhatsApp
          ? getOrderNotifications()
          : Promise.resolve({ items: [] }),
        canViewMessageLogs
          ? getClientMessageLog()
          : Promise.resolve({ items: [] }),
      ]);

      setOrders(ordersResponse.items || []);
      setReadyOrders(readyResponse.items || []);
      setNotifications(notificationsResponse.items || []);
      setMessageLogs(messageLogsResponse.items || []);
    } catch (error) {
      toast.error('Unable to load orders', getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [
    canDispatchOrders,
    canShareWhatsApp,
    canViewBossOrders,
    canViewMessageLogs,
    toast,
  ]);

  useEffect(() => {
    loadOrdersData();
  }, [loadOrdersData]);

  useEffect(() => {
    if (!productReferenceFile || !isImageAttachment(productReferenceFile)) {
      setProductReferencePreviewUrl('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(productReferenceFile);
    setProductReferencePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [productReferenceFile]);

  useEffect(() => {
    if (
      availableTabs.length &&
      !availableTabs.some((tab) => tab.key === activeTab)
    ) {
      setActiveTab(availableTabs[0].key);
    }
  }, [activeTab, availableTabs]);

  const unseenNotifications = useMemo(
    () => notifications.filter((notification) => !notification.seen).length,
    [notifications],
  );

  function updateFormField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, createEmptyItem()],
    }));
  }

  function removeItem(index) {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function clearProductReference() {
    setProductReferenceFile(null);

    if (productReferenceInputRef.current) {
      productReferenceInputRef.current.value = '';
    }
  }

  function handleProductReferenceChange(event) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      clearProductReference();
      return;
    }

    if (file.size > maxAttachmentSize) {
      toast.error('Attachment too large', 'Maximum file size is 10 MB.');
      clearProductReference();
      return;
    }

    if (!isAllowedAttachment(file)) {
      toast.error(
        'Unsupported attachment',
        'Only PDF, JPG, JPEG, PNG, and WEBP files are allowed.',
      );
      clearProductReference();
      return;
    }

    setProductReferenceFile(file);
  }

  async function handleCreateOrder(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        clientName: form.clientName,
        clientMobile: form.clientMobile,
        remarks: form.remarks,
        items: form.items.map((item) => ({
          itemDesc: item.itemDesc,
          size: item.size,
          colour: item.colour,
          hardness: item.hardness,
          quantity: item.quantity,
          rate: item.rate,
        })),
        productReference: productReferenceFile,
      };

      const response = await createOrder(payload);
      const orderNo = response.order?.orderNo || '';

      setCreatedOrderNo(orderNo);
      setForm(initialForm);
      clearProductReference();
      toast.success(
        'Order created',
        orderNo ? `Generated order number ${orderNo}.` : undefined,
      );
      await loadOrdersData();
    } catch (error) {
      toast.error('Unable to create order', getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkSeen(notificationId) {
    setBusyKey(`seen-${notificationId}`);

    try {
      await markNotificationSeen(notificationId);
      toast.success('Notification marked seen');
      await loadOrdersData();
    } catch (error) {
      toast.error('Unable to update notification', getApiErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  }

  async function handlePrepareMessage(notificationId) {
    setBusyKey(`prepare-${notificationId}`);

    try {
      const response = await confirmNotificationForClient(notificationId);

      setPreparedLogByNotification((current) => ({
        ...current,
        [notificationId]: response.messageLog?.id,
      }));
      toast.success('Draft message prepared', 'Open it from Message Center.');
      await loadOrdersData();
    } catch (error) {
      toast.error('Unable to prepare message', getApiErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  }

  async function handleDispatch(orderId) {
    setBusyKey(`dispatch-${orderId}`);

    try {
      await dispatchOrder(orderId);
      toast.success(
        'Dispatch message prepared',
        'Dispatch message prepared in Message Center.',
      );
      await loadOrdersData();
      setActiveTab('messages');
    } catch (error) {
      toast.error('Unable to dispatch order', getApiErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  }

  async function handleCopyMessage(message) {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Message copied');
    } catch {
      toast.error('Unable to copy message');
    }
  }

  async function handleOpenWhatsApp(messageLogId) {
    setBusyKey(`whatsapp-${messageLogId}`);

    try {
      const response = await openMessageInWhatsApp(messageLogId);

      window.open(response.whatsappUrl, '_blank', 'noopener,noreferrer');
      await loadOrdersData();
    } catch (error) {
      toast.error('Unable to open WhatsApp', getApiErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  }

  const notificationColumns = [
    {
      key: 'orderNo',
      title: 'Order No.',
    },
    {
      key: 'kind',
      title: 'Type',
      render: (value) => notificationLabels[value] || value,
    },
    {
      key: 'message',
      title: 'Message',
      render: (value) => (
        <p className="max-w-xl whitespace-pre-wrap leading-6">{value}</p>
      ),
    },
    {
      key: 'seen',
      title: 'Status',
      render: (value) => (
        <Badge variant={value ? 'success' : 'warning'}>
          {value ? 'Seen' : 'New'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: formatDate,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, notification) => (
        <div className="flex flex-row gap-2">
          {notification.kind === 'accepted' ? (
            <>
              <Button
                type="button"
                variant="outline"
                title="Prepare Message"
                className="h-10 w-auto gap-2 rounded-lg px-3"
                loading={busyKey === `prepare-${notification.id}`}
                disabled={!canShareWhatsApp}
                onClick={() => handlePrepareMessage(notification.id)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              {preparedLogByNotification[notification.id] ? (
                <Button
                  type="button"
                  variant="success"
                  title="Open in WhatsApp"
                  className="h-10 w-auto gap-2 rounded-lg px-3"
                  loading={
                    busyKey ===
                    `whatsapp-${preparedLogByNotification[notification.id]}`
                  }
                  disabled={!canShareWhatsApp}
                  onClick={() =>
                    handleOpenWhatsApp(
                      preparedLogByNotification[notification.id],
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ) : null}
            </>
          ) : null}
          <Button
            type="button"
            variant="primary"
            title="Mark notification as seen"
            className="h-10 w-auto gap-2 rounded-lg px-3"
            loading={busyKey === `seen-${notification.id}`}
            onClick={() => handleMarkSeen(notification.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const readyColumns = [
    { key: 'orderNo', title: 'Order No.' },
    { key: 'clientName', title: 'Client' },
    { key: 'clientMobile', title: 'Mobile' },
    {
      key: 'items',
      title: 'Items',
      render: (items) => renderItems(items, { showRate: true }),
    },
    {
      key: 'productReference',
      title: 'Attachment',
      render: renderAttachment,
    },
    {
      key: 'readyByDate',
      title: 'Ready Date',
      render: formatDate,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, order) => (
        <Button
          type="button"
          variant="primary"
          className="h-10 w-auto gap-2 rounded-lg px-3"
          loading={busyKey === `dispatch-${order.id}`}
          disabled={!canDispatchOrders}
          onClick={() => handleDispatch(order.id)}
        >
          <Send className="h-4 w-4" />
            Dispatch
        </Button>
      ),
    },
  ];

  const orderColumns = [
    { key: 'orderNo', title: 'Order No.' },
    { key: 'clientName', title: 'Client' },
    { key: 'clientMobile', title: 'Mobile' },
    {
      key: 'items',
      title: 'Items',
      render: (items) => renderItems(items, { showRate: true }),
    },
    {
      key: 'productReference',
      title: 'Attachment',
      render: renderAttachment,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => <Badge>{formatStatus(value)}</Badge>,
    },
    {
      key: 'readyByDate',
      title: 'Ready Date',
      render: formatDate,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: formatDate,
    },
  ];

  const messageColumns = [
    { key: 'orderNo', title: 'Order No.' },
    { key: 'clientName', title: 'Client' },
    { key: 'clientMobile', title: 'Mobile' },
    {
      key: 'kind',
      title: 'Message Type',
      render: (value) => messageKindLabels[value] || value,
    },
    {
      key: 'message',
      title: 'Message',
      render: (value) => (
        <p className="max-w-xl whitespace-pre-wrap truncate leading-6">{value}</p>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <Badge variant={value === 'opened' ? 'success' : 'warning'}>
          {formatMessageStatus(value)}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created Date',
      render: formatDate,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, messageLog) => (
        <div className="flex flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            title="Copy message to clipboard"
            className="h-10 w-auto gap-2 rounded-lg px-3"
            onClick={() => handleCopyMessage(messageLog.message)}
          >
            <Clipboard className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="success"
            title="Open in WhatsApp"
            className="h-10 w-auto gap-2 rounded-lg px-3"
            loading={busyKey === `whatsapp-${messageLog.id}`}
            disabled={!canShareWhatsApp}
            onClick={() => handleOpenWhatsApp(messageLog.id)}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (canViewOrders && !canViewBossOrders) {
    return <ProductionOrdersPanel />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Orders</h1>
          <p className="mt-1 text-sm text-body">
            Create orders, review boss notifications, and prepare manual
            WhatsApp messages.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          title="Refresh orders"
          className="h-10 w-auto gap-2 rounded-lg px-3"
          loading={isLoading}
          onClick={loadOrdersData}
        >
          <RefreshCw className="h-4 w-4" />
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
            {tab.label}
            {tab.key === 'notifications' && unseenNotifications ? (
              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-blue-700">
                {unseenNotifications}
              </span>
            ) : null}
          </Button>
        ))}
      </div>

      {!availableTabs.length ? (
        <EmptyState
          title="No order actions available"
          description="Your role can view production order queues only."
        />
      ) : null}

      {activeTab === 'new' ? (
        <form
          className="space-y-5 rounded-3xl border border-border bg-card p-5"
          onSubmit={handleCreateOrder}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Client Name"
              value={form.clientName}
              onChange={(event) =>
                updateFormField('clientName', event.target.value)
              }
              required
            />
            <Input
              label="Mobile"
              value={form.clientMobile}
              onChange={(event) =>
                updateFormField('clientMobile', event.target.value)
              }
              required
            />
          </div>

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-heading">
                    Item {index + 1}
                  </h2>
                  <Button
                    type="button"
                    variant="danger"
                    // className="h-10 w-10 rounded-lg"
                    disabled={form.items.length === 1}
                    onClick={() => removeItem(index)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    label="Item/Product"
                    value={item.itemDesc}
                    onChange={(event) =>
                      updateItem(index, 'itemDesc', event.target.value)
                    }
                    required
                  />
                  <Input
                    label="Size"
                    value={item.size}
                    onChange={(event) =>
                      updateItem(index, 'size', event.target.value)
                    }
                  />
                  <Input
                    label="Colour"
                    value={item.colour}
                    onChange={(event) =>
                      updateItem(index, 'colour', event.target.value)
                    }
                  />
                  <Input
                    label="Hardness"
                    value={item.hardness}
                    onChange={(event) =>
                      updateItem(index, 'hardness', event.target.value)
                    }
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, 'quantity', event.target.value)
                    }
                    required
                  />
                  <Input
                    label="Rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(event) =>
                      updateItem(index, 'rate', event.target.value)
                    }
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="primary"
            title="Add another item to the order"
            className="h-10 w-auto gap-2 rounded-lg px-3"
            onClick={addItem}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <div className="rounded-2xl border border-border bg-background p-4">
            <label className="flex w-full flex-col gap-2">
              <span className="text-sm font-semibold text-heading">
                Product Reference / Attachment (Optional)
              </span>
              <input
                ref={productReferenceInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm text-heading file:mr-4 file:rounded-2xl file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-card"
                onChange={handleProductReferenceChange}
              />
              <span className="text-xs text-body">
                Supported formats: PDF, JPG, JPEG, PNG, WEBP. Maximum size: 10 MB.
              </span>
            </label>

            {productReferenceFile ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {productReferencePreviewUrl ? (
                    <img
                      src={productReferencePreviewUrl}
                      alt="Product reference preview"
                      className="h-16 w-16 rounded-xl border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background">
                      <FileText className="h-6 w-6 text-body" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-heading">
                      {productReferenceFile.name}
                    </p>
                    <p className="text-xs text-body">
                      {(productReferenceFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    title="Reselect attachment"
                    className="h-10 w-auto gap-2 rounded-lg px-3"
                    onClick={() => productReferenceInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    title="Remove attachment"
                    className="h-10 w-10 rounded-lg"
                    onClick={clearProductReference}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <Textarea
            label="Remarks"
            value={form.remarks}
            onChange={(event) => updateFormField('remarks', event.target.value)}
          />

          {createdOrderNo ? (
            <div className="rounded-2xl border border-success bg-success-tint p-4 text-sm font-semibold text-success">
              Generated Order No: {createdOrderNo}
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-auto rounded-lg px-5"
            loading={isSubmitting}
          >
            Create Order
          </Button>
        </form>
      ) : null}

      {activeTab === 'notifications' ? (
        <Table
          columns={notificationColumns}
          data={notifications}
          emptyContent={
            <EmptyState
              title="No notifications"
              description="Accepted, progress, and ready updates will appear here."
            />
          }
        />
      ) : null}

      {activeTab === 'ready' ? (
        <Table
          columns={readyColumns}
          data={readyOrders}
          emptyContent={
            <EmptyState
              title="No ready orders"
              description="Ready orders will appear here for dispatch message preparation."
            />
          }
        />
      ) : null}

      {activeTab === 'all' ? (
        <Table
          columns={orderColumns}
          data={orders}
          emptyContent={
            <EmptyState
              title="No orders"
              description="New orders will appear here after creation."
            />
          }
        />
      ) : null}

      {activeTab === 'messages' ? (
        <Table
          columns={messageColumns}
          data={messageLogs}
          emptyContent={
            <EmptyState
              title="No message logs"
              description="Draft and opened WhatsApp messages will appear here."
            />
          }
        />
      ) : null}
    </div>
  );
}

export default OrdersPage;
