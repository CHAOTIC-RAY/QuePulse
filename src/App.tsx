import { useState, useEffect, useCallback } from 'react';
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
import { useTrackingAlerts } from './hooks/useTrackingAlerts';
import { useTheme } from './hooks/useTheme';
import { useIsMobile } from './hooks/useMediaQuery';
import { useMobileNavigation } from './hooks/useMobileNavigation';

export default function App() {
  const [source, setSource] = useState<SiteSource | null>(null);
  const [mobileScreen, setMobileScreen] = useState<'dashboard' | 'hospitals'>('dashboard');
  const { isDark, toggle } = useTheme();
  const isMobile = useIsMobile();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [tracking, setTracking] = useState<UserTracking | null>(() => {
    try {
      const saved = localStorage.getItem('mv_queue_tracking');
      if (!saved) return null;
      const parsed = JSON.parse(saved) as UserTracking;
      if (parsed.alwaysOnNotifications === undefined) {
        parsed.alwaysOnNotifications = localStorage.getItem('mv_queue_always_on') === 'true';
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const {
    goBack,
    navigateHome,
    navigateHospitals,
    navigateHospital,
    openAlerts,
    closeAlerts,
  } = useMobileNavigation({
    enabled: isMobile,
    mobileScreen,
    source,
    isAlertsOpen,
    setMobileScreen,
    setSource,
    setIsAlertsOpen,
  });

  const selectHospital = useCallback(
    (nextSource: SiteSource) => {
      navigateHospital(nextSource);
    },
    [navigateHospital]
  );

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useTrackingAlerts(tracking);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hospitalParam = urlParams.get('hospital');
    if (hospitalParam && LIVE_HOSPITAL_IDS.includes(hospitalParam as SiteSource)) {
      selectHospital(hospitalParam as SiteSource);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [selectHospital]);

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

  const activeTab = isAlertsOpen
    ? 'alerts'
    : source
      ? 'hospitals'
      : mobileScreen === 'hospitals'
        ? 'hospitals'
        : 'home';

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TrackingHub
        isOpen={isAlertsOpen}
        onClose={closeAlerts}
        currentSource={source}
        tracking={tracking}
        onUpdateTracking={updateTracking}
      />

      <header className={`sticky top-0 z-50 safe-top glass hidden lg:block`}>
        <div className="flex items-center justify-between h-12 lg:h-14 px-4 lg:px-8 w-full">
          {source ? (
            <button
              onClick={() => setSource(null)}
              className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] active:opacity-70"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button onClick={() => setSource(null)}>
              <BrandLogo size="md" />
            </button>
          )}

          {!source && (
            <span className="text-sm font-semibold text-[var(--muted)]">
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

      <div className="flex-1 flex w-full min-h-0">
        <DesktopSidebar />

        <main className="flex-1 w-full min-w-0 px-4 lg:px-8 pt-0 lg:pt-3 pb-28 lg:pb-8 max-w-3xl lg:max-w-none mx-auto lg:mx-0">
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
                  onSelectSite={selectHospital}
                  mobileScreen={mobileScreen}
                  tracking={tracking}
                  onUpdateTracking={updateTracking}
                  onOpenAlerts={openAlerts}
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
                <QueueBoard
                  source={source}
                  tracking={tracking}
                  onUpdateTracking={updateTracking}
                  onBack={isMobile ? goBack : undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <AppFooter />
        </main>
      </div>

      <BottomNav
        activeTab={activeTab}
        hasTracking={!!tracking}
        onHome={navigateHome}
        onHospitals={navigateHospitals}
        onAlerts={openAlerts}
      />
    </div>
  );
}
