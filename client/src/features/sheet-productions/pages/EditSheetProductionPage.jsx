import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingPage from '@/components/LoadingPage';
import EmptyState from '@/components/ui/EmptyState';
import ProductionForm from '@/features/production/components/ProductionForm';
import { sheetProductionFormConfig } from '@/features/sheet-productions/config/sheetProductionConfig';
import {
  fetchSheetProduction,
  updateSheetProduction,
} from '@/features/sheet-productions/services/sheetProductionService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function EditSheetProductionPage() {
  const { productionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadBatch() {
      setLoading(true);

      try {
        const data = await fetchSheetProduction(productionId);
        if (!ignore) {
          setBatch(data.batch);
        }
      } catch (error) {
        if (!ignore) {
          setNotFound(true);
          toast.error('Unable to load sheet production', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadBatch();

    return () => {
      ignore = true;
    };
  }, [productionId, toast]);

  if (loading) {
    return <LoadingPage />;
  }

  if (notFound || !batch) {
    return (
      <EmptyState
        title="Sheet production not found"
        description="The selected sheet production batch could not be loaded."
      />
    );
  }

  return (
    <ProductionForm
      key={batch.id}
      config={{
        ...sheetProductionFormConfig,
        title: 'Edit Sheet Production',
        successTitle: 'Production updated',
      }}
      mode="edit"
      initialBatch={batch}
      onSubmit={(payload) => updateSheetProduction(productionId, payload)}
      onSuccess={(response) => {
        if (response?.batch?.id) {
          navigate(`/sheet-productions/${response.batch.id}`);
        }
      }}
    />
  );
}

export default EditSheetProductionPage;
