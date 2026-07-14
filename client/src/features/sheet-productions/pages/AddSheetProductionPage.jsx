import { useNavigate } from 'react-router-dom';
import ProductionForm from '@/features/production/components/ProductionForm';
import { sheetProductionFormConfig } from '@/features/sheet-productions/config/sheetProductionConfig';
import { createSheetProduction } from '@/features/sheet-productions/services/sheetProductionService';

function AddSheetProductionPage() {
  const navigate = useNavigate();

  return (
    <ProductionForm
      config={sheetProductionFormConfig}
      onSubmit={(payload) => createSheetProduction(payload)}
      onSuccess={(response) => {
        if (response?.batch?.id) {
          navigate(`/sheet-productions/${response.batch.id}`);
        }
      }}
    />
  );
}

export default AddSheetProductionPage;
