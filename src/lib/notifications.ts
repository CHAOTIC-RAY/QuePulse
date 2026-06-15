import { LocalNotifications } from '@capacitor/local-notifications';
import { UserTracking, SiteSource, Queue } from '../types';
import { apiUrl } from './apiBase';
import { isNativeApp } from './platform';
import { extractRoomLabel } from './queueDisplay';
import { buildAlertBody } from './trackingStatus';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  updateBackgroundTracking,
} from './nativeTrackingService';

const ICON = '/icons/icon-192.png';
const ANDROID_CHANNEL_ID = 'queue-alerts';
export const TRACKING_STATUS_NOTIFICATION_ID = 10001;
export const TEST_NOTIFICATION_ID = 10099;
let nativeChannelReady = false;
let alwaysOnForegroundActive = false;

export type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied';

function mapNativePermission(display: string | undefined): NotificationState {
  if (display === 'granted') return 'granted';
  if (display === 'denied') return 'denied';
  return 'default';
}

async function ensureNativeChannel(): Promise<void> {
  if (!isNativeApp() || nativeChannelReady) return;
  await LocalNotifications.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Queue alerts',
    description: 'Alerts when your hospital token is near',
    importance: 5,
    visibility: 1,
    vibration: true,
    sound: 'default',
  });
  nativeChannelReady = true;
}

function notificationIdFromTag(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2_000_000_000 || 1;
}

export function getNotificationState(): NotificationState {
  if (isNativeApp()) return 'default';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationState;
}

export async function refreshNotificationState(): Promise<NotificationState> {
  if (isNativeApp()) {
    const { display } = await LocalNotifications.checkPermissions();
    return mapNativePermission(display);
  }
  return getNotificationState();
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isNativeApp()) {
    await ensureNativeChannel();
    return null;
  }
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
  if (isNativeApp()) {
    await ensureNativeChannel();
    const { display } = await LocalNotifications.requestPermissions();
    return mapNativePermission(display);
  }
  if (!('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  await registerServiceWorker();
  return result as NotificationState;
}

async function showNativeAlert(
  title: string,
  body: string,
  options?: { tag?: string; url?: string; id?: number }
): Promise<boolean> {
  const tag = options?.tag || `quepulse-${Date.now()}`;
  const id =
    options?.id ??
    (tag === 'quepulse-test' ? TEST_NOTIFICATION_ID : notificationIdFromTag(tag));

  await ensureNativeChannel();

  // Deliver immediately — do NOT set `schedule.at` (that uses exact alarms and often fails silently).
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        channelId: ANDROID_CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        iconColor: '#2563eb',
        extra: { url: options?.url || '/' },
      },
    ],
  });
  return true;
}

/** Single ongoing notification via foreground service (always-on mode only). */
export async function updateAlwaysOnNotification(title: string, body: string): Promise<void> {
  if (!isNativeApp()) return;

  const state = await refreshNotificationState();
  if (state !== 'granted') return;

  if (!alwaysOnForegroundActive) {
    await startBackgroundTracking(title, body);
    alwaysOnForegroundActive = true;
  } else {
    await updateBackgroundTracking(title, body);
  }
}

/** One-shot alert when the tracked room's serving number changes (always-on off). */
export async function showServingChangeAlert(title: string, body: string): Promise<void> {
  if (!isNativeApp()) return;

  const state = await refreshNotificationState();
  if (state !== 'granted') return;

  await ensureNativeChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: TRACKING_STATUS_NOTIFICATION_ID,
        title,
        body,
        channelId: ANDROID_CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        iconColor: '#2563eb',
        autoCancel: true,
      },
    ],
  });
}

export async function clearTrackingNotification(): Promise<void> {
  if (!isNativeApp()) return;
  alwaysOnForegroundActive = false;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: TRACKING_STATUS_NOTIFICATION_ID }],
    });
  } catch {
    // ignore
  }
  await stopBackgroundTracking();
}

export async function showAlert(
  title: string,
  body: string,
  options?: { tag?: string; url?: string }
): Promise<boolean> {
  if (isNativeApp()) {
    const state = await refreshNotificationState();
    if (state !== 'granted') return false;
    try {
      return await showNativeAlert(title, body, options);
    } catch (err) {
      console.error('showAlert native failed', err);
      return false;
    }
  }

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
  if (isNativeApp()) {
    try {
      const state = await refreshNotificationState();
      if (state === 'denied') {
        return { ok: false, message: 'Notifications blocked. Enable them in Android settings.' };
      }
      if (state !== 'granted') {
        const perm = await requestNotificationPermission();
        if (perm !== 'granted') {
          return { ok: false, message: 'Permission denied. Allow notifications to get queue alerts.' };
        }
      }

      await showNativeAlert(
        'QuePulse Test',
        'Alerts are working! You will be notified when your token is near.',
        { tag: 'quepulse-test', id: TEST_NOTIFICATION_ID }
      );
      return { ok: true, message: 'Test notification sent!' };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Could not display notification: ${detail}` };
    }
  }

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
  if (isNativeApp() || !navigator.serviceWorker?.controller) return;
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
      title: tracking.isGlobal ? `Token near — ${extractRoomLabel(q)}` : 'Your turn is near!',
      body: buildAlertBody(tracking, q),
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

const HOSPITAL_API_PATHS: Record<SiteSource, string> = {
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

export function getHospitalApiUrl(source: SiteSource): string {
  return apiUrl(HOSPITAL_API_PATHS[source]);
}

export const HOSPITAL_API: Record<SiteSource, string> = HOSPITAL_API_PATHS;
