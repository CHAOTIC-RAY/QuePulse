/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { apiUrl } from './lib/apiBase';
import { checkTrackingAlert } from './lib/trackingStatus';
import type { Queue, UserTracking } from './types';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

type TrackingPayload = {
  source: string;
  queueId?: string;
  isGlobal?: boolean;
  myToken: string;
  notifyThreshold: number;
};

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
  asmh: '/api/asmh/queues',
};

let tracking: TrackingPayload | null = null;
let lastAlertId: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function trackingKey(value: TrackingPayload | null): string {
  if (!value) return '';
  return [value.source, value.queueId || '', value.isGlobal ? '1' : '0', value.myToken, String(value.notifyThreshold)].join('|');
}

async function pollQueues() {
  if (!tracking) return;
  const path = API_PATHS[tracking.source];
  if (!path) return;

  try {
    const res = await fetch(`${apiUrl(path)}?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data: unknown = await res.json();
    const queues: Queue[] | null = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { queues?: unknown }).queues)
        ? (data as { queues: Queue[] }).queues
        : null;
    if (!queues) return;

    const hit = checkTrackingAlert(tracking as UserTracking, queues, lastAlertId);
    if (!hit) return;
    lastAlertId = hit.alertId;

    await self.registration.showNotification(hit.title, {
      body: hit.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: hit.alertId,
      renotify: true,
      requireInteraction: true,
      data: { url: `/?hospital=${tracking.source}` },
    } as NotificationOptions);
  } catch {
    // retry on next interval
  }
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  lastAlertId = null;
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data?.type !== 'SYNC_TRACKING') return;

  const next = (data.tracking ?? null) as TrackingPayload | null;
  const same = trackingKey(tracking) === trackingKey(next);
  tracking = next;
  if (!tracking) {
    stopPolling();
    return;
  }
  if (!same) lastAlertId = null;
  if (!pollTimer) pollTimer = setInterval(() => void pollQueues(), 5000);
  void pollQueues();
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
