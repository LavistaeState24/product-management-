import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SaleForm from '@/features/sales/components/SaleForm';
import SalesPageSkeleton from '@/features/sales/components/SalesPageSkeleton';
import {
  fetchSaleById,
  fetchSaleFormOptions,
  updateSale,
} from '@/features/sales/services/saleService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { toDateInputValue } from '@/features/sales/utils/saleHelpers';

function mapSaleToFormValues(sale) {
  return {
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: toDateInputValue(sale.invoiceDate),
    customerName: sale.customer.name,
    productName: sale.product.name,
    quantity: String(sale.quantity),
    sellingPrice: String(sale.sellingPrice),
    paymentType: sale.paymentType,
    paidAmount: String(sale.paidAmount),
    notes: sale.notes || '',
  };
}

function EditSalePage() {
  const { saleId } = useParams();
  const [options, setOptions] = useState({ customers: [], products: [] });
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadPage() {
      try {
        const [optionsResponse, saleResponse] = await Promise.all([
          fetchSaleFormOptions(),
          fetchSaleById(saleId),
        ]);

        if (!ignore) {
          setOptions(optionsResponse);
          setInitialValues(mapSaleToFormValues(saleResponse.sale));
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load sale', getApiErrorMessage(error));
          navigate('/sales');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      ignore = true;
    };
  }, [navigate, saleId, toast]);

  async function handleSubmit(values) {
    setSubmitting(true);

    try {
      const response = await updateSale(saleId, values);
      toast.success('Sale updated', 'Stock and customer receivables were reconciled.');
      navigate(`/sales/${response.sale.id}`);
    } catch (error) {
      toast.error('Unable to update sale', getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !initialValues) {
    return <SalesPageSkeleton />;
  }

  return (
    <SaleForm
      title="Edit Sale"
      description="Update the sale invoice. Stock and receivable values are recalculated automatically."
      submitLabel="Update Sale"
      initialValues={initialValues}
      customers={options.customers}
      products={options.products}
      loading={submitting}
      onSubmit={handleSubmit}
    />
  );
}

export default EditSalePage;
