import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, Settings2, ShieldCheck, Hash, Trash2, Vibrate, BellRing } from 'lucide-react';
import { SiteSource, UserTracking } from '../types';
import {
  getNotificationState,
  requestNotificationPermission,
  testNotification,
  syncTrackingToServiceWorker,
} from '../lib/notifications';

interface TrackingHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentSource: SiteSource | null;
  tracking: UserTracking | null;
  onUpdateTracking: (t: UserTracking | null) => void;
}

const HOSPITALS: { id: SiteSource; label: string }[] = [
  { id: 'hmh', label: 'HMH' },
  { id: 'adk', label: 'ADK' },
  { id: 'vitalcare', label: 'Vital' },
  { id: 'igmh', label: 'IGMH' },
  { id: 'vilimale', label: 'Vilimale' },
  { id: 'dharumavantha', label: 'Dharu' },
];

export function TrackingHub({ isOpen, onClose, currentSource, tracking, onUpdateTracking }: TrackingHubProps) {
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem('mv_queue_notify_threshold');
    return saved ? parseInt(saved, 10) : 2;
  });
  const [globalTokenInput, setGlobalTokenInput] = useState('');
  const [selectedSource, setSelectedSource] = useState<SiteSource>('hmh');
  const [notifMessage, setNotifMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [permState, setPermState] = useState(getNotificationState());

  useEffect(() => {
    if (currentSource) setSelectedSource(currentSource);
  }, [currentSource]);

  useEffect(() => {
    if (isOpen) setPermState(getNotificationState());
  }, [isOpen]);

  const updateThreshold = (val: number) => {
    setThreshold(val);
    if (tracking) onUpdateTracking({ ...tracking, notifyThreshold: val });
    localStorage.setItem('mv_queue_notify_threshold', val.toString());
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
    };
    onUpdateTracking(next);
    syncTrackingToServiceWorker(next);
    setGlobalTokenInput('');
    setNotifMessage({ text: `Tracking token ${globalTokenInput} at ${selectedSource.toUpperCase()}`, type: 'success' });
    setTimeout(() => setNotifMessage(null), 3000);
  };

  const clearTracking = () => {
    onUpdateTracking(null);
    syncTrackingToServiceWorker(null);
  };

  const runTest = async () => {
    const result = await testNotification();
    setNotifMessage({ text: result.message, type: result.ok ? 'success' : 'error' });
    setPermState(getNotificationState());
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
            className="fixed bottom-0 left-0 right-0 z-[210] bg-white dark:bg-[#0a0a0a] rounded-t-3xl p-5 pb-8 safe-bottom border-t border-slate-200 dark:border-white/5 max-h-[92dvh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-5" />

            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                  <BellRing className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-black">Smart Alerts</h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Permission banner */}
            {permState !== 'granted' && (
              <button
                onClick={enableNotifications}
                className="w-full mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left flex items-center gap-3"
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
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-600 uppercase">Track token anywhere</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {HOSPITALS.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setSelectedSource(h.id)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase ${
                        selectedSource === h.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-500'
                      }`}
                    >
                      {h.label}
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
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent font-bold text-sm tabular-nums"
                  />
                  <button
                    onClick={handleGlobalTrack}
                    disabled={!globalTokenInput}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    Track
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase text-slate-500">Alert distance</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 5, 10].map((val) => (
                    <button
                      key={val}
                      onClick={() => updateThreshold(val)}
                      className={`py-2 rounded-lg text-[10px] font-bold ${
                        threshold === val
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-400'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Notify when your token is this many numbers away</p>
              </div>

              {tracking ? (
                <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-600/15">
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
                  <p className="text-lg font-black">{tracking.source.toUpperCase()}</p>
                  <p className="text-sm text-slate-500">
                    Token <span className="font-bold text-blue-600 tabular-nums">{tracking.myToken}</span>
                  </p>
                  <button
                    onClick={runTest}
                    className="mt-3 w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Vibrate className="w-4 h-4" /> Test Notification
                  </button>
                </div>
              ) : (
                <button
                  onClick={runTest}
                  className="w-full py-3 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 flex items-center justify-center gap-2"
                >
                  <Vibrate className="w-4 h-4" /> Test Notifications
                </button>
              )}

              <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                Keep QuePulse installed for background alerts. On Android, install the app. On iPhone, use Share → Add to Home Screen.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
