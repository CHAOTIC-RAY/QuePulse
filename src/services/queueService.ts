/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Queue, SiteSource } from '../types';

async function fetchQueues(endpoint: string): Promise<Queue[]> {
  const response = await fetch(endpoint, { cache: 'no-store' });
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.queues)) return data.queues;
  if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`);
  return [];
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
    };
    return map[source]();
  },
};
