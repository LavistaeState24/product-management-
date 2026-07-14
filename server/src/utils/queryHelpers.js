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
    $or: fields.map((fieldConfig) => {
      if (typeof fieldConfig === 'string') {
        return { [fieldConfig]: regex };
      }

      if (fieldConfig.type === 'number') {
        return {
          $expr: {
            $regexMatch: {
              input: { $toString: `$${fieldConfig.field}` },
              regex: search,
              options: 'i',
            },
          },
        };
      }

      return { [fieldConfig.field]: regex };
    }),
  };
}
