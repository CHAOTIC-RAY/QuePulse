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
  /** Set by scraper or detected when token jumps ahead */
  isPriority?: boolean;
}

export type SiteSource =
  | 'hmh'
  | 'vitalcare'
  | 'adk'
  | 'igmh'
  | 'vilimale'
  | 'dharumavantha'
  | 'urh'
  | 'fah'
  | 'shah';

export interface UserTracking {
  source: SiteSource;
  queueId?: string; // Optional for global tracking
  isGlobal?: boolean;
  myToken: string;
  notifyThreshold: number;
  roomNumber?: string; // Optional room number for tracking
  /** Keep live tracking notification + background polling when app is closed (Android) */
  alwaysOnNotifications?: boolean;
}
