import { useEffect, useRef } from 'react';
import type { UserTracking } from '../types';
import { queueService } from '../services/queueService';
import { checkTrackingAlert, showAlert } from '../lib/notifications';
import { isNativeApp } from '../lib/platform';

/** Poll queue APIs and fire alerts on native where service workers are unavailable. */
export function useTrackingAlerts(tracking: UserTracking | null) {
  const lastAlertRef = useRef<string | null>(null);

  useEffect(() => {
    lastAlertRef.current = null;
  }, [tracking?.source, tracking?.queueId, tracking?.myToken]);

  useEffect(() => {
    if (!tracking || !isNativeApp()) return;

    let mounted = true;

    const poll = async () => {
      try {
        const queues = await queueService.getQueuesForSource(tracking.source);
        if (!mounted) return;

        const alert = checkTrackingAlert(tracking, queues, lastAlertRef.current);
        if (!alert) return;

        lastAlertRef.current = alert.alertId;
        await showAlert(alert.title, alert.body, { tag: alert.alertId });
      } catch {
        // retry on next interval
      }
    };

    poll();
    const id = window.setInterval(poll, 12_000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [tracking]);
}
