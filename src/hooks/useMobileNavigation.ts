import { useCallback, useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import type { SiteSource } from '../types';
import { useIsNativeApp } from './useMediaQuery';

export type MobileScreen = 'dashboard' | 'hospitals';

type QpHistoryState = {
  qp: 'root' | 'hospital' | 'alerts';
  screen?: MobileScreen;
  source?: SiteSource;
  from?: MobileScreen;
};

interface UseMobileNavigationOptions {
  enabled: boolean;
  mobileScreen: MobileScreen;
  source: SiteSource | null;
  isAlertsOpen: boolean;
  setMobileScreen: (screen: MobileScreen) => void;
  setSource: (source: SiteSource | null) => void;
  setIsAlertsOpen: (open: boolean) => void;
}

function readHistoryState(): QpHistoryState | null {
  const state = window.history.state;
  if (!state || typeof state !== 'object' || !('qp' in state)) return null;
  return state as QpHistoryState;
}

export function useMobileNavigation({
  enabled,
  mobileScreen,
  source,
  isAlertsOpen,
  setMobileScreen,
  setSource,
  setIsAlertsOpen,
}: UseMobileNavigationOptions) {
  const isNative = useIsNativeApp();
  const applyingHistoryRef = useRef(false);

  const replaceRootState = useCallback((screen: MobileScreen) => {
    window.history.replaceState({ qp: 'root', screen } satisfies QpHistoryState, '');
  }, []);

  const applyHistoryState = useCallback(
    (state: QpHistoryState | null) => {
      applyingHistoryRef.current = true;
      if (!state || state.qp === 'root') {
        setSource(null);
        setMobileScreen(state?.screen ?? 'dashboard');
        setIsAlertsOpen(false);
      } else if (state.qp === 'hospital' && state.source) {
        setSource(state.source);
        setMobileScreen(state.from ?? 'dashboard');
        setIsAlertsOpen(false);
      } else if (state.qp === 'alerts') {
        setIsAlertsOpen(false);
      }
      queueMicrotask(() => {
        applyingHistoryRef.current = false;
      });
    },
    [setIsAlertsOpen, setMobileScreen, setSource]
  );

  const goBack = useCallback(async () => {
    if (!enabled) return;

    if (isAlertsOpen) {
      if (readHistoryState()?.qp === 'alerts') {
        window.history.back();
      } else {
        setIsAlertsOpen(false);
      }
      return;
    }

    if (source) {
      window.history.back();
      return;
    }

    if (mobileScreen === 'hospitals') {
      setMobileScreen('dashboard');
      replaceRootState('dashboard');
      return;
    }

    if (isNative) {
      await App.minimizeApp();
    }
  }, [
    enabled,
    isAlertsOpen,
    isNative,
    mobileScreen,
    replaceRootState,
    setIsAlertsOpen,
    setMobileScreen,
    source,
  ]);

  const navigateHome = useCallback(() => {
    if (!enabled) return;
    setSource(null);
    setMobileScreen('dashboard');
    setIsAlertsOpen(false);
    replaceRootState('dashboard');
  }, [enabled, replaceRootState, setIsAlertsOpen, setMobileScreen, setSource]);

  const navigateHospitals = useCallback(() => {
    if (!enabled) return;
    setSource(null);
    setMobileScreen('hospitals');
    setIsAlertsOpen(false);
    replaceRootState('hospitals');
  }, [enabled, replaceRootState, setIsAlertsOpen, setMobileScreen, setSource]);

  const navigateHospital = useCallback(
    (nextSource: SiteSource, from: MobileScreen = mobileScreen) => {
      if (!enabled) {
        setSource(nextSource);
        return;
      }
      setSource(nextSource);
      setIsAlertsOpen(false);
      window.history.pushState(
        { qp: 'hospital', source: nextSource, from } satisfies QpHistoryState,
        ''
      );
    },
    [enabled, mobileScreen, setIsAlertsOpen, setSource]
  );

  const openAlerts = useCallback(() => {
    if (!enabled) {
      setIsAlertsOpen(true);
      return;
    }
    setIsAlertsOpen(true);
    window.history.pushState(
      {
        qp: 'alerts',
        screen: mobileScreen,
        source: source ?? undefined,
      } satisfies QpHistoryState,
      ''
    );
  }, [enabled, mobileScreen, setIsAlertsOpen, source]);

  const closeAlerts = useCallback(() => {
    if (!enabled) {
      setIsAlertsOpen(false);
      return;
    }
    if (readHistoryState()?.qp === 'alerts') {
      window.history.back();
    } else {
      setIsAlertsOpen(false);
    }
  }, [enabled, setIsAlertsOpen]);

  useEffect(() => {
    if (!enabled) return;
    if (!readHistoryState()) {
      replaceRootState(mobileScreen);
    }
  }, [enabled, mobileScreen, replaceRootState]);

  useEffect(() => {
    if (!enabled) return;

    const onPopState = (event: PopStateEvent) => {
      applyHistoryState((event.state as QpHistoryState | null) ?? null);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyHistoryState, enabled]);

  useEffect(() => {
    if (!enabled || !isNative) return;

    let remove: (() => void) | undefined;
    App.addListener('backButton', () => {
      void goBack();
    }).then((handle) => {
      remove = () => void handle.remove();
    });

    return () => {
      remove?.();
    };
  }, [enabled, goBack, isNative]);

  return {
    goBack,
    navigateHome,
    navigateHospitals,
    navigateHospital,
    openAlerts,
    closeAlerts,
  };
}
