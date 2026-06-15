import type { Queue } from '../types';

const HISTORY_KEY = 'mv_queue_history';
const HISTORY_TIMES_KEY = 'mv_queue_history_times';
const ETA_CACHE_KEY = 'mv_queue_eta_cache';
const MAX_HISTORY = 12;
const JUMP_THRESHOLD = 5;
/** Recalculate room pace / wait ETA from history at most every 30 minutes */
const ETA_CACHE_TTL_MS = 30 * 60 * 1000;

export type TokenHistoryEntry = { token: string; time: number };

type EtaCacheEntry = {
  avgMs: number;
  computedAt: number;
};

type EtaCacheStore = Record<string, EtaCacheEntry>;

export function parseTokenNumber(token: string): number | null {
  const n = parseInt(token.replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

export function detectPriorityJump(prevToken: string, nextToken: string): boolean {
  const prev = parseTokenNumber(prevToken);
  const next = parseTokenNumber(nextToken);
  if (prev === null || next === null) return false;
  return next > prev && next - prev >= JUMP_THRESHOLD;
}

function loadHistory(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  } catch {
    return {};
  }
}

function loadTimedHistory(): Record<string, TokenHistoryEntry[]> {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_TIMES_KEY) || '{}');
  } catch {
    return {};
  }
}

function loadEtaCache(): EtaCacheStore {
  try {
    return JSON.parse(localStorage.getItem(ETA_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveEtaCache(cache: EtaCacheStore) {
  localStorage.setItem(ETA_CACHE_KEY, JSON.stringify(cache));
}

function computeAvgMsPerPatient(queueId: string): number | null {
  const timedHistory = loadTimedHistory();
  const history = timedHistory[queueId] || [];
  if (history.length < 2) return null;

  let totalTime = 0;
  let totalPatients = 0;

  for (let i = 0; i < history.length - 1; i++) {
    const t1 = history[i].time;
    const t2 = history[i + 1].time;
    const num1 = parseTokenNumber(history[i].token);
    const num2 = parseTokenNumber(history[i + 1].token);
    if (num1 !== null && num2 !== null && num1 > num2) {
      totalTime += t1 - t2;
      totalPatients += num1 - num2;
    }
  }

  if (totalPatients <= 0 || totalTime <= 0) return null;
  return totalTime / totalPatients;
}

/** Cached average pace; recomputes from local history every 30 minutes per room */
export function getAvgMsPerPatient(queueId: string): number | null {
  const cache = loadEtaCache();
  const entry = cache[queueId];
  const now = Date.now();

  if (entry && now - entry.computedAt < ETA_CACHE_TTL_MS) {
    return entry.avgMs;
  }

  const fresh = computeAvgMsPerPatient(queueId);
  if (fresh !== null) {
    cache[queueId] = { avgMs: fresh, computedAt: now };
    saveEtaCache(cache);
  }

  return fresh;
}

export function recordQueueTimestamps(queues: Queue[]): Record<string, string[]> {
  const now = Date.now();
  const tokenHistory = loadHistory();
  const timedHistory = loadTimedHistory();
  let changed = false;

  for (const queue of queues) {
    const prevToken = tokenHistory[queue.id]?.[0];
    if (prevToken === queue.currentNumber) continue;

    tokenHistory[queue.id] = [queue.currentNumber, ...(tokenHistory[queue.id] || [])].slice(
      0,
      MAX_HISTORY
    );

    const entries = timedHistory[queue.id] || [];
    timedHistory[queue.id] = [{ token: queue.currentNumber, time: now }, ...entries].slice(
      0,
      MAX_HISTORY
    );
    changed = true;
  }

  if (changed) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(tokenHistory));
    localStorage.setItem(HISTORY_TIMES_KEY, JSON.stringify(timedHistory));
  }

  return tokenHistory;
}

export function enrichQueuesWithPriority(
  queues: Queue[],
  tokenHistory: Record<string, string[]>
): Queue[] {
  return queues.map((queue) => {
    const entries = tokenHistory[queue.id] || [];
    const prevToken = entries[1];
    const jumped = prevToken ? detectPriorityJump(prevToken, queue.currentNumber) : false;
    return {
      ...queue,
      isPriority: Boolean(queue.isPriority || jumped),
    };
  });
}

export function formatEtaDuration(ms: number): string {
  if (ms < 60_000) return '< 1 min';
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `~${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `~${hours}h ${rem}m` : `~${hours}h`;
}

export function getRoomEtaText(queueId: string): string {
  const avg = getAvgMsPerPatient(queueId);
  if (!avg) return 'Analyzing…';
  return `${formatEtaDuration(avg)}/token`;
}

export function getWaitEtaText(queueId: string, targetToken: string, currentToken: string): string {
  const current = parseTokenNumber(currentToken);
  const target = parseTokenNumber(targetToken);
  if (current === null || target === null) return 'Analyzing…';

  const left = target - current;
  if (left <= 0) return 'Your turn';

  const avg = getAvgMsPerPatient(queueId);
  if (!avg) return 'Analyzing…';
  return formatEtaDuration(left * avg);
}
