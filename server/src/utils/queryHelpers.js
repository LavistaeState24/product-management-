export function buildPagination({ page, limit, totalItems }) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  };
}

export function buildSearchFilter(search, fields) {
  if (!search) {
    return {};
  }

  const regex = new RegExp(search, 'i');

  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
}
