import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { QueueBoard } from './components/QueueBoard';
import { TrackingHub } from './components/TrackingHub';
import { LiveTrackingBanner } from './components/LiveTrackingBanner';
import { InstallBanner } from './components/InstallBanner';
import { BottomNav } from './components/BottomNav';
import { AppFooter } from './components/AppFooter';
import { SiteSource, UserTracking } from './types';
import { LIVE_HOSPITAL_IDS } from './data/hospitals';
import { Moon, Sun, Bell, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { registerServiceWorker, syncTrackingToServiceWorker } from './lib/notifications';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [source, setSource] = useState<SiteSource | null>(null);
  const { isDark, toggle } = useTheme();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [tracking, setTracking] = useState<UserTracking | null>(() => {
    try {
      const saved = localStorage.getItem('mv_queue_tracking');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hospitalParam = urlParams.get('hospital');
    if (hospitalParam && LIVE_HOSPITAL_IDS.includes(hospitalParam as SiteSource)) {
      setSource(hospitalParam as SiteSource);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const updateTracking = (newTracking: UserTracking | null) => {
    setTracking(newTracking);
    if (!newTracking) localStorage.removeItem('mv_queue_tracking');
    else localStorage.setItem('mv_queue_tracking', JSON.stringify(newTracking));
    syncTrackingToServiceWorker(newTracking);
  };

  const activeTab = isAlertsOpen ? 'alerts' : source ? 'hospitals' : 'home';

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TrackingHub
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        currentSource={source}
        tracking={tracking}
        onUpdateTracking={updateTracking}
      />

      <header className="sticky top-0 z-50 glass safe-top">
        <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto w-full">
          {source ? (
            <button
              onClick={() => setSource(null)}
              className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] active:opacity-70"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button onClick={() => setSource(null)} className="flex items-center gap-2.5">
              <img src="/icons/icon.svg" alt="QuePulse" className="w-9 h-9 rounded-xl float-slow" />
              <span className="font-black text-lg tracking-tight">
                Que<span className="text-[var(--accent)]">Pulse</span>
              </span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-transparent hover:border-[var(--border)]"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsAlertsOpen(true)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center relative ${
                tracking ? 'brand-gradient text-white' : 'border border-transparent hover:border-[var(--border)]'
              }`}
              aria-label="Alerts"
            >
              <Bell className="w-4 h-4" />
              {tracking && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--accent)] rounded-full border-2 border-[var(--glass-bg)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-3 pb-28">
        <InstallBanner />
        <AnimatePresence mode="wait">
          {!source ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {tracking && <LiveTrackingBanner tracking={tracking} />}
              <LandingPage onSelectSite={setSource} />
            </motion.div>
          ) : (
            <motion.div
              key={source}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              <QueueBoard source={source} tracking={tracking} onUpdateTracking={updateTracking} />
            </motion.div>
          )}
        </AnimatePresence>
        <AppFooter />
      </main>

      <BottomNav
        activeTab={activeTab}
        hasTracking={!!tracking}
        onHome={() => {
          setSource(null);
          setIsAlertsOpen(false);
        }}
        onHospitals={() => {
          setIsAlertsOpen(false);
          if (!source) window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onAlerts={() => setIsAlertsOpen(true)}
      />
    </div>
  );
}
