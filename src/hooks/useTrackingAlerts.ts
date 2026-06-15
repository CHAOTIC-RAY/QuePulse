import { useEffect, useRef, type MutableRefObject } from 'react';
import { App } from '@capacitor/app';
import type { UserTracking } from '../types';
import { queueService } from '../services/queueService';
import {
  updateAlwaysOnNotification,
  showServingChangeAlert,
  updateWebAlwaysOnNotification,
  showWebServingChangeAlert,
  clearTrackingNotification,
  syncTrackingToServiceWorker,
} from '../lib/notifications';
import { isNativeApp } from '../lib/platform';
import { recordQueueTimestamps } from '../lib/queueTiming';
import { buildTrackingStatus, findTrackedQueue, getServingKey } from '../lib/trackingStatus';

const POLL_MS = 5_000;

async function handleTrackingPoll(
  tracking: UserTracking,
  lastServingRef: MutableRefObject<string | null>
) {
  const queues = await queueService.getQueuesForSource(tracking.source);
  recordQueueTimestamps(queues);
  const queue = findTrackedQueue(tracking, queues);
  if (!queue) return;

  const status = buildTrackingStatus(tracking, queue);
  const servingKey = getServingKey(queue);
  const alwaysOn = !!tracking.alwaysOnNotifications;
  const url = `/?hospital=${tracking.source}`;

  if (alwaysOn) {
    const isUpdate = lastServingRef.current !== null;
    if (isNativeApp()) {
      await updateAlwaysOnNotification(status.title, status.body);
    } else {
      await updateWebAlwaysOnNotification(status.title, status.body, url, isUpdate);
    }
    lastServingRef.current = servingKey;
    return;
  }

  if (lastServingRef.current !== null && lastServingRef.current !== servingKey) {
    if (isNativeApp()) {
      await showServingChangeAlert(status.title, status.body);
    } else {
      await showWebServingChangeAlert(status.title, status.body, url);
    }
  }
  lastServingRef.current = servingKey;
}

/** Poll queues and drive a single notification strategy (native APK + web/PWA fallback). */
export function useTrackingAlerts(tracking: UserTracking | null) {
  const lastServingRef = useRef<string | null>(null);
  const alwaysOnRef = useRef(false);

  useEffect(() => {
    lastServingRef.current = null;
    alwaysOnRef.current = !!tracking?.alwaysOnNotifications;
  }, [tracking?.source, tracking?.queueId, tracking?.myToken, tracking?.alwaysOnNotifications]);

  useEffect(() => {
    syncTrackingToServiceWorker(tracking);

    if (!tracking) {
      void clearTrackingNotification();
      return;
    }

    if (!isNativeApp() && navigator.serviceWorker?.controller) {
      if (!tracking.alwaysOnNotifications) {
        void clearTrackingNotification();
      }
      return;
    }

    let mounted = true;
    let intervalId: number | undefined;

    const poll = async () => {
      try {
        if (!mounted) return;
        await handleTrackingPoll(tracking, lastServingRef);
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
      void clearTrackingNotification();
    }

    startPolling();

    if (!isNativeApp()) {
      return () => {
        mounted = false;
        stopPolling();
      };
    }

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
