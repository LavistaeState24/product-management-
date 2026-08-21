import api from '@/services/api';

const dashboardCache = new Map();
const DASHBOARD_CACHE_TTL_MS = 15 * 1000;

function getDashboardCacheKey(params) {
  return JSON.stringify(params || {});
}

export async function fetchDashboard(params, options = {}) {
  const cacheKey = getDashboardCacheKey(params);
  const cached = dashboardCache.get(cacheKey);
  const now = Date.now();

  if (
    !options.force &&
    cached &&
    cached.data &&
    now - cached.timestamp < DASHBOARD_CACHE_TTL_MS
  ) {
    return cached.data;
  }

  if (!options.force && cached?.promise) {
    return cached.promise;
  }

  const promise = api
    .get('/dashboard', {
      params,
    })
    .then(({ data }) => {
      dashboardCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    })
    .catch((error) => {
      dashboardCache.delete(cacheKey);
      throw error;
    });

  dashboardCache.set(cacheKey, {
    promise,
    timestamp: now,
  });

  return promise;
}
