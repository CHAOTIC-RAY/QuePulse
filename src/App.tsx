import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { QueueBoard } from './components/QueueBoard';
import { TrackingHub } from './components/TrackingHub';
import { LiveTrackingBanner } from './components/LiveTrackingBanner';
import { InstallBanner } from './components/InstallBanner';
import { BottomNav } from './components/BottomNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { AppFooter } from './components/AppFooter';
import { BrandLogo } from './components/BrandLogo';
import { SiteSource, UserTracking } from './types';
import { LIVE_HOSPITAL_IDS } from './data/hospitals';
import { addRecentHospital } from './lib/recentHospitals';
import { Moon, Sun, Bell, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { registerServiceWorker, syncTrackingToServiceWorker } from './lib/notifications';
import { useTheme } from './hooks/useTheme';
import { useIsMobile } from './hooks/useMediaQuery';

export default function App() {
  const [source, setSource] = useState<SiteSource | null>(null);
  const [mobileScreen, setMobileScreen] = useState<'dashboard' | 'hospitals'>('dashboard');
  const { isDark, toggle } = useTheme();
  const isMobile = useIsMobile();
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

  useEffect(() => {
    if (source) addRecentHospital(source);
  }, [source]);

  const [recentVersion, setRecentVersion] = useState(0);
  useEffect(() => {
    if (!source) setRecentVersion((v) => v + 1);
  }, [source]);

  const updateTracking = (newTracking: UserTracking | null) => {
    setTracking(newTracking);
    if (!newTracking) localStorage.removeItem('mv_queue_tracking');
    else localStorage.setItem('mv_queue_tracking', JSON.stringify(newTracking));
    syncTrackingToServiceWorker(newTracking);
  };

  const activeTab = isAlertsOpen ? 'alerts' : source ? 'hospitals' : mobileScreen === 'hospitals' ? 'hospitals' : 'home';

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TrackingHub
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        currentSource={source}
        tracking={tracking}
        onUpdateTracking={updateTracking}
      />

      <header className={`sticky top-0 z-50 safe-top ${isMobile ? 'mobile-header' : 'glass'}`}>
        <div className="flex items-center justify-between h-12 lg:h-14 px-4 lg:px-8 w-full">
          {source ? (
            <button
              onClick={() => setSource(null)}
              className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] active:opacity-70"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : isMobile ? (
            <div className="pointer-events-none">
              <BrandLogo size="mobile" />
            </div>
          ) : (
            <button onClick={() => setSource(null)}>
              <BrandLogo size="md" />
            </button>
          )}

          {!source && !isMobile && (
            <span className="hidden lg:block text-sm font-semibold text-[var(--muted)]">
              Select a hospital to view live queues
            </span>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-transparent hover:border-[var(--border)] active:scale-95 transition-transform"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {!isMobile && (
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
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex w-full min-h-0">
        <DesktopSidebar />

        <main className="flex-1 w-full min-w-0 px-4 lg:px-8 pt-2 lg:pt-3 pb-28 lg:pb-8 max-w-3xl lg:max-w-none mx-auto lg:mx-0">
          <InstallBanner />
          <AnimatePresence mode="wait">
            {!source ? (
              <motion.div
                key={mobileScreen}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="lg:max-w-5xl"
              >
                {!isMobile && tracking && <LiveTrackingBanner tracking={tracking} />}
                <LandingPage
                  onSelectSite={setSource}
                  mobileScreen={mobileScreen}
                  tracking={tracking}
                  onUpdateTracking={updateTracking}
                  onOpenAlerts={() => setIsAlertsOpen(true)}
                  recentVersion={recentVersion}
                />
              </motion.div>
            ) : (
              <motion.div
                key={source}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="lg:max-w-4xl"
              >
                <QueueBoard source={source} tracking={tracking} onUpdateTracking={updateTracking} />
              </motion.div>
            )}
          </AnimatePresence>
          <AppFooter />
        </main>
      </div>

      <BottomNav
        activeTab={activeTab}
        hasTracking={!!tracking}
        onHome={() => {
          setSource(null);
          setMobileScreen('dashboard');
          setIsAlertsOpen(false);
        }}
        onHospitals={() => {
          setSource(null);
          setMobileScreen('hospitals');
          setIsAlertsOpen(false);
        }}
        onAlerts={() => setIsAlertsOpen(true)}
      />
    </div>
  );
}
