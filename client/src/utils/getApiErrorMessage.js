export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong.') {
  const response = error?.response?.data;

  if (Array.isArray(response?.errors) && response.errors.length) {
    return response.errors[0].message;
  }

  return response?.message || error?.message || fallbackMessage;
}
