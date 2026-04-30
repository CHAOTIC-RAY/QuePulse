/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Queue } from '../types';

export const queueService = {
  getExternalHMHQueues: async (): Promise<Queue[]> => {
    try {
      const response = await fetch('/api/hmh/queues');
      if (!response.ok) throw new Error('HMH Fetch failed');
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch HMH queues', e);
      return [];
    }
  },

  getExternalVitalCareQueues: async (): Promise<Queue[]> => {
    try {
      const response = await fetch('/api/vitalcare/tokens');
      if (!response.ok) throw new Error('Vital Care Fetch failed');
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch Vital Care queues', e);
      return [];
    }
  },

  getExternalADKQueues: async (): Promise<Queue[]> => {
    try {
      const response = await fetch('/api/adk/queues');
      if (!response.ok) throw new Error('ADK Fetch failed');
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch ADK queues', e);
      return [];
    }
  }
};
