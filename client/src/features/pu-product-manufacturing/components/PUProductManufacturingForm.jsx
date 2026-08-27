import { useCallback, useEffect, useMemo, useState } from 'react';
import { Factory, RotateCcw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { formatQuantity, toDateTimeLocalValue } from '@/features/production/components/ProductionForm';
import { fetchStocks } from '@/features/stock/services/stockService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

const sellingUnitOptions = [
  { value: 'Per PCS', label: 'Per PCS' },
  { value: 'Per Kg', label: 'Per Kg' },
];

function buildInitialForm(batch) {
  return {
    puChemicalStockId:
      typeof batch?.puChemicalStockId === 'object'
        ? batch.puChemicalStockId?._id || batch.puChemicalStockId?.id || ''
        : batch?.puChemicalStockId || '',
    chemicalQuantityKg: batch ? String(batch.chemicalQuantityKg || '') : '',
    mocaStockId:
      typeof batch?.mocaStockId === 'object'
        ? batch.mocaStockId?._id || batch.mocaStockId?.id || ''
        : batch?.mocaStockId || '',
    mocaQuantityKg: batch ? String(batch.mocaQuantityKg || '') : '',
    productName: batch?.productName || '',
    size: batch?.size || '',
    colour: batch?.colour || '',
    drawingNumber: batch?.drawingNumber || '',
    photo: batch?.photo || '',
    sellingUnit: batch?.sellingUnit || 'Per PCS',
    quantity: batch ? String(batch.quantity || '1') : '1',
    itemNumber: batch?.itemNumber || '',
    dateTime: toDateTimeLocalValue(batch?.dateTime || new Date()),
    remarks: batch?.remarks || '',
  };
}

function resolveStockId(value) {
  if (!value) return '';
  if (typeof value === 'object') return value._id || value.id || '';
  return value;
}

function validateForm(form, selectedChemical, selectedMoca, initialBatch) {
  const errors = {};
  const chemicalQuantity = Number(form.chemicalQuantityKg);
  const mocaQuantity = Number(form.mocaQuantityKg);
  const quantity = Number(form.quantity);
  const originalChemicalStockId = resolveStockId(initialBatch?.puChemicalStockId);
  const originalMocaStockId = resolveStockId(initialBatch?.mocaStockId);
  const chemicalAllowance =
    selectedChemical && form.puChemicalStockId === originalChemicalStockId
      ? Number(initialBatch?.chemicalQuantityKg || 0)
      : 0;
  const mocaAllowance =
    selectedMoca && form.mocaStockId === originalMocaStockId
      ? Number(initialBatch?.mocaQuantityKg || 0)
      : 0;

  if (!form.puChemicalStockId) errors.puChemicalStockId = 'PU chemical is required.';
  if (!form.mocaStockId) errors.mocaStockId = 'MOCA is required.';
  if (!Number.isFinite(chemicalQuantity) || chemicalQuantity <= 0) {
    errors.chemicalQuantityKg = 'Chemical quantity must be greater than 0.';
  } else if (
    selectedChemical &&
    chemicalQuantity > Number(selectedChemical.availableQuantity || 0) + chemicalAllowance
  ) {
    errors.chemicalQuantityKg = 'Chemical quantity cannot exceed available stock.';
  }
  if (!Number.isFinite(mocaQuantity) || mocaQuantity <= 0) {
    errors.mocaQuantityKg = 'MOCA quantity must be greater than 0.';
  } else if (
    selectedMoca &&
    mocaQuantity > Number(selectedMoca.availableQuantity || 0) + mocaAllowance
  ) {
    errors.mocaQuantityKg = 'MOCA quantity cannot exceed available stock.';
  }
  if (!form.productName.trim()) errors.productName = 'Product name is required.';
  if (!form.size.trim()) errors.size = 'Size is required.';
  if (!form.colour.trim()) errors.colour = 'Colour is required.';
  if (!['Per PCS', 'Per Kg'].includes(form.sellingUnit)) errors.sellingUnit = 'Selling unit is required.';
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = 'Quantity must be greater than 0.';
  if (!form.dateTime) errors.dateTime = 'Date and time is required.';

  return errors;
}

function PUProductManufacturingForm({
  initialBatch = null,
  mode = 'create',
  onSubmit,
  onSuccess,
}) {
  const [puChemicalStocks, setPuChemicalStocks] = useState([]);
  const [form, setForm] = useState(() => buildInitialForm(initialBatch));
  const [errors, setErrors] = useState({});
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const loadStocks = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const data = await fetchStocks();
      setPuChemicalStocks(data.puChemicals || []);
    } catch (error) {
      toast.error('Unable to load PU chemical stock', getApiErrorMessage(error));
    } finally {
      setLoadingStocks(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const stockOptions = useMemo(
    () => puChemicalStocks.map((stock) => ({ value: stock.id, label: `${stock.itemName} (${stock.unit})` })),
    [puChemicalStocks],
  );
  const selectedChemical = useMemo(
    () => puChemicalStocks.find((stock) => stock.id === form.puChemicalStockId),
    [form.puChemicalStockId, puChemicalStocks],
  );
  const selectedMoca = useMemo(
    () => puChemicalStocks.find((stock) => stock.id === form.mocaStockId),
    [form.mocaStockId, puChemicalStocks],
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(buildInitialForm(initialBatch));
    setErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form, selectedChemical, selectedMoca, initialBatch);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Unable to finish manufacturing', 'Fix the highlighted fields and try again.');
      return;
    }

    setSaving(true);
    try {
      const response = await onSubmit({
        puChemicalStockId: form.puChemicalStockId,
        chemicalQuantityKg: Number(form.chemicalQuantityKg),
        mocaStockId: form.mocaStockId,
        mocaQuantityKg: Number(form.mocaQuantityKg),
        productName: form.productName.trim(),
        size: form.size.trim(),
        colour: form.colour.trim(),
        drawingNumber: form.drawingNumber.trim(),
        photo: form.photo.trim(),
        sellingUnit: form.sellingUnit,
        quantity: Number(form.quantity),
        itemNumber: form.itemNumber.trim(),
        dateTime: new Date(form.dateTime).toISOString(),
        remarks: form.remarks.trim(),
      });
      toast.success(
        mode === 'edit' ? 'Manufacturing updated' : 'Manufacturing finished',
        'PU chemical stock and product stock were updated.',
      );
      if (mode === 'create') setForm(buildInitialForm());
      setErrors({});
      await loadStocks();
      onSuccess?.(response);
    } catch (error) {
      toast.error('Unable to finish manufacturing', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 5</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">
              {mode === 'edit' ? 'Edit PU Product Manufacturing' : 'PU Product Manufacturing'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Consume PU chemical and MOCA stock to create finished PU product inventory.
            </p>
          </div>
          <Factory className="h-10 w-10 text-primary" />
        </div>
      </section>

      <section className="panel p-6">
        <div className="border-b border-border pb-4">
          <h2 className="section-title">Chemical Consumption</h2>
          <p className="section-copy mt-2">Select stock entries and record consumed quantities.</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Select label="PU Chemical" disabled={loadingStocks} options={stockOptions} value={form.puChemicalStockId} error={errors.puChemicalStockId} onChange={(event) => updateField('puChemicalStockId', event.target.value)} />

          <Input label="Available PU Chemical Stock" readOnly value={selectedChemical ? `${formatQuantity(selectedChemical.availableQuantity)} ${selectedChemical.unit}` : 'Select PU chemical'} />

          <Input label="Chemical Quantity (Kg)" type="number" min="0.01" step="0.01" value={form.chemicalQuantityKg} error={errors.chemicalQuantityKg} onChange={(event) => updateField('chemicalQuantityKg', event.target.value)} />

          <div className="hidden md:block" />
          <Select label="MOCA" disabled={loadingStocks} options={stockOptions} value={form.mocaStockId} error={errors.mocaStockId} onChange={(event) => updateField('mocaStockId', event.target.value)} />

          <Input label="Available MOCA Stock" readOnly value={selectedMoca ? `${formatQuantity(selectedMoca.availableQuantity)} ${selectedMoca.unit}` : 'Select MOCA'} />

          <Input label="MOCA Quantity (Kg)" type="number" min="0.01" step="0.01" value={form.mocaQuantityKg} error={errors.mocaQuantityKg} onChange={(event) => updateField('mocaQuantityKg', event.target.value)} />
          
          <Input label="Date & Time" type="datetime-local" value={form.dateTime} error={errors.dateTime} onChange={(event) => updateField('dateTime', event.target.value)} />
        </div>
      </section>

      <section className="panel p-6">
        <div className="border-b border-border pb-4">
          <h2 className="section-title">Finished Product</h2>
          <p className="section-copy mt-2">Record the finished PU product from this batch.</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Input label="Product Name" value={form.productName} error={errors.productName} onChange={(event) => updateField('productName', event.target.value)} />
          <Input label="Size" value={form.size} error={errors.size} onChange={(event) => updateField('size', event.target.value)} />
          <Input label="Colour" value={form.colour} error={errors.colour} onChange={(event) => updateField('colour', event.target.value)} />
          <Input label="Drawing No." placeholder="For new sizes" value={form.drawingNumber} onChange={(event) => updateField('drawingNumber', event.target.value)} />
          <Input label="Photo (URL/Description)" placeholder="Image URL or description" value={form.photo} onChange={(event) => updateField('photo', event.target.value)} />
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
            {mode === 'edit' ? 'Update Manufacturing' : 'Finish Manufacturing'}
          </Button>
        </div>
      </section>
    </form>
  );
}

export default PUProductManufacturingForm;
