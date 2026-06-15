/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { apiUrl } from './lib/apiBase';

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

function buildAlertBody(myToken: string, q: { id: string; currentNumber: string; counterInfo: string; name: string }): string {
  const target = parseToken(myToken);
  const current = parseToken(q.currentNumber);
  const roomMatch = q.counterInfo.match(/Room\s+([A-Za-z0-9]+)/i) || q.name.match(/ROOM\s+([A-Za-z0-9]+)/i);
  const room = roomMatch ? `Room ${roomMatch[1]}` : q.name;
  const tokensLeft = target !== null && current !== null ? Math.max(0, target - current) : null;
  if (tokensLeft === 0) return `Your turn! Now serving ${q.currentNumber} · ${room}`;
  if (tokensLeft !== null) {
    const ahead = tokensLeft === 1 ? '1 ahead' : `${tokensLeft} ahead`;
    return `Now ${q.currentNumber} · ${room} · ${ahead}`;
  }
  return `Now serving ${q.currentNumber} · ${room}. Your token: ${myToken}.`;
}

async function pollQueues() {
  if (!tracking) return;
  const path = API_PATHS[tracking.source];
  if (!path) return;

  try {
    const res = await fetch(apiUrl(path), { cache: 'no-store' });
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
          body: buildAlertBody(tracking.myToken, q),
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
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
  pollTimer = setInterval(pollQueues, 5000);
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
