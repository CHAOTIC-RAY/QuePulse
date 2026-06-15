import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import type { Queue, SiteSource } from '../types';
import { queueService } from '../services/queueService';
import { isNativeApp } from '../lib/platform';

const DEFAULT_INTERVAL_MS = 8_000;

export function useQueuePolling(source: SiteSource | null, intervalMs = DEFAULT_INTERVAL_MS) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(!!source);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!source) return;

    const seq = ++seqRef.current;
    setError(null);

    try {
      const data = await queueService.getQueuesForSource(source);
      if (seq !== seqRef.current) return;
      setQueues(data);
    } catch (e) {
      if (seq !== seqRef.current) return;
      console.error('Queue fetch error', e);
      setError('Could not load live queues. Pull to refresh or try again.');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    if (!source) {
      setQueues([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    seqRef.current += 1;

    void refresh();

    const timer = window.setInterval(() => void refresh(), intervalMs);

    const resumeIfVisible = () => {
      if (!document.hidden) void refresh();
    };

    document.addEventListener('visibilitychange', resumeIfVisible);
    window.addEventListener('focus', resumeIfVisible);

    let removeAppListener: (() => void) | undefined;
    if (isNativeApp()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void refresh();
      }).then((handle) => {
        removeAppListener = () => handle.remove();
      });
    }

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', resumeIfVisible);
      window.removeEventListener('focus', resumeIfVisible);
      removeAppListener?.();
      seqRef.current += 1;
    };
  }, [source, intervalMs, refresh]);

  return { queues, loading, error, refresh };
}
