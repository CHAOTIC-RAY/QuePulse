import type { Queue, UserTracking } from '../types';
import { extractRoomLabel } from './queueDisplay';
import { getWaitEtaText, parseTokenNumber } from './queueTiming';

export type TrackingStatus = {
  title: string;
  body: string;
  tokensLeft: number | null;
  eta: string;
  room: string;
  currentNumber: string;
};

export function findTrackedQueue(tracking: UserTracking, queues: Queue[]): Queue | null {
  if (!tracking.isGlobal && tracking.queueId) {
    return queues.find((q) => q.id === tracking.queueId) ?? null;
  }

  const target = parseTokenNumber(tracking.myToken);
  if (target === null) return queues[0] ?? null;

  let best: Queue | null = null;
  let bestDiff = Infinity;

  for (const q of queues) {
    const current = parseTokenNumber(q.currentNumber);
    if (current === null) continue;
    const diff = target - current;
    if (diff >= 0 && diff < bestDiff) {
      bestDiff = diff;
      best = q;
    }
  }

  return best ?? queues[0] ?? null;
}

export function buildTrackingStatus(tracking: UserTracking, queue: Queue): TrackingStatus {
  const target = parseTokenNumber(tracking.myToken);
  const current = parseTokenNumber(queue.currentNumber);
  const tokensLeft =
    target !== null && current !== null ? Math.max(0, target - current) : null;
  const eta = getWaitEtaText(queue.id, tracking.myToken, queue.currentNumber);
  const room = extractRoomLabel(queue);

  const title = `QuePulse · Token ${tracking.myToken}`;
  let body: string;

  if (tokensLeft === 0) {
    body = `Your turn! Now serving ${queue.currentNumber} · ${room}`;
  } else if (tokensLeft !== null) {
    const ahead = tokensLeft === 1 ? '1 ahead' : `${tokensLeft} ahead`;
    body = `Now ${queue.currentNumber} · ${room} · ${ahead} · ETA ${eta}`;
  } else {
    body = `Now ${queue.currentNumber} · ${room} · ETA ${eta}`;
  }

  return {
    title,
    body,
    tokensLeft,
    eta,
    room,
    currentNumber: queue.currentNumber,
  };
}

export function buildAlertBody(tracking: UserTracking, queue: Queue): string {
  return buildTrackingStatus(tracking, queue).body;
}
