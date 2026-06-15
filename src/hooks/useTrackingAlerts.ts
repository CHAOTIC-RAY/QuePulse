import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import type { UserTracking } from '../types';
import { queueService } from '../services/queueService';
import {
  updateAlwaysOnNotification,
  showServingChangeAlert,
  clearTrackingNotification,
  syncTrackingToServiceWorker,
} from '../lib/notifications';
import { isNativeApp } from '../lib/platform';
import { recordQueueTimestamps } from '../lib/queueTiming';
import { buildTrackingStatus, findTrackedQueue, getServingKey } from '../lib/trackingStatus';

const POLL_MS = 5_000;

/** Poll queues and drive a single notification strategy on native. */
export function useTrackingAlerts(tracking: UserTracking | null) {
  const lastServingRef = useRef<string | null>(null);
  const alwaysOnRef = useRef(false);

  useEffect(() => {
    lastServingRef.current = null;
    alwaysOnRef.current = !!tracking?.alwaysOnNotifications;
  }, [tracking?.source, tracking?.queueId, tracking?.myToken, tracking?.alwaysOnNotifications]);

  useEffect(() => {
    syncTrackingToServiceWorker(tracking);

    if (!isNativeApp()) return;

    if (!tracking) {
      clearTrackingNotification();
      return;
    }

    let mounted = true;
    let intervalId: number | undefined;

    const poll = async () => {
      try {
        const queues = await queueService.getQueuesForSource(tracking.source);
        if (!mounted) return;

        recordQueueTimestamps(queues);
        const queue = findTrackedQueue(tracking, queues);
        if (!queue) return;

        const status = buildTrackingStatus(tracking, queue);
        const servingKey = getServingKey(queue);
        const alwaysOn = !!tracking.alwaysOnNotifications;

        if (alwaysOn) {
          await updateAlwaysOnNotification(status.title, status.body);
        } else {
          if (lastServingRef.current !== null && lastServingRef.current !== servingKey) {
            await showServingChangeAlert(status.title, status.body);
          }
          lastServingRef.current = servingKey;
        }
      } catch {
        // retry on next interval
      }
    };

    const startPolling = () => {
      if (intervalId !== undefined) return;
      poll();
      intervalId = window.setInterval(poll, POLL_MS);
    };

    const stopPolling = () => {
      if (intervalId === undefined) return;
      window.clearInterval(intervalId);
      intervalId = undefined;
    };

    if (!tracking.alwaysOnNotifications) {
      clearTrackingNotification();
    }

    startPolling();
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) startPolling();
      else if (!alwaysOnRef.current) stopPolling();
    });

    return () => {
      mounted = false;
      stopPolling();
      listener.then((handle) => handle.remove());
    };
  }, [tracking]);
}
