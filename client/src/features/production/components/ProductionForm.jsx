import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { fetchStocks } from '@/features/stock/services/stockService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

export function toDateTimeLocalValue(value = new Date()) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export function formatQuantity(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function buildInitialForm(config, initialBatch) {
  const dateTime = toDateTimeLocalValue(initialBatch?.dateTime || new Date());

  if (initialBatch) {
    return {
      rawMaterialStockId:
        typeof initialBatch.rawMaterialStockId === 'object'
          ? initialBatch.rawMaterialStockId?._id || initialBatch.rawMaterialStockId?.id || ''
          : initialBatch.rawMaterialStockId || '',
      quantityUsed: String(initialBatch.quantityUsed || ''),
      dateTime,
      remarks: initialBatch.remarks || '',
      rows: (initialBatch[config.collectionKey] || []).map((row) => ({
        ...config.normalizeInitialRow(row),
        id: crypto.randomUUID(),
        isManualItemNumber: true,
      })),
    };
  }

  return {
    rawMaterialStockId: '',
    quantityUsed: '',
    dateTime,
    remarks: '',
    rows: [config.createEmptyRow(0, dateTime)],
  };
}

function validateForm(form, selectedStock, config) {
  const errors = {};
  const rowErrors = {};
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

  if (!form.rows.length) {
    errors.rows = config.emptyRowsMessage;
  }

  form.rows.forEach((row) => {
    const currentRowErrors = {};
    const itemNumber = row.itemNumber.trim();

    config.fields.forEach((field) => {
      const rawValue = row[field.key];

      if (field.required && !String(rawValue || '').trim()) {
        currentRowErrors[field.key] = `${field.validationLabel} is required.`;
      }

      if (field.type === 'number') {
        const numberValue = Number(rawValue);
        if (!Number.isFinite(numberValue) || numberValue <= 0) {
          currentRowErrors[field.key] = `${field.validationLabel} must be greater than 0.`;
        }
      }
    });

    if (itemNumber) {
      if (itemNumbers.has(itemNumber.toLowerCase())) {
        currentRowErrors.itemNumber = 'Duplicate item number.';
      }

      itemNumbers.add(itemNumber.toLowerCase());
    }

    if (Object.keys(currentRowErrors).length) {
      rowErrors[row.id] = currentRowErrors;
    }
  });

  if (Object.keys(rowErrors).length) {
    errors.rowErrors = rowErrors;
  }

  return errors;
}

function ProductionForm({
  config,
  initialBatch = null,
  mode = 'create',
  onSubmit,
  onSuccess,
}) {
  const [rawMaterialStocks, setRawMaterialStocks] = useState([]);
  const [form, setForm] = useState(() => buildInitialForm(config, initialBatch));
  const [errors, setErrors] = useState({});
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const Icon = config.icon;

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
        rows: current.rows.map((row, index) =>
          row.isManualItemNumber
            ? row
            : { ...row, itemNumber: config.generateItemNumber(index, value) },
        ),
      };
    });
  }

  function updateRow(rowId, field, value) {
    setForm((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
              ...(field === 'itemNumber' ? { isManualItemNumber: true } : {}),
            }
          : row,
      ),
    }));
  }

  function addRow() {
    setForm((current) => ({
      ...current,
      rows: [...current.rows, config.createEmptyRow(current.rows.length, current.dateTime)],
    }));
  }

  function removeRow(rowId) {
    setForm((current) => {
      const rows = current.rows.filter((row) => row.id !== rowId);

      return {
        ...current,
        rows: rows.map((row, index) =>
          row.isManualItemNumber
            ? row
            : { ...row, itemNumber: config.generateItemNumber(index, current.dateTime) },
        ),
      };
    });
  }

  function resetForm() {
    setForm(buildInitialForm(config, initialBatch));
    setErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm(form, selectedStock, config);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast.error(config.submitErrorTitle, 'Fix the highlighted fields and try again.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        rawMaterialStockId: form.rawMaterialStockId,
        quantityUsed: Number(form.quantityUsed),
        dateTime: new Date(form.dateTime).toISOString(),
        remarks: form.remarks.trim(),
        [config.collectionKey]: form.rows.map(config.mapRowToPayload),
      };

      const response = await onSubmit(payload);

      toast.success(config.successTitle, config.successDescription);

      if (mode === 'create') {
        setForm(buildInitialForm(config));
      }

      setErrors({});
      await loadStocks();
      onSuccess?.(response);
    } catch (error) {
      toast.error(config.submitErrorTitle, getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">
              {config.moduleLabel}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-heading">{config.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">{config.description}</p>
          </div>
          <Icon className="h-10 w-10 text-primary" />
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
            <h2 className="section-title">{config.producedTitle}</h2>
            <p className="section-copy mt-2">{config.producedDescription}</p>
          </div>
          <Button type="button" variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>

        {errors.rows ? (
          <p className="mt-4 text-sm font-medium text-danger">{errors.rows}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[980px] w-full divide-y divide-border rounded-3xl border border-border bg-card">
            <thead className="bg-background">
              <tr>
                {config.fields.map((field) => (
                  <th
                    key={field.key}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-body"
                  >
                    {field.heading}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-body" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {form.rows.map((row) => {
                const currentRowErrors = errors.rowErrors?.[row.id] || {};

                return (
                  <tr key={row.id} className="align-top">
                    {config.fields.map((field) => (
                      <td key={field.key} className="px-4 py-4">
                        <input
                          className={`h-10 w-full rounded-2xl border bg-card px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                            currentRowErrors[field.key] ? 'border-danger' : 'border-border'
                          }`}
                          type={field.type === 'number' ? 'number' : 'text'}
                          min={field.min}
                          step={field.step}
                          value={row[field.key]}
                          onChange={(event) => updateRow(row.id, field.key, event.target.value)}
                          placeholder={field.placeholder}
                        />
                        {currentRowErrors[field.key] ? (
                          <p className="mt-1 text-xs font-medium text-danger">
                            {currentRowErrors[field.key]}
                          </p>
                        ) : field.key === 'itemNumber' ? (
                          <p className="mt-1 text-xs text-body">
                            {row.isManualItemNumber ? 'Manual override' : 'Auto-generated'}
                          </p>
                        ) : null}
                      </td>
                    ))}
                    <td className="px-4 py-4 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={form.rows.length === 1}
                        onClick={() => removeRow(row.id)}
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
            {mode === 'edit' ? config.updateButtonLabel : config.submitButtonLabel}
          </Button>
        </div>
      </section>
    </form>
  );
}

export default ProductionForm;
