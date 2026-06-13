/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Queue } from '../types';

export const queueService = {
  getExternalHMHQueues: async (): Promise<Queue[]> => {
    try {
      const response = await fetch('/api/hmh/queues');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch HMH queues', e);
      return [];
    }
  },

  getExternalVitalCareQueues: async (): Promise<Queue[]> => {
    try {
      const response = await fetch('/api/vitalcare/tokens');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch Vital Care queues', e);
      return [];
    }
  },

  getExternalADKQueues: async (): Promise<Queue[]> => {
    try {
      const response = await fetch('/api/adk/queues');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch ADK queues', e);
      return [];
    }
  },

  getExternalIGMHQueues: async (): Promise<Queue[]> => {
    try {
      const response = await fetch('/api/igmh/queues');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch IGMH queues', e);
      return [];
    }
  },

  getExternalVilimaleQueues: async (): Promise<Queue[]> => {
    try {
      // Vilimale Hospital - part of Male' City Group
      // May share API with IGMH or have separate endpoint
      return [];
    } catch (e) {
      console.error('Failed to fetch Vilimale queues', e);
      return [];
    }
  },

  getExternalDharumavanthaQueues: async (): Promise<Queue[]> => {
    try {
      // Dharumavantha Hospital - part of Male' City Group
      // May share API with IGMH or have separate endpoint
      return [];
    } catch (e) {
      console.error('Failed to fetch Dharumavantha queues', e);
      return [];
    }
  }
};
