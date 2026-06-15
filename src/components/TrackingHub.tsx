import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, Settings2, ShieldCheck, Hash, Trash2, Vibrate, BellRing, Pin } from 'lucide-react';
import { SiteSource, UserTracking } from '../types';
import { HOSPITALS } from '../data/hospitals';
import {
  getNotificationState,
  refreshNotificationState,
  requestNotificationPermission,
  testNotification,
  syncTrackingToServiceWorker,
  clearTrackingNotification,
} from '../lib/notifications';
import { getAlwaysOnNotifications, setAlwaysOnNotifications } from '../lib/alwaysOn';
import { isNativeApp } from '../lib/platform';

interface TrackingHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentSource: SiteSource | null;
  tracking: UserTracking | null;
  onUpdateTracking: (t: UserTracking | null) => void;
}

export function TrackingHub({ isOpen, onClose, currentSource, tracking, onUpdateTracking }: TrackingHubProps) {
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem('mv_queue_notify_threshold');
    return saved ? parseInt(saved, 10) : 2;
  });
  const [globalTokenInput, setGlobalTokenInput] = useState('');
  const [selectedSource, setSelectedSource] = useState<SiteSource>('hmh');
  const [notifMessage, setNotifMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [permState, setPermState] = useState(getNotificationState());
  const [alwaysOn, setAlwaysOn] = useState(() => getAlwaysOnNotifications());

  useEffect(() => {
    if (currentSource) setSelectedSource(currentSource);
  }, [currentSource]);

  useEffect(() => {
    if (isOpen) {
      refreshNotificationState().then(setPermState);
      setAlwaysOn(tracking?.alwaysOnNotifications ?? getAlwaysOnNotifications());
    }
  }, [isOpen, tracking?.alwaysOnNotifications]);

  const updateThreshold = (val: number) => {
    setThreshold(val);
    if (tracking) onUpdateTracking({ ...tracking, notifyThreshold: val });
    localStorage.setItem('mv_queue_notify_threshold', val.toString());
  };

  const toggleAlwaysOn = async (enabled: boolean) => {
    setAlwaysOn(enabled);
    setAlwaysOnNotifications(enabled);
    if (tracking) {
      const next = { ...tracking, alwaysOnNotifications: enabled };
      onUpdateTracking(next);
      syncTrackingToServiceWorker(next);
    }
    if (!enabled) {
      await clearTrackingNotification();
    }
    if (enabled && permState !== 'granted') {
      await enableNotifications();
    }
  };

  const enableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setPermState(perm);
    if (perm !== 'granted') {
      setNotifMessage({ text: 'Allow notifications in your browser settings to get alerts.', type: 'error' });
      setTimeout(() => setNotifMessage(null), 5000);
    } else {
      setNotifMessage({ text: 'Notifications enabled!', type: 'success' });
      setTimeout(() => setNotifMessage(null), 3000);
    }
  };

  const handleGlobalTrack = async () => {
    if (!globalTokenInput) return;
    if (permState !== 'granted') await enableNotifications();
    const next: UserTracking = {
      source: selectedSource,
      isGlobal: true,
      myToken: globalTokenInput,
      notifyThreshold: threshold,
      alwaysOnNotifications: alwaysOn,
    };
    onUpdateTracking(next);
    syncTrackingToServiceWorker(next);
    setGlobalTokenInput('');
    setNotifMessage({ text: `Tracking token ${globalTokenInput}`, type: 'success' });
    setTimeout(() => setNotifMessage(null), 3000);
  };

  const clearTracking = () => {
    onUpdateTracking(null);
    syncTrackingToServiceWorker(null);
  };

  const runTest = async () => {
    const result = await testNotification();
    setNotifMessage({ text: result.message, type: result.ok ? 'success' : 'error' });
    setPermState(await refreshNotificationState());
    setTimeout(() => setNotifMessage(null), 5000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[210] rounded-t-3xl p-5 pb-8 safe-bottom max-h-[92dvh] overflow-y-auto sheet-surface"
          >
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-5" />

            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center">
                  <BellRing className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-black">Smart Alerts</h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-full border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {permState !== 'granted' && (
              <button
                onClick={enableNotifications}
                className="w-full mb-4 p-3 rounded-xl text-left flex items-center gap-3 border border-amber-500/20"
                style={{ background: 'rgba(249,168,37,0.1)' }}
              >
                <Bell className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Enable notifications</p>
                  <p className="text-xs text-amber-600/80">Required for mobile & desktop alerts</p>
                </div>
              </button>
            )}

            <AnimatePresence>
              {notifMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    notifMessage.type === 'error'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  }`}
                >
                  <Info className="w-4 h-4 shrink-0" />
                  {notifMessage.text}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-xs font-bold text-[var(--primary)] uppercase">Track token anywhere</span>
                </div>
                <div className="chip-scroll mb-3">
                  {HOSPITALS.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setSelectedSource(h.id)}
                      className={`region-chip ${selectedSource === h.id ? 'region-chip-active' : ''}`}
                    >
                      {selectedSource === h.id && <span className="region-chip-bg absolute inset-0 rounded-full" />}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <img src={h.logo} alt="" className="w-4 h-4 rounded" />
                        {h.shortName}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Your token #"
                    value={globalTokenInput}
                    onChange={(e) => setGlobalTokenInput(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-transparent font-bold text-sm tabular-nums"
                  />
                  <button
                    onClick={handleGlobalTrack}
                    disabled={!globalTokenInput}
                    className="px-4 py-2.5 brand-gradient text-white rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    Track
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-xs font-bold uppercase text-[var(--muted)]">Alert distance</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 5, 10].map((val) => (
                    <button
                      key={val}
                      onClick={() => updateThreshold(val)}
                      className={`py-2 rounded-lg text-[10px] font-bold ${
                        threshold === val ? 'brand-gradient text-white' : 'border border-[var(--border)] text-[var(--muted)]'
                      }`}
                      style={threshold === val ? undefined : { background: 'var(--surface-elevated)' }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--muted)] mt-2">Notify when your token is this many numbers away</p>
              </div>

              {isNativeApp() && (
                <div
                  className="p-4 rounded-2xl border border-[var(--border)] flex items-center justify-between gap-3"
                  style={{ background: 'var(--surface)' }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Pin className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Always-on notification</p>
                      <p className="text-[10px] text-[var(--muted)] leading-relaxed mt-0.5">
                        Live token, queue position & ETA in your notification shade — keeps tracking when the app is closed.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={alwaysOn}
                    onClick={() => toggleAlwaysOn(!alwaysOn)}
                    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
                      alwaysOn ? 'brand-gradient' : 'bg-[var(--border)]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        alwaysOn ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              )}

              {tracking ? (
                <div className="p-4 rounded-2xl border border-[var(--primary)]/20" style={{ background: 'rgba(123,67,151,0.08)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600 uppercase">Active</span>
                    </div>
                    <button
                      onClick={clearTracking}
                      className="text-[10px] font-bold text-red-500 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Stop
                    </button>
                  </div>
                  <p className="text-lg font-black">{HOSPITALS.find((h) => h.id === tracking.source)?.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Token <span className="font-bold text-[var(--primary)] tabular-nums">{tracking.myToken}</span>
                  </p>
                  <button
                    onClick={runTest}
                    className="mt-3 w-full py-2.5 rounded-xl brand-gradient text-white text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Vibrate className="w-4 h-4" /> Test Notification
                  </button>
                </div>
              ) : (
                <button
                  onClick={runTest}
                  className="w-full py-3 rounded-xl border border-dashed border-[var(--border)] text-xs font-bold text-[var(--muted)] flex items-center justify-center gap-2"
                >
                  <Vibrate className="w-4 h-4" /> Test Notifications
                </button>
              )}

              <p className="text-[10px] text-[var(--muted)] leading-relaxed px-1 hidden sm:block">
                Install QuePulse for background alerts. Android: APK or home screen. iPhone: Share → Add to Home Screen.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
