/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { apiUrl } from './lib/apiBase';
import { buildTrackingStatus, findTrackedQueue, getServingKey } from './lib/trackingStatus';
import type { UserTracking } from './types';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const API_PATHS: Record<string, string> = {
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

const LIVE_TAG = 'quepulse-live';
const SERVING_TAG = 'quepulse-serving';
const POLL_MS = 5_000;

let tracking: UserTracking | null = null;
let lastServingKey: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function showTrackingNotification(
  title: string,
  body: string,
  tag: string,
  options?: { silent?: boolean }
) {
  await self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag,
    renotify: !options?.silent,
    silent: options?.silent,
    data: { url: tracking ? `/?hospital=${tracking.source}` : '/' },
  } as NotificationOptions);
}

async function clearTrackingNotifications() {
  const notifications = await self.registration.getNotifications();
  for (const notification of notifications) {
    if (notification.tag === LIVE_TAG || notification.tag === SERVING_TAG) {
      notification.close();
    }
  }
}

async function pollQueues() {
  if (!tracking) return;
  const path = API_PATHS[tracking.source];
  if (!path) return;

  try {
    const res = await fetch(apiUrl(path), { cache: 'no-store' });
    const queues = await res.json();
    if (!Array.isArray(queues)) return;

    const queue = findTrackedQueue(tracking, queues);
    if (!queue) return;

    const status = buildTrackingStatus(tracking, queue);
    const servingKey = getServingKey(queue);
    const alwaysOn = !!tracking.alwaysOnNotifications;

    if (alwaysOn) {
      const isUpdate = lastServingKey !== null;
      await showTrackingNotification(status.title, status.body, LIVE_TAG, { silent: isUpdate });
      lastServingKey = servingKey;
      return;
    }

    if (lastServingKey !== null && lastServingKey !== servingKey) {
      await clearTrackingNotifications();
      await showTrackingNotification(status.title, status.body, SERVING_TAG);
    }
    lastServingKey = servingKey;
  } catch {
    // retry on next interval
  }
}

function startPolling() {
  stopPolling(false);
  pollTimer = setInterval(pollQueues, POLL_MS);
  pollQueues();
}

function stopPolling(clearNotifications = true) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  lastServingKey = null;
  if (clearNotifications) void clearTrackingNotifications();
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data?.type === 'SYNC_TRACKING') {
    tracking = data.tracking ?? null;
    if (tracking) startPolling();
    else stopPolling();
    return;
  }
  if (data?.type === 'CLEAR_TRACKING_NOTIFICATIONS') {
    void clearTrackingNotifications();
    lastServingKey = null;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
