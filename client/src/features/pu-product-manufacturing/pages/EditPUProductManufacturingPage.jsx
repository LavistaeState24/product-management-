import { useEffect, useState } from 'react';
import { Factory } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingPage from '@/components/LoadingPage';
import EmptyState from '@/components/ui/EmptyState';
import PUProductManufacturingForm from '@/features/pu-product-manufacturing/components/PUProductManufacturingForm';
import {
  fetchPUProductManufacturingBatch,
  updatePUProductManufacturing,
} from '@/features/pu-product-manufacturing/services/puProductManufacturingService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function EditPUProductManufacturingPage() {
  const { manufacturingId } = useParams();
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
        const data = await fetchPUProductManufacturingBatch(manufacturingId);
        if (!ignore) {
          setBatch(data.batch);
        }
      } catch (error) {
        if (!ignore) {
          setNotFound(true);
          toast.error('Unable to load PU product manufacturing', getApiErrorMessage(error));
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
  }, [manufacturingId, toast]);

  if (loading) {
    return <LoadingPage />;
  }

  if (notFound || !batch) {
    return (
      <EmptyState
        title="PU product manufacturing not found"
        description="The selected manufacturing batch could not be loaded."
        icon={Factory}
      />
    );
  }

  return (
    <PUProductManufacturingForm
      initialBatch={batch}
      mode="edit"
      onSubmit={(values) => updatePUProductManufacturing(manufacturingId, values)}
      onSuccess={(response) => {
        const updatedId = response?.batch?.id || manufacturingId;
        navigate(`/pu-product-manufacturing/${updatedId}`);
      }}
    />
  );
}

export default EditPUProductManufacturingPage;
