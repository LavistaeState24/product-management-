const TOKEN_KEY = 'crm_access_token';
const DISMISSED_ALERTS_KEY = 'crm_dismissed_alert_ids';

function readDismissedAlertIds() {
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getDismissedAlertIds() {
    return readDismissedAlertIds();
  },
  addDismissedAlertId(id) {
    try {
      const ids = new Set(readDismissedAlertIds());
      ids.add(id);
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...ids]));
    } catch {
      // Ignore storage failures; dismissal is a local convenience only.
    }
  },
};
