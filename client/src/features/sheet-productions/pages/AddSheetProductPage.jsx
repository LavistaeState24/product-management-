import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, RotateCcw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { formatQuantity, toDateTimeLocalValue } from '@/features/production/components/ProductionForm';
import { fetchSheetStocks } from '@/features/sheet-productions/services/sheetProductionService';
import { createSheetProductManufacturing } from '@/features/sheet-productions/services/sheetProductService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

const sellingUnitOptions = [
  { value: 'Per PCS', label: 'Per PCS' },
  { value: 'Per Kg', label: 'Per Kg' },
];

function buildInitialForm() {
  return {
    sheetStockId: '',
    quantityUsed: '',
    productName: '',
    size: '',
    colour: '',
    sellingUnit: 'Per PCS',
    quantity: '1',
    itemNumber: '',
    dateTime: toDateTimeLocalValue(new Date()),
    remarks: '',
  };
}

function validateForm(form, selectedStock) {
  const errors = {};
  const quantityUsed = Number(form.quantityUsed);
  const quantity = Number(form.quantity);

  if (!form.sheetStockId) errors.sheetStockId = 'Sheet stock is required.';
  if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) {
    errors.quantityUsed = 'Quantity used must be greater than 0.';
  } else if (selectedStock && quantityUsed > Number(selectedStock.quantity || 0)) {
    errors.quantityUsed = 'Quantity used cannot exceed available sheet stock.';
  }
  if (!form.productName.trim()) errors.productName = 'Product name is required.';
  if (!form.size.trim()) errors.size = 'Size is required.';
  if (!form.colour.trim()) errors.colour = 'Colour is required.';
  if (!['Per PCS', 'Per Kg'].includes(form.sellingUnit)) errors.sellingUnit = 'Selling unit is required.';
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = 'Quantity must be greater than 0.';
  if (!form.dateTime) errors.dateTime = 'Date and time is required.';

  return errors;
}

function AddSheetProductPage() {
  const navigate = useNavigate();
  const [sheetStocks, setSheetStocks] = useState([]);
  const [form, setForm] = useState(buildInitialForm);
  const [errors, setErrors] = useState({});
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const loadStocks = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const data = await fetchSheetStocks({ limit: 100 });
      setSheetStocks(data.items || []);
    } catch (error) {
      toast.error('Unable to load sheet stock', getApiErrorMessage(error));
    } finally {
      setLoadingStocks(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const stockOptions = useMemo(
    () =>
      sheetStocks.map((stock) => ({
        value: stock.id,
        label: `${stock.itemName} - ${stock.size}/${stock.colour} (qty ${formatQuantity(stock.quantity)})`,
      })),
    [sheetStocks],
  );
  const selectedStock = useMemo(
    () => sheetStocks.find((stock) => stock.id === form.sheetStockId),
    [form.sheetStockId, sheetStocks],
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(buildInitialForm());
    setErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form, selectedStock);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Unable to create sheet product', 'Fix the highlighted fields and try again.');
      return;
    }

    setSaving(true);
    try {
      const response = await createSheetProductManufacturing({
        sheetStockId: form.sheetStockId,
        quantityUsed: Number(form.quantityUsed),
        productName: form.productName.trim(),
        size: form.size.trim(),
        colour: form.colour.trim(),
        sellingUnit: form.sellingUnit,
        quantity: Number(form.quantity),
        itemNumber: form.itemNumber.trim(),
        dateTime: new Date(form.dateTime).toISOString(),
        remarks: form.remarks.trim(),
      });
      toast.success('Sheet product created', 'Sheet stock and sheet product stock were updated.');
      resetForm();
      await loadStocks();
      if (response?.sheetProductStock?.id) {
        navigate('/finished-goods-stock?type=sheet-product');
      }
    } catch (error) {
      toast.error('Unable to create sheet product', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Sheet Product</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Add Sheet Product</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Consume existing sheet stock to create finished sheet product inventory.
            </p>
          </div>
          <Factory className="h-10 w-10 text-primary" />
        </div>
      </section>

      <section className="panel p-6">
        <div className="border-b border-border pb-4">
          <h2 className="section-title">Sheet Stock Consumption</h2>
          <p className="section-copy mt-2">Select the sheet stock and record the consumed quantity.</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Select
            label="Sheet Stock"
            disabled={loadingStocks}
            options={stockOptions}
            value={form.sheetStockId}
            error={errors.sheetStockId}
            onChange={(event) => updateField('sheetStockId', event.target.value)}
          />

          <Input
            label="Available Sheet Stock"
            readOnly
            value={selectedStock ? `${formatQuantity(selectedStock.quantity)}` : 'Select sheet stock'}
          />

          <Input
            label="Quantity Used"
            type="number"
            min="0.01"
            step="0.01"
            value={form.quantityUsed}
            error={errors.quantityUsed}
            onChange={(event) => updateField('quantityUsed', event.target.value)}
          />

          <Input
            label="Date & Time"
            type="datetime-local"
            value={form.dateTime}
            error={errors.dateTime}
            onChange={(event) => updateField('dateTime', event.target.value)}
          />
        </div>
      </section>

      <section className="panel p-6">
        <div className="border-b border-border pb-4">
          <h2 className="section-title">Finished Product</h2>
          <p className="section-copy mt-2">Record the finished sheet product from this batch.</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Input label="Product Name" value={form.productName} error={errors.productName} onChange={(event) => updateField('productName', event.target.value)} />
          <Input label="Size" value={form.size} error={errors.size} onChange={(event) => updateField('size', event.target.value)} />
          <Input label="Colour" value={form.colour} error={errors.colour} onChange={(event) => updateField('colour', event.target.value)} />
          <Select label="Selling Unit" options={sellingUnitOptions} value={form.sellingUnit} error={errors.sellingUnit} onChange={(event) => updateField('sellingUnit', event.target.value)} />
          <Input label="Quantity" type="number" min="1" step="1" value={form.quantity} error={errors.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
          <Input label="Item Number" placeholder="Auto-generated if blank" value={form.itemNumber} onChange={(event) => updateField('itemNumber', event.target.value)} />
          <Textarea label="Remarks" className="md:col-span-2" placeholder="Add manufacturing remarks" value={form.remarks} onChange={(event) => updateField('remarks', event.target.value)} />
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="success" onClick={resetForm} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button type="submit" loading={saving}>
            Create Sheet Product
          </Button>
        </div>
      </section>
    </form>
  );
}

export default AddSheetProductPage;
