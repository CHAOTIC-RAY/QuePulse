import type { Queue } from '../types';

export function extractRoomLabel(queue: Queue): string {
  const roomFromCounter = queue.counterInfo.match(/Room\s+([A-Za-z0-9]+)/i);
  if (roomFromCounter) return `Room ${roomFromCounter[1]}`;

  const roomFromName = queue.name.match(/ROOM\s+([A-Za-z0-9]+)/i);
  if (roomFromName) return `Room ${roomFromName[1]}`;

  const counterMatch = queue.name.match(/Counter\s+([A-Za-z0-9]+)/i);
  if (counterMatch) return `Counter ${counterMatch[1]}`;

  return queue.name;
}

export function formatNowServing(queue: Queue | null | undefined): string {
  if (!queue?.currentNumber) return '—';
  return `${queue.currentNumber} · ${extractRoomLabel(queue)}`;
}
