import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import {
  useFieldArray,
  useForm,
} from 'react-hook-form';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { fetchSaleStockOptions } from '@/features/sales/services/saleService';
import {
  formatCurrency,
  getInvoiceStatusBadgeVariant,
} from '@/features/sales/utils/saleHelpers';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

const paymentOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Credit', label: 'Credit' },
];

const stockTypeOptions = [
  { value: 'rod', label: 'Rod' },
  { value: 'sheet', label: 'Sheet' },
  { value: 'pu-product', label: 'PU Product' },
  { value: 'legacy-product', label: 'Legacy Product' },
];

const emptyItem = {
  stockType: '',
  stockRef: '',
  quantity: '1',
  sellingPrice: '',
  gstRate: '0',
};

function getStockId(item) {
  return String(item?.stockRef || item?.id || item?._id || '');
}

function getAvailableQuantity(item) {
  return Number(
    item?.availableQuantity ??
    item?.quantity ??
    item?.currentStock ??
    0,
  );
}

function formatStockOption(item) {
  return [
    item.itemNumber,
    item.productName || item.name || item.itemName,
    item.size,
    item.colour,
    item.weight != null ? `${item.weight} KG` : '',
    item.sellingUnit,
    `Available: ${getAvailableQuantity(item)}`,
  ]
    .filter(Boolean)
    .join(' | ');
}

function roundCurrency(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function calculateLine(item = {}) {
  const quantity = Math.max(Number(item.quantity) || 0, 0);
  const sellingPrice = Math.max(Number(item.sellingPrice) || 0, 0);
  const gstRate = Math.max(Number(item.gstRate) || 0, 0);
  const lineSubtotal = roundCurrency(quantity * sellingPrice);
  const gstAmount = roundCurrency(lineSubtotal * (gstRate / 100));

  return {
    lineSubtotal,
    gstAmount,
    lineTotal: roundCurrency(lineSubtotal + gstAmount),
  };
}

function calculateDueDate(invoiceDate, creditDays) {
  if (!invoiceDate || Number(creditDays) <= 0) {
    return '';
  }

  const date = new Date(invoiceDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setDate(date.getDate() + Number(creditDays));
  return date.toISOString().slice(0, 10);
}

function normalizeInitialValues(initialValues = {}) {
  const values = {
    invoiceNumber: '',
    invoiceDate: '',
    customerName: '',
    customerMobile: '',
    customerAddress: '',
    customerLocation: '',
    customerGST: '',
    paymentType: 'Cash',
    paidAmount: '',
    creditDays: '',
    parcelCount: '',
    transportName: '',
    vehicleNumber: '',
    bankName: '',
    bankAccountNumber: '',
    bankIFSC: '',
    bankBranch: '',
    termsText: '',
    notes: '',
    items: [emptyItem],
    ...initialValues,
  };

  values.bankName =
    initialValues.bankName ||
    initialValues.bankDetails?.bankName ||
    '';
  values.bankAccountNumber =
    initialValues.bankAccountNumber ||
    initialValues.bankDetails?.accountNumber ||
    '';
  values.bankIFSC =
    initialValues.bankIFSC ||
    initialValues.bankDetails?.ifsc ||
    '';
  values.bankBranch =
    initialValues.bankBranch ||
    initialValues.bankDetails?.branch ||
    '';
  values.termsText =
    initialValues.termsText ||
    (Array.isArray(initialValues.termsAndConditions)
      ? initialValues.termsAndConditions.join('\n')
      : '');
  values.items =
    Array.isArray(initialValues.items) &&
      initialValues.items.length
      ? initialValues.items
      : [emptyItem];

  return values;
}

function SaleForm({
  title,
  description,
  submitLabel,
  initialValues,
  customers = [],
  loading = false,
  onSubmit,
}) {
  const customerListId = useId();
  const [stockOptionsByType, setStockOptionsByType] = useState({});
  const [stockLoadingByType, setStockLoadingByType] = useState({});
  const [stockErrorByType, setStockErrorByType] = useState({});

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: normalizeInitialValues(initialValues),
  });

  const {
    fields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'items',
  });

  const paymentType = watch('paymentType');
  const invoiceDate = watch('invoiceDate');
  const paidAmount = watch('paidAmount');
  const creditDays = watch('creditDays');
  const watchedItems = watch('items') || [];

  const loadStockOptions = useCallback(async (stockType, search = '') => {
    if (!stockType) {
      return;
    }

    if (!search && stockOptionsByType[stockType]) {
      return;
    }

    setStockLoadingByType((current) => ({
      ...current,
      [stockType]: true,
    }));
    setStockErrorByType((current) => ({
      ...current,
      [stockType]: '',
    }));

    try {
      const options = await fetchSaleStockOptions({
        stockType,
        search,
      });

      setStockOptionsByType((current) => ({
        ...current,
        [stockType]: options,
      }));
    } catch (error) {
      setStockOptionsByType((current) => ({
        ...current,
        [stockType]: [],
      }));
      setStockErrorByType((current) => ({
        ...current,
        [stockType]: getApiErrorMessage(error),
      }));
    } finally {
      setStockLoadingByType((current) => ({
        ...current,
        [stockType]: false,
      }));
    }
  }, [stockOptionsByType]);

  useEffect(() => {
    const nextValues = normalizeInitialValues(initialValues);
    reset(nextValues);

    [...new Set(nextValues.items.map((item) => item.stockType))]
      .filter(Boolean)
      .forEach((stockType) => {
        loadStockOptions(stockType);
      });
  }, [initialValues, loadStockOptions, reset]);

  const invoiceSummary = useMemo(() => {
    const lines = watchedItems.map(calculateLine);
    const subtotal = roundCurrency(
      lines.reduce((total, line) => total + line.lineSubtotal, 0),
    );
    const gstAmount = roundCurrency(
      lines.reduce((total, line) => total + line.gstAmount, 0),
    );
    const grandTotal = roundCurrency(subtotal + gstAmount);
    const normalizedPaidAmount =
      paymentType === 'Cash'
        ? grandTotal
        : roundCurrency(Math.max(Number(paidAmount) || 0, 0));
    const outstanding = roundCurrency(
      Math.max(grandTotal - normalizedPaidAmount, 0),
    );

    return {
      lines,
      subtotal,
      gstAmount,
      grandTotal,
      paidAmount: normalizedPaidAmount,
      outstanding,
      paymentStatus:
        outstanding <= 0
          ? 'Paid'
          : normalizedPaidAmount > 0
            ? 'Partially Paid'
            : 'Unpaid',
      dueDate: calculateDueDate(invoiceDate, creditDays),
    };
  }, [
    creditDays,
    invoiceDate,
    paidAmount,
    paymentType,
    watchedItems,
  ]);

  useEffect(() => {
    if (paymentType === 'Cash') {
      setValue('paidAmount', String(invoiceSummary.grandTotal));
      setValue('creditDays', '');
    }
  }, [
    invoiceSummary.grandTotal,
    paymentType,
    setValue,
  ]);

  function getSelectedStock(item) {
    const options = stockOptionsByType[item?.stockType] || [];
    return options.find(
      (option) => getStockId(option) === String(item?.stockRef || ''),
    );
  }

  function validateDuplicateItem(index) {
    const items = getValues('items') || [];
    const current = items[index];

    if (!current?.stockType || !current?.stockRef) {
      return true;
    }

    const duplicateIndex = items.findIndex(
      (item, itemIndex) =>
        itemIndex !== index &&
        item.stockType === current.stockType &&
        String(item.stockRef) === String(current.stockRef),
    );

    return duplicateIndex === -1
      ? true
      : 'Duplicate stock item selected.';
  }

  const cleanText = (value) => String(value ?? '').trim();

  function buildPayload(values) {
    return {
      invoiceDate: values.invoiceDate,

      customerName: cleanText(values.customerName),
      customerMobile: cleanText(values.customerMobile),
      customerAddress: cleanText(values.customerAddress),
      customerLocation: cleanText(values.customerLocation),
      customerGST: cleanText(values.customerGST).toUpperCase(),

      paymentType: values.paymentType,

      paidAmount:
        values.paymentType === 'Cash'
          ? invoiceSummary.grandTotal
          : Number(values.paidAmount) || 0,

      creditDays:
        values.paymentType === 'Credit'
          ? Number(values.creditDays) || 0
          : 0,

      parcelCount: Number(values.parcelCount) || 0,

      transportName: cleanText(values.transportName),
      vehicleNumber: cleanText(values.vehicleNumber).toUpperCase(),

      bankDetails: {
        bankName: cleanText(values.bankName),
        accountNumber: cleanText(values.bankAccountNumber),
        ifsc: cleanText(values.bankIFSC).toUpperCase(),
        branch: cleanText(values.bankBranch),
      },

      termsAndConditions: cleanText(values.termsText)
        .split('\n')
        .map((term) => term.trim())
        .filter(Boolean),

      notes: cleanText(values.notes),

      items: (values.items || []).map((item) => ({
        stockType: item.stockType,
        stockRef: item.stockRef,
        quantity: Number(item.quantity) || 0,
        sellingPrice: Number(item.sellingPrice) || 0,
        gstRate: Number(item.gstRate) || 0,
      })),
    };
  }

  function submitHandler(values) {
    onSubmit(buildPayload(values));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(submitHandler)}
    >
      <section className="panel p-6">
        <div className="flex flex-col gap-3 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">
              Sales Module
            </p>
            <h1 className="mt-2 text-3xl font-bold text-heading">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              {description}
            </p>
          </div>
          <Link to="/sales">
            <Button type="button" variant="outline">
              Back to sales
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-semibold text-heading">
              Invoice Number
            </span>
            <div className="flex h-12 items-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-heading">
              {initialValues?.invoiceNumber || 'Auto-generated on save'}
            </div>
          </label>
          <Input
            label="Invoice Date"
            type="date"
            error={errors.invoiceDate?.message}
            {...register('invoiceDate', {
              required: 'Invoice date is required.',
            })}
          />
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Party Details</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-5">
          <Input
            label="Customer"
            placeholder="Enter customer name"
            list={customerListId}
            error={errors.customerName?.message}
            {...register('customerName', {
              required: 'Customer is required.',
            })}
          />
          <datalist id={customerListId}>
            {customers.map((customer) => (
              <option
                key={customer.id || customer._id || customer.name}
                value={customer.name}
              />
            ))}
          </datalist>
          <Input
            label="Mobile"
            placeholder="Customer mobile"
            error={errors.customerMobile?.message}
            {...register('customerMobile', {
              pattern: {
                value: /^[0-9+\-\s()]{7,20}$/,
                message: 'Enter a valid mobile number.',
              },
            })}
          />
          <Input
            label="Location"
            placeholder="Customer location"
            {...register('customerLocation')}
          />
          <Input
            label="GST"
            placeholder="Customer GSTIN"
            error={errors.customerGST?.message}
            {...register('customerGST', {
              setValueAs: (value) => String(value || '').toUpperCase(),
            })}
          />
          <Textarea
            label="Address"
            rows={3}
            className="md:col-span-2"
            {...register('customerAddress')}
          />
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ">
          <div>
            <h2 className="section-title">Items</h2>
            <p className="section-copy mt-2">
              Add one or more stock items. Backend stock and totals remain authoritative.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            title="Add"
            onClick={() => append({ ...emptyItem })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 space-y-5 ">
          {fields.map((field, index) => {
            const item = watchedItems[index] || {};
            const stockType = item.stockType;
            const stockOptions = stockOptionsByType[stockType] || [];
            const selectedStock = getSelectedStock(item);
            const availableQuantity = getAvailableQuantity(selectedStock);
            const line = invoiceSummary.lines[index] || calculateLine(item);

            return (
              <div
                key={field.id}
                className="rounded-3xl border border-border bg-background p-4"
              >
                <div className="gap-4 mt-6 grid gap-5 md:grid-cols-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-heading">
                      Product Type
                    </span>
                    <select
                      className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
                      {...register(`items.${index}.stockType`, {
                        required: 'Product type is required.',
                        onChange: (event) => {
                          setValue(`items.${index}.stockRef`, '');
                          loadStockOptions(event.target.value);
                        },
                      })}
                    >
                      <option value="">Select type</option>
                      {stockTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.items?.[index]?.stockType?.message ? (
                      <span className="text-xs font-medium text-danger">
                        {errors.items[index].stockType.message}
                      </span>
                    ) : null}
                  </label>

                  <Input
                    label="Search Stock"
                    placeholder="Search item"
                    disabled={!stockType}
                    onChange={(event) => {
                      loadStockOptions(stockType, event.target.value);
                    }}
                  />

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-heading">
                      Stock Item
                    </span>
                    <select
                      disabled={!stockType || stockLoadingByType[stockType]}
                      className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-heading disabled:cursor-not-allowed disabled:opacity-60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
                      {...register(`items.${index}.stockRef`, {
                        required: 'Stock item is required.',
                        validate: () => validateDuplicateItem(index),
                      })}
                    >
                      <option value="">
                        {stockLoadingByType[stockType]
                          ? 'Loading stock...'
                          : stockType
                            ? 'Select stock'
                            : 'Select type first'}
                      </option>
                      {stockOptions.map((option) => (
                        <option
                          key={getStockId(option)}
                          value={getStockId(option)}
                          disabled={getAvailableQuantity(option) <= 0}
                        >
                          {formatStockOption(option)}
                        </option>
                      ))}
                    </select>
                    {stockType &&
                      !stockLoadingByType[stockType] &&
                      stockOptions.length === 0 ? (
                      <span className="text-xs text-body">
                        No stock items found.
                      </span>
                    ) : null}
                    {stockErrorByType[stockType] ? (
                      <span className="text-xs font-medium text-danger">
                        {stockErrorByType[stockType]}
                      </span>
                    ) : null}
                    {errors.items?.[index]?.stockRef?.message ? (
                      <span className="text-xs font-medium text-danger">
                        {errors.items[index].stockRef.message}
                      </span>
                    ) : null}
                    {selectedStock ? (
                      <span className="text-xs text-body">
                        Available: {availableQuantity}
                      </span>
                    ) : null}
                  </label>

                  <Input
                    label="Quantity"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    min="0.01"
                    step="0.01"
                    error={errors.items?.[index]?.quantity?.message}
                    {...register(`items.${index}.quantity`, {
                      required: 'Quantity is required.',
                      validate: (value) => {
                        const quantity = Number(value);
                        if (!Number.isFinite(quantity) || quantity <= 0) {
                          return 'Quantity must be greater than zero.';
                        }
                        if (selectedStock && quantity > availableQuantity) {
                          return `Only ${availableQuantity} is available.`;
                        }
                        return true;
                      },
                    })}
                  />
                  <Input
                    label="Selling Price"
                    type="number"
                    min="0"
                    step="0.01"
                    error={errors.items?.[index]?.sellingPrice?.message}
                    {...register(`items.${index}.sellingPrice`, {
                      required: 'Selling price is required.',
                      validate: (value) =>
                        Number(value) >= 0 ||
                        'Selling price cannot be negative.',
                    })}
                  />
                  <Input
                    label="GST"
                    type="number"
                    min="0"
                    step="0.01"
                    error={errors.items?.[index]?.gstRate?.message}
                    {...register(`items.${index}.gstRate`, {
                      validate: (value) =>
                        Number(value || 0) >= 0 ||
                        'GST cannot be negative.',
                    })}
                  />
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-heading">
                      Line Total
                    </span>
                    <div className="flex h-12 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-heading">
                      {formatCurrency(line.lineTotal)}
                    </div>
                  </label>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="danger"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="section-title">Payment</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-heading">
                Payment Type
              </span>
              <select
                className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
                {...register('paymentType', {
                  required: 'Payment type is required.',
                })}
              >
                {paymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Paid Amount"
              type="number"
              min="0"
              step="0.01"
              disabled={paymentType === 'Cash'}
              error={errors.paidAmount?.message}
              {...register('paidAmount', {
                validate: (value) => {
                  if (paymentType === 'Cash') {
                    return true;
                  }
                  if (Number(value || 0) < 0) {
                    return 'Paid amount cannot be negative.';
                  }
                  if (Number(value || 0) > invoiceSummary.grandTotal) {
                    return 'Paid amount cannot exceed grand total.';
                  }
                  return true;
                },
              })}
            />
            {paymentType === 'Credit' ? (
              <>
                <Input
                  label="Credit Days"
                  type="number"
                  min="1"
                  step="1"
                  error={errors.creditDays?.message}
                  {...register('creditDays', {
                    required: 'Credit days are required.',
                    validate: (value) =>
                      Number(value) > 0 ||
                      'Credit days must be greater than zero.',
                  })}
                />
                <Input
                  label="Due Date"
                  value={invoiceSummary.dueDate}
                  readOnly
                />
              </>
            ) : null}
            <Input
              label="Outstanding"
              value={formatCurrency(invoiceSummary.outstanding)}
              readOnly
            />
            <Input
              label="Payment Status"
              value={invoiceSummary.paymentStatus}
              readOnly
            />
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="section-title">Transport</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Input
              label="Parcel Count"
              type="number"
              min="0"
              step="1"
              error={errors.parcelCount?.message}
              {...register('parcelCount', {
                validate: (value) =>
                  Number(value || 0) >= 0 ||
                  'Parcel count cannot be negative.',
              })}
            />
            <Input
              label="Transport Name"
              {...register('transportName')}
            />
            <Input
              label="Vehicle Number"
              {...register('vehicleNumber', {
                setValueAs: (value) => String(value || '').toUpperCase(),
              })}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="section-title">Bank Details</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Input label="Bank Name" {...register('bankName')} />
            <Input label="Account Number" {...register('bankAccountNumber')} />
            <Input
              label="IFSC"
              {...register('bankIFSC', {
                setValueAs: (value) => String(value || '').toUpperCase(),
              })}
            />
            <Input label="Branch" {...register('bankBranch')} />
          </div>
        </div>
        <div className="panel p-6">
          <h2 className="section-title">Terms</h2>
          <Textarea
            rows={8}
            placeholder="One term per line"
            {...register('termsText')}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="panel p-6">
          <h2 className="section-title">Notes</h2>
          <Textarea
            rows={5}
            placeholder="Add sale notes"
            {...register('notes')}
          />
        </div>
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Invoice Summary</h2>
            <Badge
              variant={getInvoiceStatusBadgeVariant(
                invoiceSummary.paymentStatus,
              )}
            >
              {invoiceSummary.paymentStatus}
            </Badge>
          </div>
          <div className="mt-6 space-y-3 text-sm text-body">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <strong className="text-heading">
                {formatCurrency(invoiceSummary.subtotal)}
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>GST</span>
              <strong className="text-heading">
                {formatCurrency(invoiceSummary.gstAmount)}
              </strong>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <span>Grand Total</span>
              <strong className="text-heading">
                {formatCurrency(invoiceSummary.grandTotal)}
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Paid</span>
              <strong className="text-heading">
                {formatCurrency(invoiceSummary.paidAmount)}
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Outstanding</span>
              <strong className="text-heading">
                {formatCurrency(invoiceSummary.outstanding)}
              </strong>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button type="submit" loading={loading} disabled={loading}>
              {submitLabel}
            </Button>
            <Link to="/sales">
              <Button
                type="button"
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </form>
  );
}

export default SaleForm;
