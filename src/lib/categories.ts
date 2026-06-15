export const QUEUE_CATEGORIES = ['All', 'Rooms', 'OPD', 'Emergency', 'Diagnostics', 'Registration', 'Services'] as const;
export type QueueCategory = (typeof QUEUE_CATEGORIES)[number];

export function getQueueCategory(name: string, counterInfo: string): Exclude<QueueCategory, 'All'> {
  const text = `${name} ${counterInfo}`.toUpperCase();
  if (/\bROOM\b/.test(text)) return 'Rooms';
  if (/\bGP\b|\bGOPD\b|\bOPD\b|CONSULTATION|PHYSICIAN|DOCTOR/.test(text)) return 'OPD';
  if (/\bER\b|EMERGENCY|TRIAGE/.test(text)) return 'Emergency';
  if (/\bLAB\b|SAMPLE|X-?RAY|ULTRASOUND|RADIOLOGY|SCAN/.test(text)) return 'Diagnostics';
  if (/\bMEMO\b|REGISTRATION|PAYMENT|BILLING/.test(text)) return 'Registration';
  return 'Services';
}
