import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from './platform';

export interface BackgroundTrackingOptions {
  title: string;
  body: string;
  pollUrl?: string;
  token?: string;
  queueId?: string;
  isGlobal?: boolean;
}

export interface QueueTrackingPlugin {
  startForeground(options: BackgroundTrackingOptions): Promise<void>;
  updateNotification(options: BackgroundTrackingOptions): Promise<void>;
  stopForeground(): Promise<void>;
}

const QueueTracking = registerPlugin<QueueTrackingPlugin>('QueueTracking');

function pluginOptions(options: BackgroundTrackingOptions): BackgroundTrackingOptions {
  return {
    title: options.title,
    body: options.body,
    pollUrl: options.pollUrl ?? '',
    token: options.token ?? '',
    queueId: options.queueId ?? '',
    isGlobal: !!options.isGlobal,
  };
}

export async function startBackgroundTracking(options: BackgroundTrackingOptions): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    await QueueTracking.startForeground(pluginOptions(options));
    return true;
  } catch {
    return false;
  }
}

export async function updateBackgroundTracking(options: BackgroundTrackingOptions): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await QueueTracking.updateNotification(pluginOptions(options));
  } catch {
    // ignore
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await QueueTracking.stopForeground();
  } catch {
    // ignore
  }
}
