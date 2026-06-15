import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { QueueBoard } from './components/QueueBoard';
import { TrackingHub } from './components/TrackingHub';
import { LiveTrackingBanner } from './components/LiveTrackingBanner';
import { InstallBanner } from './components/InstallBanner';
import { SiteSource, UserTracking } from './types';
import { Moon, Sun, Bell, Home, ArrowLeft, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { registerServiceWorker, syncTrackingToServiceWorker } from './lib/notifications';

export default function App() {
  const [source, setSource] = useState<SiteSource | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
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
    if (hospitalParam && ['hmh', 'vitalcare', 'adk', 'igmh', 'vilimale', 'dharumavantha'].includes(hospitalParam)) {
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

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
              className="flex items-center gap-2 text-sm font-bold text-blue-600 active:opacity-70"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button onClick={() => setSource(null)} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg tracking-tight">QuePulse</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsAlertsOpen(true)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center relative ${
                tracking ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              aria-label="Alerts"
            >
              <Bell className="w-4 h-4" />
              {tracking && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-black" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-3 pb-24">
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
            >
              <QueueBoard source={source} tracking={tracking} onUpdateTracking={updateTracking} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="mobile-nav md:hidden">
        <div className="flex justify-around items-center h-14 max-w-3xl mx-auto px-6">
          <button
            onClick={() => { setSource(null); setIsAlertsOpen(false); }}
            className={`flex flex-col items-center gap-0.5 ${!source ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Home</span>
          </button>
          <button
            onClick={() => setIsAlertsOpen(true)}
            className={`flex flex-col items-center gap-0.5 ${isAlertsOpen ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {tracking && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
            </div>
            <span className="text-[9px] font-bold uppercase">Alerts</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
