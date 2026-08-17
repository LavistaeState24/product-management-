function toId(value) {
  return value?._id || value || null;
}

function serializeDailyUpdates(order) {
  return (order.dailyUpdates || []).map((update) => ({
    note: update.note,
    createdBy: toId(update.createdBy),
    createdAt: update.createdAt,
  }));
}

function serializeProductReference(productReference) {
  if (!productReference?.key) {
    return null;
  }

  return {
    url: productReference.url || null,
    key: productReference.key,
    originalName: productReference.originalName || '',
    mimeType: productReference.mimeType || '',
    size: productReference.size ?? 0,
  };
}

function serializeProductionItem(item) {
  return {
    itemDesc: item.itemDesc,
    size: item.size || '',
    colour: item.colour || '',
    hardness: item.hardness || '',
    quantity: item.quantity,
    itemNo: item.itemNo || '',
    stockType: item.stockType,
    stockRef: item.stockRef || null,
  };
}

export function serializeOrderForProduction(order) {
  return {
    id: toId(order),
    orderNo: order.orderNo,
    items: (order.items || []).map(serializeProductionItem),
    remarks: order.remarks || '',
    productReference: serializeProductReference(order.productReference),
    status: order.status,
    readyByDate: order.readyByDate || null,
    dailyUpdates: serializeDailyUpdates(order),
    acceptedAt: order.acceptedAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function serializeOrderForBoss(order) {
  return {
    ...serializeOrderForProduction(order),
    clientName: order.clientName,
    clientMobile: order.clientMobile,
    readyDays: order.readyDays ?? null,
    dispatchedAt: order.dispatchedAt || null,
    createdBy: toId(order.createdBy),
    items: (order.items || []).map((item) => ({
      ...serializeProductionItem(item),
      rate: item.rate,
    })),
  };
}
