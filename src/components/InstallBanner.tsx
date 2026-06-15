import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';
import { useIsMobile, useIsStandalone, useIsNativeApp } from '../hooks/useMediaQuery';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Mobile-only PWA install prompt — hidden on desktop and in native APK */
export function InstallBanner() {
  const isMobile = useIsMobile();
  const isStandalone = useIsStandalone();
  const isNative = useIsNativeApp();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('qp_install_dismissed') === '1');

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem('qp_install_dismissed', '1');
    setDismissed(true);
  };

  // Desktop has QR sidebar; APK is already installed; dismissed or no prompt
  if (!isMobile || isStandalone || isNative || dismissed || !deferred) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="mb-3 p-3 rounded-xl brand-gradient text-white flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Add to Home Screen</p>
          <p className="text-[11px] text-white/80 mt-0.5">For background queue alerts</p>
        </div>
        <button
          onClick={install}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-[var(--primary)] text-xs font-bold"
        >
          <Download className="w-3.5 h-3.5" /> Install
        </button>
        <button onClick={dismiss} className="p-1 rounded-lg hover:bg-white/10 shrink-0" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
