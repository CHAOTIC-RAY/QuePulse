/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Queue {
  id: string;
  name: string;
  prefix: string;
  currentNumber: string;
  counterInfo: string;
  lastUpdated?: Date;
  history?: string[];
}

export type SiteSource = 'hmh' | 'vitalcare' | 'adk' | 'igmh' | 'vilimale' | 'dharumavantha';

export interface UserTracking {
  source: SiteSource;
  queueId?: string; // Optional for global tracking
  isGlobal?: boolean;
  myToken: string;
  notifyThreshold: number;
  roomNumber?: string; // Optional room number for tracking
}
