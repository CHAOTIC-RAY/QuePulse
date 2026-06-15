import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from './platform';

export interface QueueTrackingPlugin {
  startForeground(options: { title: string; body: string }): Promise<void>;
  updateNotification(options: { title: string; body: string }): Promise<void>;
  stopForeground(): Promise<void>;
}

const QueueTracking = registerPlugin<QueueTrackingPlugin>('QueueTracking');

export async function startBackgroundTracking(title: string, body: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await QueueTracking.startForeground({ title, body });
  } catch {
    // Plugin unavailable in web builds
  }
}

export async function updateBackgroundTracking(title: string, body: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await QueueTracking.updateNotification({ title, body });
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
