/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Queue, SiteSource } from '../types';
import { apiUrl } from '../lib/apiBase';

/** Accept a queue payload only when the HTTP call succeeded. */
export function queuesFromResponse(ok: boolean, status: number, data: unknown): Queue[] {
  if (!ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed: ${status}`;
    throw new Error(message);
  }
  if (Array.isArray(data)) return data as Queue[];
  if (data && typeof data === 'object' && Array.isArray((data as { queues?: unknown }).queues)) {
    return (data as { queues: Queue[] }).queues;
  }
  return [];
}

async function fetchQueues(path: string): Promise<Queue[]> {
  const base = apiUrl(path);
  const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    throw new Error(response.ok ? 'Queue response was not valid JSON' : `Request failed: ${response.status}`);
  }
  return queuesFromResponse(response.ok, response.status, data);
}

export const queueService = {
  getExternalHMHQueues: () => fetchQueues('/api/hmh/queues'),
  getExternalVitalCareQueues: () => fetchQueues('/api/vitalcare/tokens'),
  getExternalADKQueues: () => fetchQueues('/api/adk/queues'),
  getExternalIGMHQueues: () => fetchQueues('/api/igmh/queues'),
  getExternalVilimaleQueues: () => fetchQueues('/api/vilimale/queues'),
  getExternalDharumavanthaQueues: () => fetchQueues('/api/dharumavantha/queues'),
  getExternalURHQueues: () => fetchQueues('/api/urh/queues'),
  getExternalFAHQueues: () => fetchQueues('/api/fah/queues'),
  getExternalShahQueues: () => fetchQueues('/api/shah/queues'),
  getExternalASMHQueues: () => fetchQueues('/api/asmh/queues'),

  getQueuesForSource(source: SiteSource): Promise<Queue[]> {
    const map: Record<SiteSource, () => Promise<Queue[]>> = {
      hmh: this.getExternalHMHQueues,
      vitalcare: this.getExternalVitalCareQueues,
      adk: this.getExternalADKQueues,
      igmh: this.getExternalIGMHQueues,
      vilimale: this.getExternalVilimaleQueues,
      dharumavantha: this.getExternalDharumavanthaQueues,
      urh: this.getExternalURHQueues,
      fah: this.getExternalFAHQueues,
      shah: this.getExternalShahQueues,
      asmh: this.getExternalASMHQueues,
    };
    return map[source]();
  },
};
