import { useNavigate } from 'react-router-dom';
import PUProductManufacturingForm from '@/features/pu-product-manufacturing/components/PUProductManufacturingForm';
import { createPUProductManufacturing } from '@/features/pu-product-manufacturing/services/puProductManufacturingService';

function AddPUProductManufacturingPage() {
  const navigate = useNavigate();

  return (
    <PUProductManufacturingForm
      onSubmit={createPUProductManufacturing}
      onSuccess={(response) => {
        if (response?.batch?.id) {
          navigate(`/pu-product-manufacturing/${response.batch.id}`);
        }
      }}
    />
  );
}

export default AddPUProductManufacturingPage;
