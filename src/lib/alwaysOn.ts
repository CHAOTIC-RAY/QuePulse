const ALWAYS_ON_KEY = 'mv_queue_always_on';

export function getAlwaysOnNotifications(): boolean {
  try {
    return localStorage.getItem(ALWAYS_ON_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAlwaysOnNotifications(enabled: boolean): void {
  localStorage.setItem(ALWAYS_ON_KEY, enabled ? 'true' : 'false');
}
