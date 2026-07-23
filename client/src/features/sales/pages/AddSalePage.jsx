import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import SaleForm from '@/features/sales/components/SaleForm';
import SalesPageSkeleton from '@/features/sales/components/SalesPageSkeleton';
import {
  createSale,
  fetchSaleFormOptions,
} from '@/features/sales/services/saleService';
import { toDateInputValue } from '@/features/sales/utils/saleHelpers';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

const defaultValues = {
  invoiceNumber: '',
  invoiceDate: toDateInputValue(new Date()),
  customerName: '',
  customerMobile: '',
  customerAddress: '',
  customerLocation: '',
  customerGST: '',
  paymentType: 'Cash',
  paidAmount: '',
  creditDays: '',
  parcelCount: '',
  transportName: '',
  vehicleNumber: '',
  bankName: '',
  bankAccountNumber: '',
  bankIFSC: '',
  bankBranch: '',
  termsText: '',
  notes: '',
  items: [
    {
      stockType: '',
      stockRef: '',
      quantity: '1',
      sellingPrice: '',
      gstRate: '0',
    },
  ],
};

function AddSalePage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadInitialOptions() {
      try {
        const data = await fetchSaleFormOptions();

        if (!ignore) {
          setCustomers(
            Array.isArray(data?.customers)
              ? data.customers
              : [],
          );
        }
      } catch (error) {
        if (!ignore) {
          toast.error(
            'Unable to load form options',
            getApiErrorMessage(error),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitialOptions();

    return () => {
      ignore = true;
    };
  }, [toast]);

  async function handleSubmit(values) {
    setSubmitting(true);

    try {
      const response = await createSale(values);

      toast.success(
        'Sale created',
        'Stock and customer receivables were updated.',
      );

      const saleId =
        response?.sale?.id ||
        response?.sale?._id ||
        response?.data?.sale?.id ||
        response?.data?.sale?._id;

      navigate(
        saleId
          ? `/sales/${saleId}`
          : '/sales',
      );
    } catch (error) {
      toast.error(
        'Unable to create sale',
        getApiErrorMessage(error),
      );
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
      customers={customers}
      loading={submitting}
      onSubmit={handleSubmit}
    />
  );
}

export default AddSalePage;
