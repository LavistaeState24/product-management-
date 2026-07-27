import api from '@/services/api';

export async function fetchReport(reportKey, params) {
  const { data } = await api.get(`/reports/${reportKey}`, { params });
  return data;
}
