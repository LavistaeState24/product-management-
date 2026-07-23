import { useEffect, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import SaleForm from '@/features/sales/components/SaleForm';
import SalesPageSkeleton from '@/features/sales/components/SalesPageSkeleton';
import {
  fetchSaleById,
  fetchSaleFormOptions,
  updateSale,
} from '@/features/sales/services/saleService';
import { toDateInputValue } from '@/features/sales/utils/saleHelpers';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

function getReferenceId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.id || value._id || '';
}

function mapSaleItemToFormItem(item) {
  return {
    stockType:
      item.stockType ||
      item.inventoryType ||
      'legacy-product',
    stockRef: getReferenceId(
      item.stockRef ||
        item.inventoryRef ||
        item.stock,
    ),
    quantity: String(item.quantity ?? ''),
    sellingPrice: String(
      item.sellingPrice ??
        item.unitPrice ??
        '',
    ),
    gstRate: String(item.gstRate ?? 0),
  };
}

function getSaleItems(sale) {
  if (
    Array.isArray(sale?.items) &&
    sale.items.length > 0
  ) {
    return sale.items.map(mapSaleItemToFormItem);
  }

  return [
    {
      stockType: 'legacy-product',
      stockRef: getReferenceId(
        sale.product ||
          sale.productId,
      ),
      quantity: String(sale.quantity ?? ''),
      sellingPrice: String(
        sale.sellingPrice ?? '',
      ),
      gstRate: String(sale.gstRate ?? 0),
    },
  ];
}

function mapSaleToFormValues(sale) {
  return {
    invoiceNumber: sale.invoiceNumber || '',
    invoiceDate: toDateInputValue(sale.invoiceDate),
    customerName:
      sale.customerName ||
      sale.customer?.name ||
      '',
    customerMobile: sale.customerMobile || '',
    customerAddress: sale.customerAddress || '',
    customerLocation: sale.customerLocation || '',
    customerGST: sale.customerGST || '',
    paymentType: sale.paymentType || 'Cash',
    paidAmount: String(sale.paidAmount ?? ''),
    creditDays: String(sale.creditDays || ''),
    parcelCount: String(sale.parcelCount || ''),
    transportName: sale.transportName || '',
    vehicleNumber: sale.vehicleNumber || '',
    bankDetails: sale.bankDetails || {},
    termsAndConditions: sale.termsAndConditions || [],
    notes: sale.notes || '',
    items: getSaleItems(sale),
  };
}

function EditSalePage() {
  const { saleId } = useParams();

  const [customers, setCustomers] = useState([]);
  const [initialValues, setInitialValues] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadPage() {
      try {
        const [
          optionsResponse,
          saleResponse,
        ] = await Promise.all([
          fetchSaleFormOptions(),
          fetchSaleById(saleId),
        ]);

        if (ignore) {
          return;
        }

        const sale =
          saleResponse?.sale ||
          saleResponse?.data?.sale ||
          saleResponse?.data ||
          saleResponse;

        if (!sale) {
          throw new Error('Sale record not found.');
        }

        const mappedValues =
          mapSaleToFormValues(sale);

        const customerOptions =
          optionsResponse?.customers ||
          optionsResponse?.data?.customers ||
          [];

        setCustomers(
          Array.isArray(customerOptions)
            ? customerOptions
            : [],
        );

        if (!ignore) {
          setInitialValues(mappedValues);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(
            'Unable to load sale',
            getApiErrorMessage(error),
          );

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
  }, [
    navigate,
    saleId,
    toast,
  ]);

  async function handleSubmit(values) {
    setSubmitting(true);

    try {
      const response = await updateSale(
        saleId,
        values,
      );

      toast.success(
        'Sale updated',
        'Stock and customer receivables were reconciled.',
      );

      const updatedSaleId =
        response?.sale?.id ||
        response?.sale?._id ||
        response?.data?.sale?.id ||
        response?.data?.sale?._id ||
        saleId;

      navigate(`/sales/${updatedSaleId}`);
    } catch (error) {
      toast.error(
        'Unable to update sale',
        getApiErrorMessage(error),
      );
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
      customers={customers}
      loading={submitting}
      onSubmit={handleSubmit}
    />
  );
}

export default EditSalePage;
