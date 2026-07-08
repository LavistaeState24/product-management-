import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PurchaseForm from '@/features/purchases/components/PurchaseForm';
import PurchasePageSkeleton from '@/features/purchases/components/PurchasePageSkeleton';
import {
  createPurchase,
  fetchPurchaseFormOptions,
} from '@/features/purchases/services/purchaseService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import {
  toDateInputValue,
  toDateTimeDisplayValue,
} from '@/features/purchases/utils/purchaseHelpers';

function buildDefaultValues() {
  const now = new Date();

  return {
    supplierName: '',
    supplierAddress: '',
    supplierLocation: '',
    gstNo: '',
    itemName: '',
    unit: 'Kg',
    purchaseDate: toDateInputValue(now),
    recordedAtDisplay: toDateTimeDisplayValue(now),
    quantity: '1',
    pricePerUnit: '',
    gstType: 'None',
    gstRate: '0',
    paymentType: 'Cash',
    dueDate: '',
    paidAmount: '',
    remarks: '',
    removeBill: false,
    billUpload: null,
  };
}

function AddPurchasePage() {
  const [defaultValues] = useState(() => buildDefaultValues());
  const [options, setOptions] = useState({ suppliers: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        const data = await fetchPurchaseFormOptions();

        if (!ignore) {
          setOptions(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load form options', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadOptions();

    return () => {
      ignore = true;
    };
  }, [toast]);

  async function handleSubmit(values) {
    setSubmitting(true);

    try {
      const response = await createPurchase({
        ...values,
        billUpload: values.billUpload?.[0] || null,
      });
      toast.success('Purchase created', 'Raw material stock and payable balances were updated.');
      navigate(`/purchases/${response.purchase.id}`);
    } catch (error) {
      toast.error('Unable to create purchase', getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PurchasePageSkeleton />;
  }

  return (
    <PurchaseForm
      title="Add Raw Material Purchase"
      description="Create a raw material purchase and record the supplier bill against stock."
      submitLabel="Save Raw Material Purchase"
      initialValues={defaultValues}
      suppliers={options.suppliers}
      products={options.products}
      loading={submitting}
      onSubmit={handleSubmit}
    />
  );
}

export default AddPurchasePage;
