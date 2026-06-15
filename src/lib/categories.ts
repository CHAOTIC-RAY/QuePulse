import type { SiteSource } from '../types';

export const QUEUE_CATEGORIES = [
  'All',
  'Rooms',
  'OPD',
  'Emergency',
  'Diagnostics',
  'Registration',
  'Services',
] as const;
export type QueueCategory = (typeof QUEUE_CATEGORIES)[number];

const CATEGORY_ORDER: Exclude<QueueCategory, 'All'>[] = [
  'Rooms',
  'OPD',
  'Emergency',
  'Diagnostics',
  'Registration',
  'Services',
];

export function sortCategories(
  categories: Exclude<QueueCategory, 'All'>[]
): Exclude<QueueCategory, 'All'>[] {
  return [...categories].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  );
}

export function getQueueCategory(
  name: string,
  counterInfo: string,
  hospital?: SiteSource
): Exclude<QueueCategory, 'All'> {
  const text = `${name} ${counterInfo}`.toUpperCase();

  if (hospital === 'hmh' || hospital === 'adk') {
    if (counterInfo === 'Service' || /\bSERVICE\b/.test(text) && !/\bROOM\b/.test(text)) {
      return 'Services';
    }
    if (/\bDIAGNOSTICS\b|\bLAB\b/.test(text)) return 'Diagnostics';
  }

  if (/\bGOPD\b|\bGP\b|\bOPD\b|CONSULTATION|PHYSICIAN|DOCTOR/.test(text)) return 'OPD';
  if (/\bROOM\b/.test(text)) return 'Rooms';
  if (/\bER\b|EMERGENCY|TRIAGE/.test(text)) return 'Emergency';
  if (/\bLAB\b|SAMPLE|X-?RAY|ULTRASOUND|RADIOLOGY|SCAN|DIAGNOSTICS/.test(text)) {
    return 'Diagnostics';
  }
  if (/\bMEMO\b|REGISTRATION|PAYMENT|BILLING/.test(text)) return 'Registration';
  return 'Services';
}
