/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

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

const API_MAP: Record<string, string> = {
  hmh: '/api/hmh/queues',
  adk: '/api/adk/queues',
  vitalcare: '/api/vitalcare/tokens',
  igmh: '/api/igmh/queues',
  vilimale: '/api/vilimale/queues',
  dharumavantha: '/api/dharumavantha/queues',
};

let tracking: TrackingPayload | null = null;
let lastAlertId: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function parseToken(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? null : n;
}

async function pollQueues() {
  if (!tracking) return;
  const endpoint = API_MAP[tracking.source];
  if (!endpoint) return;

  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    const queues = await res.json();
    if (!Array.isArray(queues)) return;

    const target = parseToken(tracking.myToken);
    if (target === null) return;

    for (const q of queues) {
      if (!tracking.isGlobal && q.id !== tracking.queueId) continue;
      const current = parseToken(q.currentNumber);
      if (current === null) continue;
      const diff = target - current;
      if (diff < 0 || diff > tracking.notifyThreshold) continue;

      const alertId = `${tracking.isGlobal ? 'global' : tracking.queueId}-${q.id}-${q.currentNumber}`;
      if (alertId === lastAlertId) continue;
      lastAlertId = alertId;

      await self.registration.showNotification(
        tracking.isGlobal ? `Token near — ${q.name}` : 'Your turn is near!',
        {
          body: `Serving ${q.currentNumber} at ${q.name}. Your token: ${tracking.myToken}.`,
          icon: '/icons/icon.svg',
          badge: '/icons/icon.svg',
          tag: alertId,
          renotify: true,
          requireInteraction: true,
          data: { url: `/?hospital=${tracking.source}` },
        } as NotificationOptions
      );
      if (!tracking.isGlobal) break;
    }
  } catch {
    // retry on next interval
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollQueues, 12000);
  pollQueues();
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  lastAlertId = null;
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data?.type === 'SYNC_TRACKING') {
    tracking = data.tracking;
    if (tracking) startPolling();
    else stopPolling();
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
