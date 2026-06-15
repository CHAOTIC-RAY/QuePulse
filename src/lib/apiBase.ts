import { SITE_URL } from '../config';

/** Origin used by Capacitor Android WebView (androidScheme: https). */
const CAPACITOR_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function currentHostname(): string {
  if (typeof window !== 'undefined') return window.location.hostname;
  if (typeof self !== 'undefined' && 'location' in self) {
    return (self as unknown as ServiceWorkerGlobalScope).location.hostname;
  }
  return '';
}

export function getApiBase(): string {
  if (CAPACITOR_LOCAL_HOSTS.has(currentHostname())) return SITE_URL;

  if (typeof window !== 'undefined') {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return SITE_URL;
  }

  return '';
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base.replace(/\/$/, '')}${normalized}` : normalized;
}
