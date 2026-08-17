export const LAST_SEEN_UPDATE_INTERVAL_MS = 60 * 1000;
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isUserOnline(user, now = new Date()) {
  if (!user?.lastSeenAt) {
    return false;
  }

  return now.getTime() - new Date(user.lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
}
