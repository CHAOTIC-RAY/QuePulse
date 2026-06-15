import type { SiteSource } from '../types';

const STORAGE_KEY = 'qp_recent_hospitals';
const MAX_RECENT = 4;

export function getRecentHospitals(): SiteSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SiteSource[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function addRecentHospital(id: SiteSource) {
  const current = getRecentHospitals().filter((h) => h !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([id, ...current].slice(0, MAX_RECENT)));
}
