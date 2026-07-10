import { useCallback, useEffect, useMemo, useState } from 'react';
import { Factory, Plus, RotateCcw, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { fetchStocks } from '@/features/stock/services/stockService';
import { createRodProduction } from '@/features/rod-productions/services/rodProductionService';

function toDateTimeLocalValue(value = new Date()) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatQuantity(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function createEmptyRod(index, dateTime = new Date()) {
  return {
    id: crypto.randomUUID(),
    item: '',
    size: '',
    weightKg: '',
    colour: '',
    quantity: '1',
    itemNumber: generateItemNumber(index, dateTime),
    isManualItemNumber: false,
  };
}

function generateItemNumber(index, dateTime) {
  const date = new Date(dateTime || Date.now());
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `ROD-${year}${month}${day}-${String(index + 1).padStart(3, '0')}`;
}

function buildInitialForm() {
  const dateTime = toDateTimeLocalValue();

  return {
    rawMaterialStockId: '',
    quantityUsed: '',
    dateTime,
    remarks: '',
    rods: [createEmptyRod(0, dateTime)],
  };
}

function validateForm(form, selectedStock) {
  const errors = {};
  const rodErrors = {};
  const itemNumbers = new Set();

  if (!form.rawMaterialStockId) {
    errors.rawMaterialStockId = 'Raw material item is required.';
  }

  const quantityUsed = Number(form.quantityUsed);

  if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) {
    errors.quantityUsed = 'Quantity used must be greater than 0.';
  } else if (selectedStock && quantityUsed > Number(selectedStock.availableQuantity || 0)) {
    errors.quantityUsed = 'Quantity used cannot exceed available stock.';
  }

  if (!form.dateTime) {
    errors.dateTime = 'Date and time is required.';
  }

  if (!form.rods.length) {
    errors.rods = 'At least one rod row is required.';
  }

  form.rods.forEach((rod) => {
    const rowErrors = {};
    const itemNumber = rod.itemNumber.trim();

    if (!rod.item.trim()) rowErrors.item = 'Item is required.';
    if (!rod.size.trim()) rowErrors.size = 'Size is required.';
    if (!rod.colour.trim()) rowErrors.colour = 'Colour is required.';
    if (!itemNumber) rowErrors.itemNumber = 'Item number is required.';

    const weightKg = Number(rod.weightKg);
    const quantity = Number(rod.quantity);

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      rowErrors.weightKg = 'Weight must be greater than 0.';
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      rowErrors.quantity = 'Quantity must be greater than 0.';
    }

    if (itemNumber) {
      if (itemNumbers.has(itemNumber.toLowerCase())) {
        rowErrors.itemNumber = 'Duplicate item number.';
      }

      itemNumbers.add(itemNumber.toLowerCase());
    }

    if (Object.keys(rowErrors).length) {
      rodErrors[rod.id] = rowErrors;
    }
  });

  if (Object.keys(rodErrors).length) {
    errors.rodRows = rodErrors;
  }

  return errors;
}

function RodProductionPage() {
  const [rawMaterialStocks, setRawMaterialStocks] = useState([]);
  const [form, setForm] = useState(() => buildInitialForm());
  const [errors, setErrors] = useState({});
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const loadStocks = useCallback(async () => {
    setLoadingStocks(true);

    try {
      const data = await fetchStocks();
      setRawMaterialStocks(data.rawMaterials || []);
    } catch (error) {
      toast.error('Unable to load raw material stock', getApiErrorMessage(error));
    } finally {
      setLoadingStocks(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const selectedStock = useMemo(
    () => rawMaterialStocks.find((stock) => stock.id === form.rawMaterialStockId),
    [form.rawMaterialStockId, rawMaterialStocks],
  );

  function updateField(field, value) {
    setForm((current) => {
      if (field !== 'dateTime') {
        return { ...current, [field]: value };
      }

      return {
        ...current,
        dateTime: value,
        rods: current.rods.map((rod, index) =>
          rod.isManualItemNumber
            ? rod
            : { ...rod, itemNumber: generateItemNumber(index, value) },
        ),
      };
    });
  }

  function updateRod(rowId, field, value) {
    setForm((current) => ({
      ...current,
      rods: current.rods.map((rod) =>
        rod.id === rowId
          ? {
              ...rod,
              [field]: value,
              ...(field === 'itemNumber' ? { isManualItemNumber: true } : {}),
            }
          : rod,
      ),
    }));
  }

  function addRodRow() {
    setForm((current) => ({
      ...current,
      rods: [...current.rods, createEmptyRod(current.rods.length, current.dateTime)],
    }));
  }

  function removeRodRow(rowId) {
    setForm((current) => {
      const rods = current.rods.filter((rod) => rod.id !== rowId);

      return {
        ...current,
        rods: rods.map((rod, index) =>
          rod.isManualItemNumber
            ? rod
            : { ...rod, itemNumber: generateItemNumber(index, current.dateTime) },
        ),
      };
    });
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
      toast.error('Unable to finish production', 'Fix the highlighted fields and try again.');
      return;
    }

    setSaving(true);

    try {
      await createRodProduction({
        rawMaterialStockId: form.rawMaterialStockId,
        quantityUsed: Number(form.quantityUsed),
        dateTime: new Date(form.dateTime).toISOString(),
        remarks: form.remarks.trim(),
        rods: form.rods.map((rod) => ({
          item: rod.item.trim(),
          size: rod.size.trim(),
          weightKg: Number(rod.weightKg),
          colour: rod.colour.trim(),
          quantity: Number(rod.quantity),
          itemNumber: rod.itemNumber.trim(),
          isManualItemNumber: rod.isManualItemNumber,
        })),
      });

      toast.success('Production finished', 'Rod stock and raw material consumption were updated.');
      resetForm();
      await loadStocks();
    } catch (error) {
      toast.error('Unable to finish production', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Module 2</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Rod Production</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Consume raw material stock and create finished rod inventory in one production batch.
            </p>
          </div>
          <Factory className="h-10 w-10 text-primary" />
        </div>
      </section>

      <section className="panel p-6">
        <div className="border-b border-border pb-4">
          <h2 className="section-title">Raw Material Consumption</h2>
          <p className="section-copy mt-2">
            Select the raw material stock entry and record the quantity consumed.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-semibold text-heading">Raw Material Item</span>
            <select
              className={`h-12 rounded-2xl border bg-card px-4 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                errors.rawMaterialStockId ? 'border-danger' : 'border-border'
              }`}
              disabled={loadingStocks}
              value={form.rawMaterialStockId}
              onChange={(event) => updateField('rawMaterialStockId', event.target.value)}
            >
              <option value="">
                {loadingStocks ? 'Loading raw material stock...' : 'Select raw material'}
              </option>
              {rawMaterialStocks.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.itemName} ({stock.unit})
                </option>
              ))}
            </select>
            {errors.rawMaterialStockId ? (
              <span className="text-xs font-medium text-danger">
                {errors.rawMaterialStockId}
              </span>
            ) : null}
          </label>

          <Input
            label="Available Stock"
            readOnly
            value={
              selectedStock
                ? `${formatQuantity(selectedStock.availableQuantity)} ${selectedStock.unit}`
                : 'Select a raw material item'
            }
          />

          <Input
            label="Quantity Used (Kg)"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
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

          <Textarea
            label="Remarks"
            className="md:col-span-2"
            placeholder="Add production remarks"
            value={form.remarks}
            onChange={(event) => updateField('remarks', event.target.value)}
          />
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Rod Production</h2>
            <p className="section-copy mt-2">
              Add each rod item produced in this batch before finishing production.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={addRodRow}>
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>

        {errors.rods ? (
          <p className="mt-4 text-sm font-medium text-danger">{errors.rods}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[980px] w-full divide-y divide-border rounded-3xl border border-border bg-card">
            <thead className="bg-background">
              <tr>
                {['Item', 'Size', 'Weight (Kg)', 'Colour', 'Quantity', 'Item Number', ''].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-body"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {form.rods.map((rod) => {
                const rowErrors = errors.rodRows?.[rod.id] || {};

                return (
                  <tr key={rod.id} className="align-top">
                    <td className="px-4 py-4">
                      <input
                        className={`h-10 w-full rounded-2xl border bg-card px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                          rowErrors.item ? 'border-danger' : 'border-border'
                        }`}
                        value={rod.item}
                        onChange={(event) => updateRod(rod.id, 'item', event.target.value)}
                        placeholder="Rod item"
                      />
                      {rowErrors.item ? (
                        <p className="mt-1 text-xs font-medium text-danger">{rowErrors.item}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className={`h-10 w-full rounded-2xl border bg-card px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                          rowErrors.size ? 'border-danger' : 'border-border'
                        }`}
                        value={rod.size}
                        onChange={(event) => updateRod(rod.id, 'size', event.target.value)}
                        placeholder="Size"
                      />
                      {rowErrors.size ? (
                        <p className="mt-1 text-xs font-medium text-danger">{rowErrors.size}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className={`h-10 w-full rounded-2xl border bg-card px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                          rowErrors.weightKg ? 'border-danger' : 'border-border'
                        }`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={rod.weightKg}
                        onChange={(event) => updateRod(rod.id, 'weightKg', event.target.value)}
                        placeholder="0.00"
                      />
                      {rowErrors.weightKg ? (
                        <p className="mt-1 text-xs font-medium text-danger">
                          {rowErrors.weightKg}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className={`h-10 w-full rounded-2xl border bg-card px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                          rowErrors.colour ? 'border-danger' : 'border-border'
                        }`}
                        value={rod.colour}
                        onChange={(event) => updateRod(rod.id, 'colour', event.target.value)}
                        placeholder="Colour"
                      />
                      {rowErrors.colour ? (
                        <p className="mt-1 text-xs font-medium text-danger">
                          {rowErrors.colour}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className={`h-10 w-full rounded-2xl border bg-card px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                          rowErrors.quantity ? 'border-danger' : 'border-border'
                        }`}
                        type="number"
                        min="1"
                        step="1"
                        value={rod.quantity}
                        onChange={(event) => updateRod(rod.id, 'quantity', event.target.value)}
                        placeholder="1"
                      />
                      {rowErrors.quantity ? (
                        <p className="mt-1 text-xs font-medium text-danger">
                          {rowErrors.quantity}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className={`h-10 w-full rounded-2xl border bg-card px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                          rowErrors.itemNumber ? 'border-danger' : 'border-border'
                        }`}
                        value={rod.itemNumber}
                        onChange={(event) => updateRod(rod.id, 'itemNumber', event.target.value)}
                        placeholder="Item number"
                      />
                      {rowErrors.itemNumber ? (
                        <p className="mt-1 text-xs font-medium text-danger">
                          {rowErrors.itemNumber}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-body">
                          {rod.isManualItemNumber ? 'Manual override' : 'Auto-generated'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={form.rods.length === 1}
                        onClick={() => removeRodRow(rod.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button type="submit" loading={saving}>
            Finish Production
          </Button>
        </div>
      </section>
    </form>
  );
}

export default RodProductionPage;
