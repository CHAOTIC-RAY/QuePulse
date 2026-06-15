import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import type { UserTracking } from '../types';
import { queueService } from '../services/queueService';
import {
  checkTrackingAlert,
  showAlert,
  updateTrackingNotification,
  clearTrackingNotification,
} from '../lib/notifications';
import { isNativeApp } from '../lib/platform';
import { recordQueueTimestamps } from '../lib/queueTiming';
import { buildTrackingStatus, findTrackedQueue } from '../lib/trackingStatus';

const POLL_MS = 5_000;

/** Poll queues and keep live tracking notifications in sync (native APK + foreground web). */
export function useTrackingAlerts(tracking: UserTracking | null) {
  const lastAlertRef = useRef<string | null>(null);
  const alwaysOnRef = useRef(false);

  useEffect(() => {
    lastAlertRef.current = null;
    alwaysOnRef.current = !!tracking?.alwaysOnNotifications;
  }, [tracking?.source, tracking?.queueId, tracking?.myToken, tracking?.alwaysOnNotifications]);

  useEffect(() => {
    if (!tracking) {
      if (isNativeApp()) clearTrackingNotification();
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

        if (isNativeApp() && queue) {
          const status = buildTrackingStatus(tracking, queue);
          await updateTrackingNotification(
            status.title,
            status.body,
            !!tracking.alwaysOnNotifications
          );
        }

        const alert = checkTrackingAlert(tracking, queues, lastAlertRef.current);
        if (!alert) return;

        lastAlertRef.current = alert.alertId;
        await showAlert(alert.title, alert.body, {
          tag: alert.alertId,
          url: `/?hospital=${tracking.source}`,
        });
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

    if (isNativeApp()) {
      startPolling();
      const listener = App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) startPolling();
        else if (!alwaysOnRef.current) stopPolling();
      });

      return () => {
        mounted = false;
        stopPolling();
        listener.then((handle) => handle.remove());
        clearTrackingNotification();
      };
    }

    startPolling();
    return () => {
      mounted = false;
      stopPolling();
    };
  }, [tracking]);
}
