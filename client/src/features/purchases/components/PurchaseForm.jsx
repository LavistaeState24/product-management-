import { useEffect, useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import {
  calculatePurchasePreview,
  formatCurrency,
  PURCHASE_GST_RATE_OPTIONS,
  PURCHASE_GST_TYPE_OPTIONS,
  RAW_MATERIAL_UNIT_OPTIONS,
} from '@/features/purchases/utils/purchaseHelpers';

const paymentOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Credit', label: 'Credit' },
  { value: 'Advance', label: 'Advance' },
];

const purchaseTypeOptions = [
  { value: 'Raw Material', label: 'Raw Material' },
  { value: 'PU Chemical', label: 'PU Chemical' },
];

function PurchaseForm({
  title,
  description,
  submitLabel,
  initialValues,
  suppliers,
  products,
  loading,
  onSubmit,
}) {
  const supplierListId = useId();
  const productListId = useId();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      purchaseType: 'Raw Material',
      ...(initialValues || {}),
    },
  });

  const paymentType = watch('paymentType');
  const quantity = watch('quantity');
  const pricePerUnit = watch('pricePerUnit');
  const gstType = watch('gstType');
  const gstRate = watch('gstRate');
  const paidAmount = watch('paidAmount');
  const removeBill = watch('removeBill');
  const selectedUnit = watch('unit');
  const recordedAtDisplay = watch('recordedAtDisplay');
  const purchaseType = watch('purchaseType') || 'Raw Material';

  useEffect(() => {
    reset({
      purchaseType: 'Raw Material',
      ...(initialValues || {}),
    });
  }, [initialValues, reset]);

  const preview = useMemo(
    () =>
      calculatePurchasePreview({
        quantity,
        purchasePrice: pricePerUnit,
        gstType,
        gstRate,
        paymentType,
        paidAmount,
      }),
    [gstRate, gstType, paidAmount, paymentType, pricePerUnit, quantity],
  );

  useEffect(() => {
    if (paymentType === 'Cash' || paymentType === 'Cheque') {
      setValue('paidAmount', String(preview.totalAmount));
      setValue('dueDate', '');
    }
  }, [paymentType, preview.totalAmount, setValue]);

  useEffect(() => {
    if (gstType === 'None') {
      setValue('gstRate', '0');
    }
  }, [gstType, setValue]);

  const supplierNames = (suppliers || [])
    .map((supplier) => supplier?.name)
    .filter(Boolean);

  const itemNames = (products || [])
    .map((product) => product?.name)
    .filter(Boolean);
  const dueDateRequired = paymentType === 'Credit' || paymentType === 'Advance';
  const priceLabel = selectedUnit === 'PCS' ? 'Price per PCS' : 'Price per Kg';

  const itemPlaceholder =
    purchaseType === 'PU Chemical'
      ? 'Enter PU chemical item name'
      : 'Enter raw material item name';

  const submitDescription =
    purchaseType === 'PU Chemical'
      ? 'Saving this purchase will update PU Chemical stock automatically.'
      : 'Saving this purchase will update raw material stock automatically.';

  return (
    <form className="space-y-6" onSubmit={handleSubmit((values) => onSubmit(values))}>
      <section className="panel p-6">
        <div className="flex flex-col gap-3 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">
              Purchase Module
            </p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">{description}</p>
          </div>

          <Link to="/purchases">
            <Button type="button" variant="outline">
              Back to purchases
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <input
            type="hidden"
            {...register('purchaseDate', { required: 'Purchase date is required.' })}
          />

          <Input label="Date & Time" readOnly value={recordedAtDisplay || ''} />

          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-semibold text-heading">Purchase Type</span>
            <select
              className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
              {...register('purchaseType', { required: 'Purchase type is required.' })}
            >
              {purchaseTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {errors.purchaseType?.message ? (
              <span className="text-xs font-medium text-danger">
                {errors.purchaseType.message}
              </span>
            ) : null}
          </label>

          <Input
            label="Supplier Name"
            list={supplierListId}
            placeholder="Enter supplier name"
            error={errors.supplierName?.message}
            {...register('supplierName', { required: 'Supplier name is required.' })}
          />

          <Input
            label="Address"
            placeholder="Enter supplier address"
            error={errors.supplierAddress?.message}
            {...register('supplierAddress', { required: 'Address is required.' })}
          />

          <Input
            label="Location"
            placeholder="Enter supplier location"
            error={errors.supplierLocation?.message}
            {...register('supplierLocation', { required: 'Location is required.' })}
          />

          <Input
            label="GST No."
            placeholder="Enter supplier GST number"
            maxLength={15}
            error={errors.gstNo?.message}
            {...register('gstNo', {
              required: 'GST number is required.',
              setValueAs: (value) =>
                String(value || '')
                  .trim()
                  .toUpperCase(),
              pattern: {
                value: /^[0-9A-Z]{15}$/,
                message:
                  'Enter a valid 15-character GST number.',
              },
            })}
          />

          <Input
            label="Item Name"
            list={productListId}
            placeholder={itemPlaceholder}
            error={errors.itemName?.message}
            {...register('itemName', { required: 'Item name is required.' })}
          />

          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-semibold text-heading">Unit</span>
            <select
              className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
              {...register('unit', { required: 'Unit is required.' })}
            >
              {RAW_MATERIAL_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {errors.unit?.message ? (
              <span className="text-xs font-medium text-danger">{errors.unit.message}</span>
            ) : null}
          </label>

          <Input
            label="Quantity"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            error={errors.quantity?.message}
            {...register('quantity', {
              required: 'Quantity is required.',
              min: {
                value: 0.01,
                message: 'Quantity must be greater than zero.',
              },
            })}
          />

          <Input
            label={priceLabel}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            error={errors.pricePerUnit?.message}
            {...register('pricePerUnit', {
              required: 'Price per unit is required.',
              min: {
                value: 0,
                message: 'Price cannot be negative.',
              },
            })}
          />

          <datalist id={supplierListId}>
            {supplierNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <datalist id={productListId}>
            {itemNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-semibold text-heading">Payment Type</span>
            <select
              className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
              {...register('paymentType', { required: 'Payment type is required.' })}
            >
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {errors.paymentType?.message ? (
              <span className="text-xs font-medium text-danger">
                {errors.paymentType.message}
              </span>
            ) : null}
          </label>

          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-semibold text-heading">GST Type</span>
            <select
              className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
              {...register('gstType', { required: 'GST type is required.' })}
            >
              {PURCHASE_GST_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {errors.gstType?.message ? (
              <span className="text-xs font-medium text-danger">{errors.gstType.message}</span>
            ) : null}
          </label>

          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-semibold text-heading">GST Rate</span>
            <select
              disabled={gstType === 'None'}
              className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint disabled:cursor-not-allowed disabled:opacity-60"
              {...register('gstRate', { required: 'GST rate is required.' })}
            >
              {PURCHASE_GST_RATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {errors.gstRate?.message ? (
              <span className="text-xs font-medium text-danger">{errors.gstRate.message}</span>
            ) : (
              <span className="text-xs text-body">
                {gstType === 'None'
                  ? 'GST rate stays at 0% when GST type is None.'
                  : 'Select the invoice GST rate.'}
              </span>
            )}
          </label>

          <Input
            label="Paid Amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            readOnly={
              paymentType === 'Cash' ||
              paymentType === 'Cheque'
            }
            hint={
              paymentType === 'Cash' ||
                paymentType === 'Cheque'
                ? `${paymentType} purchases are treated as fully paid.`
                : null
            }
            error={errors.paidAmount?.message}
            {...register('paidAmount', {
              validate: (value) => {
                if (
                  paymentType === 'Cash' ||
                  paymentType === 'Cheque'
                ) {
                  return true;
                }

                const paid = Number(value) || 0;

                if (paid < 0) {
                  return 'Paid amount cannot be negative.';
                }

                if (paid > preview.totalAmount) {
                  return 'Paid amount cannot exceed total amount.';
                }

                return true;
              },
            })}
          />

          {dueDateRequired ? (
            <Input
              label="Due Date"
              type="date"
              error={errors.dueDate?.message}
              {...register('dueDate', {
                required: 'Due date is required for credit or advance purchases.',
              })}
            />
          ) : null}

          <label className="flex w-full flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-heading">Bill Upload</span>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm text-heading file:mr-4 file:rounded-2xl file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-card"
              {...register('billUpload', {
                validate: {
                  fileSize: (files) => {
                    if (!files?.length) {
                      return true;
                    }

                    return (
                      files[0].size <=
                      10 * 1024 * 1024 ||
                      'Maximum file size is 10 MB.'
                    );
                  },

                  fileType: (files) => {
                    if (!files?.length) {
                      return true;
                    }

                    const file = files[0];

                    const allowedTypes = [
                      'application/pdf',
                      'image/jpeg',
                      'image/png',
                      'image/webp',
                    ];

                    const allowedExtensions = [
                      '.pdf',
                      '.jpg',
                      '.jpeg',
                      '.png',
                      '.webp',
                    ];

                    const fileName =
                      file.name?.toLowerCase() || '';

                    const hasValidExtension =
                      allowedExtensions.some(
                        (extension) =>
                          fileName.endsWith(extension),
                      );

                    const hasValidMimeType =
                      !file.type ||
                      allowedTypes.includes(file.type);

                    return (
                      (hasValidExtension &&
                        hasValidMimeType) ||
                      'Only PDF, JPG, JPEG, PNG, and WEBP files are allowed.'
                    );
                  },
                },

                onChange: (event) => {
                  if (event.target.files?.length) {
                    setValue('removeBill', false, {
                      shouldDirty: true,
                    });
                  }
                },
              })}
            />

            <span className="text-xs text-body">
              Supported formats: PDF, JPG, PNG, WEBP. Maximum size: 10 MB.
            </span>

            {errors.billUpload?.message ? (
              <span className="text-xs font-medium text-danger">
                {errors.billUpload.message}
              </span>
            ) : null}
          </label>

          {initialValues?.bill?.storagePath ? (
            <div className="rounded-3xl border border-border bg-background p-4 md:col-span-2">
              <p className="text-sm font-semibold text-heading">
                Current Purchase Bill
              </p>

              <p className="mt-2 text-sm font-medium text-heading">
                {initialValues?.bill?.originalName ||
                  initialValues?.bill?.filename ||
                  'Uploaded purchase bill'}
              </p>

              <p className="mt-1 text-xs text-body">
                The bill is stored securely. Use the purchase details page to view it.
              </p>

              <label className="mt-4 flex items-center gap-3 text-sm text-body">
                <input type="checkbox" {...register('removeBill')} />
                Remove current bill when saving
              </label>

              {removeBill ? (
                <p className="mt-2 text-xs font-medium text-warning">
                  The current bill will be deleted after this purchase is saved.
                </p>
              ) : null}
            </div>
          ) : null}

          <Textarea
            label="Remarks"
            placeholder="Add any supplier or purchase remarks"
            className="md:col-span-2"
            error={errors.remarks?.message}
            {...register('remarks', { required: 'Remarks are required.' })}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="panel p-6">
          <h2 className="section-title">Purchase Summary</h2>
          <p className="section-copy mt-2">
            Totals shown here are preview values. The backend remains authoritative.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl bg-primary-tint p-4">
              <p className="text-sm text-body">Basic Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.basicAmount)}
              </p>
            </div>

            <div className="rounded-3xl bg-primary-tint p-4">
              <p className="text-sm text-body">GST Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.gstAmount)}
              </p>
            </div>

            <div className="rounded-3xl bg-primary-tint p-4">
              <p className="text-sm text-body">CGST Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.cgstAmount)}
              </p>
            </div>

            <div className="rounded-3xl bg-primary-tint p-4">
              <p className="text-sm text-body">SGST Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.sgstAmount)}
              </p>
            </div>

            <div className="rounded-3xl bg-primary-tint p-4">
              <p className="text-sm text-body">IGST Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.igstAmount)}
              </p>
            </div>

            <div className="rounded-3xl bg-primary-tint p-4">
              <p className="text-sm text-body">Total Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.totalAmount)}
              </p>
            </div>

            <div className="rounded-3xl bg-success-tint p-4">
              <p className="text-sm text-body">Paid Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.paidAmount)}
              </p>
            </div>

            <div className="rounded-3xl bg-warning-tint p-4">
              <p className="text-sm text-body">Due Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.dueAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="section-title">Submit</h2>
          <p className="section-copy mt-2">{submitDescription}</p>

          <div className="mt-6 flex flex-col gap-3">
            <Button type="submit" loading={loading}>
              {submitLabel}
            </Button>

            <Link to="/purchases">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </form>
  );
}

export default PurchaseForm;