import { useEffect, useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import {
  calculateSalePreview,
  formatCurrency,
  getInvoiceStatusBadgeVariant,
} from '@/features/sales/utils/saleHelpers';

const paymentOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Credit', label: 'Credit' },
];

function normalizeName(value = '') {
  return value.trim().toLowerCase();
}

function SaleForm({
  title,
  description,
  submitLabel,
  initialValues,
  customers,
  products,
  loading,
  onSubmit,
}) {
  const customerListId = useId();
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
  const sellingPrice = watch('sellingPrice');
  const paidAmount = watch('paidAmount');
  const productName = watch('productName');

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const preview = useMemo(
    () =>
      calculateSalePreview({
        quantity,
        sellingPrice,
        paymentType,
        paidAmount,
      }),
    [paidAmount, paymentType, quantity, sellingPrice],
  );

  useEffect(() => {
    if (paymentType === 'Cash') {
      setValue('paidAmount', String(preview.totalAmount));
    }
  }, [paymentType, preview.totalAmount, setValue]);

  const customerNames = customers.map((customer) => customer.name);
  const productNames = products.map((product) => product.name);
  const selectedProduct = products.find(
    (product) => normalizeName(product.name) === normalizeName(productName),
  );

  return (
    <form className="space-y-6" onSubmit={handleSubmit((values) => onSubmit(values))}>
      <section className="panel p-6">
        <div className="flex flex-col gap-3 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Sales Module</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">{description}</p>
          </div>

          <Link to="/sales">
            <Button type="button" variant="outline">
              Back to sales
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-semibold text-heading">Invoice Number</span>
            <div className="flex h-12 items-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-heading">
              {initialValues.invoiceNumber || 'Auto-generated on save'}
            </div>
            <span className="text-xs text-body">
              Invoice numbers are generated automatically and remain fixed after creation.
            </span>
          </label>

          <Input
            label="Invoice Date"
            type="date"
            error={errors.invoiceDate?.message}
            {...register('invoiceDate', { required: 'Invoice date is required.' })}
          />

          <Input
            label="Customer"
            list={customerListId}
            placeholder="Enter customer name"
            error={errors.customerName?.message}
            {...register('customerName', { required: 'Customer is required.' })}
          />

          <Input
            label="Product"
            list={productListId}
            placeholder="Select an existing product"
            hint={
              selectedProduct
                ? `Current stock: ${selectedProduct.currentStock}`
                : 'Sales can only be recorded against existing products.'
            }
            error={errors.productName?.message}
            {...register('productName', { required: 'Product is required.' })}
          />

          <datalist id={customerListId}>
            {customerNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <datalist id={productListId}>
            {productNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

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
            label="Selling Price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            error={errors.sellingPrice?.message}
            {...register('sellingPrice', { required: 'Selling price is required.' })}
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
            label="Paid Amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            disabled={paymentType === 'Cash'}
            hint={paymentType === 'Cash' ? 'Cash sales are treated as fully paid.' : null}
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

          <Textarea
            label="Notes"
            placeholder="Add any sale-specific notes"
            className="md:col-span-2"
            error={errors.notes?.message}
            {...register('notes')}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="panel p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title">Invoice Preview</h2>
              <p className="section-copy mt-2">
                These amounts preview the sale invoice before it is saved.
              </p>
            </div>
            <Badge variant={getInvoiceStatusBadgeVariant(preview.invoiceStatus)}>
              {preview.invoiceStatus}
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-primary-tint p-4">
              <p className="text-sm text-body">Current Stock</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {selectedProduct?.currentStock ?? 'N/A'}
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
              <p className="text-sm text-body">Outstanding Amount</p>
              <p className="mt-3 text-2xl font-bold text-heading">
                {formatCurrency(preview.outstandingAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="section-title">Submit</h2>
          <p className="section-copy mt-2">
            Saving this sale will reduce stock immediately and update customer receivables for
            credit invoices.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button type="submit" loading={loading}>
              {submitLabel}
            </Button>

            <Link to="/sales">
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

export default SaleForm;
