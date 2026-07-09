import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PurchaseForm from '@/features/purchases/components/PurchaseForm';
import PurchasePageSkeleton from '@/features/purchases/components/PurchasePageSkeleton';
import {
  fetchPurchaseById,
  fetchPurchaseFormOptions,
  updatePurchase,
} from '@/features/purchases/services/purchaseService';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import {
  resolveAssetUrl,
  toDateInputValue,
  toDateTimeDisplayValue,
} from '@/features/purchases/utils/purchaseHelpers';

function mapPurchaseToFormValues(purchase) {
  return {
    purchaseType: purchase.purchaseType || 'Raw Material',
    supplierName: purchase.supplierName || purchase.supplier.name,
    supplierAddress: purchase.supplierAddress || '',
    supplierLocation: purchase.supplierLocation || '',
    gstNo: purchase.gstNo || '',
    itemName: purchase.itemName || purchase.product.name,
    unit: purchase.unit || 'Kg',
    purchaseDate: toDateInputValue(purchase.purchaseDate),
    recordedAtDisplay: toDateTimeDisplayValue(purchase.recordedAt || purchase.createdAt),
    quantity: String(purchase.quantity),
    pricePerUnit: String(purchase.pricePerUnit ?? purchase.purchasePrice),
    gstType: purchase.gstType || 'None',
    gstRate: String(purchase.gstRate ?? 0),
    paymentType: purchase.paymentType,
    dueDate: toDateInputValue(purchase.dueDate || purchase.creditDueDate),
    paidAmount: String(purchase.paidAmount),
    remarks: purchase.remarks || purchase.notes || '',
    removeBill: false,
    billUpload: null,
    bill: purchase.bill
      ? {
          ...purchase.bill,
          url: resolveAssetUrl(purchase.bill.url),
        }
      : null,
  };
}

function EditPurchasePage() {
  const { purchaseId } = useParams();
  const [options, setOptions] = useState({ suppliers: [], products: [] });
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let ignore = false;

    async function loadPage() {
      try {
        const [optionsResponse, purchaseResponse] = await Promise.all([
          fetchPurchaseFormOptions(),
          fetchPurchaseById(purchaseId),
        ]);

        if (!ignore) {
          setOptions(optionsResponse);
          setInitialValues(mapPurchaseToFormValues(purchaseResponse.purchase));
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load purchase', getApiErrorMessage(error));
          navigate('/purchases');
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
  }, [navigate, purchaseId, toast]);

  async function handleSubmit(values) {
    setSubmitting(true);

    try {
      const response = await updatePurchase(purchaseId, {
        ...values,
        billUpload: values.billUpload?.[0] || null,
      });

      const stockMessage =
        values.purchaseType === 'PU Chemical'
          ? 'PU Chemical stock and payable values were reconciled.'
          : 'Raw material stock and payable values were reconciled.';

      toast.success('Purchase updated', stockMessage);
      navigate(`/purchases/${response.purchase.id}`);
    } catch (error) {
      toast.error('Unable to update purchase', getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !initialValues) {
    return <PurchasePageSkeleton />;
  }

  return (
    <PurchaseForm
      title="Edit Purchase"
      description="Update the purchase record. Stock changes are recalculated automatically."
      submitLabel="Update Purchase"
      initialValues={initialValues}
      suppliers={options.suppliers}
      products={options.products}
      loading={submitting}
      onSubmit={handleSubmit}
    />
  );
}

export default EditPurchasePage;