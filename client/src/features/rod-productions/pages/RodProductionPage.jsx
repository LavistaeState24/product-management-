import { Factory } from 'lucide-react';
import ProductionForm from '@/features/production/components/ProductionForm';
import { createRodProduction } from '@/features/rod-productions/services/rodProductionService';

function generateItemNumber(index, dateTime) {
  const date = new Date(dateTime || Date.now());
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `ROD-${year}${month}${day}-${String(index + 1).padStart(3, '0')}`;
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

const rodProductionConfig = {
  moduleLabel: 'Module 2',
  title: 'Rod Production',
  description: 'Consume raw material stock and create finished rod inventory in one production batch.',
  producedTitle: 'Rod Production',
  producedDescription: 'Add each rod item produced in this batch before finishing production.',
  collectionKey: 'rods',
  emptyRowsMessage: 'At least one rod row is required.',
  icon: Factory,
  submitButtonLabel: 'Finish Production',
  updateButtonLabel: 'Update Production',
  submitErrorTitle: 'Unable to finish production',
  successTitle: 'Production finished',
  successDescription: 'Rod stock and raw material consumption were updated.',
  generateItemNumber,
  createEmptyRow: createEmptyRod,
  normalizeInitialRow: (row) => ({
    item: row.item || '',
    size: row.size || '',
    weightKg: String(row.weightKg || ''),
    colour: row.colour || '',
    quantity: String(row.quantity || '1'),
    itemNumber: row.itemNumber || '',
  }),
  mapRowToPayload: (rod) => ({
    item: rod.item.trim(),
    size: rod.size.trim(),
    weightKg: Number(rod.weightKg),
    colour: rod.colour.trim(),
    quantity: Number(rod.quantity),
    itemNumber: rod.itemNumber.trim(),
    isManualItemNumber: rod.isManualItemNumber,
  }),
  fields: [
    {
      key: 'item',
      heading: 'Item',
      placeholder: 'Rod item',
      required: true,
      validationLabel: 'Item',
    },
    {
      key: 'size',
      heading: 'Size',
      placeholder: 'Size',
      required: true,
      validationLabel: 'Size',
    },
    {
      key: 'weightKg',
      heading: 'Weight (Kg)',
      placeholder: '0.00',
      type: 'number',
      min: '0.01',
      step: '0.01',
      validationLabel: 'Weight',
    },
    {
      key: 'colour',
      heading: 'Colour',
      placeholder: 'Colour',
      required: true,
      validationLabel: 'Colour',
    },
    {
      key: 'quantity',
      heading: 'Quantity',
      placeholder: '1',
      type: 'number',
      min: '1',
      step: '1',
      validationLabel: 'Quantity',
    },
    {
      key: 'itemNumber',
      heading: 'Item Number',
      placeholder: 'Item number',
      required: true,
      validationLabel: 'Item number',
    },
  ],
};

function RodProductionPage() {
  return (
    <ProductionForm
      config={rodProductionConfig}
      onSubmit={(payload) => createRodProduction(payload)}
    />
  );
}

export default RodProductionPage;
