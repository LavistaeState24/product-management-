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
} from '@/features/purchases/utils/purchaseHelpers';

const paymentOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Credit', label: 'Credit' },
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
    defaultValues: initialValues,
  });

  const paymentType = watch('paymentType');
  const quantity = watch('quantity');
  const purchasePrice = watch('purchasePrice');
  const gstType = watch('gstType');
  const gstRate = watch('gstRate');
  const paidAmount = watch('paidAmount');
  const removeBill = watch('removeBill');

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const preview = useMemo(
    () =>
      calculatePurchasePreview({
        quantity,
        purchasePrice,
        gstType,
        gstRate,
        paymentType,
        paidAmount,
      }),
    [gstRate, gstType, paidAmount, paymentType, purchasePrice, quantity],
  );

  useEffect(() => {
    if (paymentType === 'Cash') {
      setValue('paidAmount', String(preview.totalAmount));
      setValue('creditDueDate', '');
    }
  }, [paymentType, preview.totalAmount, setValue]);

  useEffect(() => {
    if (gstType === 'None') {
      setValue('gstRate', '0');
    }
  }, [gstType, setValue]);

  const supplierNames = suppliers.map((supplier) => supplier.name);
  const productNames = products.map((product) => product.name);

  return (
    <form className="space-y-6" onSubmit={handleSubmit((values) => onSubmit(values))}>
      <section className="panel p-6">
        <div className="flex flex-col gap-3 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Purchase Module</p>
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
          <Input
            label="Supplier"
            list={supplierListId}
            placeholder="Enter supplier name"
            error={errors.supplierName?.message}
            {...register('supplierName', { required: 'Supplier is required.' })}
          />

          <Input
            label="Product"
            list={productListId}
            placeholder="Enter product name"
            error={errors.productName?.message}
            {...register('productName', { required: 'Product is required.' })}
          />

          <datalist id={supplierListId}>
            {supplierNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <datalist id={productListId}>
            {productNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <Input
            label="Purchase Date"
            type="date"
            error={errors.purchaseDate?.message}
            {...register('purchaseDate', { required: 'Purchase date is required.' })}
          />

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

          <Input
            label="Quantity"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            error={errors.quantity?.message}
            {...register('quantity', { required: 'Quantity is required.' })}
          />

          <Input
            label="Purchase Price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            error={errors.purchasePrice?.message}
            {...register('purchasePrice', { required: 'Purchase price is required.' })}
          />

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
            disabled={paymentType === 'Cash'}
            hint={paymentType === 'Cash' ? 'Cash purchases are treated as fully paid.' : null}
            error={errors.paidAmount?.message}
            {...register('paidAmount', {
              validate: (value) => {
                if (paymentType === 'Cash') {
                  return true;
                }

                if ((Number(value) || 0) > preview.totalAmount) {
                  return 'Paid amount cannot exceed total amount.';
                }

                return true;
              },
            })}
          />

          {paymentType === 'Credit' ? (
            <Input
              label="Credit Due Date"
              type="date"
              error={errors.creditDueDate?.message}
              {...register('creditDueDate', {
                required: 'Credit due date is required for credit purchases.',
              })}
            />
          ) : null}

          <label className="flex w-full flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-heading">Bill Upload</span>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              className="rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm text-heading file:mr-4 file:rounded-2xl file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-card"
              {...register('billUpload')}
            />
            <span className="text-xs text-body">
              PDF, JPG, PNG, or WEBP up to 5 MB.
            </span>
          </label>

          {initialValues.bill?.url ? (
            <div className="rounded-3xl border border-border bg-background p-4 md:col-span-2">
              <p className="text-sm font-semibold text-heading">Current Bill</p>
              <a
                href={initialValues.bill.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {initialValues.bill.originalName}
              </a>

              <label className="mt-4 flex items-center gap-3 text-sm text-body">
                <input type="checkbox" {...register('removeBill')} />
                Remove current bill on save
              </label>

              {removeBill ? (
                <p className="mt-2 text-xs font-medium text-warning">
                  The current bill will be removed after you save this purchase.
                </p>
              ) : null}
            </div>
          ) : null}

          <Textarea
            label="Notes"
            placeholder="Add any supplier or bill notes"
            className="md:col-span-2"
            error={errors.notes?.message}
            {...register('notes')}
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
          <p className="section-copy mt-2">
            Saving this purchase will update stock automatically and refresh the supplier payable
            balance for credit purchases.
          </p>

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
