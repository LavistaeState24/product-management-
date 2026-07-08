import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SaleForm from '@/features/sales/components/SaleForm';
import SalesPageSkeleton from '@/features/sales/components/SalesPageSkeleton';
import { createSale, fetchSaleFormOptions } from '@/features/sales/services/saleService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { toDateInputValue } from '@/features/sales/utils/saleHelpers';

const defaultValues = {
  invoiceNumber: '',
  invoiceDate: toDateInputValue(new Date()),
  customerName: '',
  productName: '',
  quantity: '1',
  sellingPrice: '',
  paymentType: 'Cash',
  paidAmount: '',
  notes: '',
};

function AddSalePage() {
  const [options, setOptions] = useState({ customers: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        const data = await fetchSaleFormOptions();

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
      const response = await createSale(values);
      toast.success('Sale created', 'Stock and customer receivables were updated.');
      navigate(`/sales/${response.sale.id}`);
    } catch (error) {
      toast.error('Unable to create sale', getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <SalesPageSkeleton />;
  }

  return (
    <SaleForm
      title="Add Sale"
      description="Create a new sales invoice and apply its stock and receivable impact."
      submitLabel="Save Sale"
      initialValues={defaultValues}
      customers={options.customers}
      products={options.products}
      loading={submitting}
      onSubmit={handleSubmit}
    />
  );
}

export default AddSalePage;
