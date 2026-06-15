import { UserTracking, SiteSource, Queue } from '../types';

const ICON = '/icons/icon-192.png';

export type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getNotificationState(): NotificationState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationState;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    await registerSW({ immediate: true });
    return await navigator.serviceWorker.ready;
  } catch {
    return navigator.serviceWorker?.ready ?? null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationState> {
  if (!('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  await registerServiceWorker();
  return result as NotificationState;
}

export async function showAlert(
  title: string,
  body: string,
  options?: { tag?: string; url?: string }
): Promise<boolean> {
  if (Notification.permission !== 'granted') return false;

  const payload = {
    body,
    icon: ICON,
    badge: ICON,
    tag: options?.tag || `quepulse-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: { url: options?.url || '/' },
  } as NotificationOptions & { renotify?: boolean };

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, payload);
    } else {
      new Notification(title, payload);
    }
    if ('vibrate' in navigator) navigator.vibrate([180, 80, 180]);
    return true;
  } catch {
    try {
      new Notification(title, { body, icon: ICON });
      return true;
    } catch {
      return false;
    }
  }
}

export async function testNotification(): Promise<{ ok: boolean; message: string }> {
  const state = getNotificationState();
  if (state === 'unsupported') {
    return { ok: false, message: 'Notifications not supported on this device.' };
  }
  if (state === 'denied') {
    return { ok: false, message: 'Notifications blocked. Enable them in browser/app settings.' };
  }
  if (state === 'default') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      return { ok: false, message: 'Permission denied. Allow notifications to get queue alerts.' };
    }
  }
  const sent = await showAlert('QuePulse Test', 'Alerts are working! You will be notified when your token is near.', {
    tag: 'quepulse-test',
  });
  return sent
    ? { ok: true, message: 'Test notification sent!' }
    : { ok: false, message: 'Could not display notification.' };
}

export function syncTrackingToServiceWorker(tracking: UserTracking | null) {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: 'SYNC_TRACKING',
    tracking,
  });
}

export function parseTokenNumber(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? null : n;
}

export function checkTrackingAlert(
  tracking: UserTracking,
  queues: Queue[],
  lastAlertId: string | null
): { shouldAlert: boolean; alertId: string; title: string; body: string; queueName?: string } | null {
  const target = parseTokenNumber(tracking.myToken);
  if (target === null) return null;

  const evaluate = (q: Queue) => {
    const current = parseTokenNumber(q.currentNumber);
    if (current === null) return null;
    const diff = target - current;
    if (diff < 0 || diff > tracking.notifyThreshold) return null;
    const alertId = `${tracking.isGlobal ? 'global' : tracking.queueId}-${q.id}-${q.currentNumber}`;
    if (alertId === lastAlertId) return null;
    return {
      shouldAlert: true,
      alertId,
      title: tracking.isGlobal ? `Token near at ${q.name}` : `Your turn is near!`,
      body: `Now serving ${q.currentNumber} at ${q.name}. Your token: ${tracking.myToken}.`,
      queueName: q.name,
    };
  };

  if (tracking.isGlobal) {
    for (const q of queues) {
      const hit = evaluate(q);
      if (hit) return hit;
    }
    return null;
  }

  const matched = queues.find((q) => q.id === tracking.queueId);
  if (!matched) return null;
  return evaluate(matched);
}

export const HOSPITAL_API: Record<SiteSource, string> = {
  hmh: '/api/hmh/queues',
  adk: '/api/adk/queues',
  vitalcare: '/api/vitalcare/tokens',
  igmh: '/api/igmh/queues',
  vilimale: '/api/vilimale/queues',
  dharumavantha: '/api/dharumavantha/queues',
  urh: '/api/urh/queues',
  fah: '/api/fah/queues',
  shah: '/api/shah/queues',
};
