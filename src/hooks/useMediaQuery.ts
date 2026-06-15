import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 1024px)');
}

export function useIsStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }, []);
  return standalone;
}

export function useIsNativeApp(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    setNative(!!cap?.isNativePlatform?.());
  }, []);
  return native;
}
