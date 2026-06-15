import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Bell, BellOff, Search, ChevronRight, Clock, History, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { queueService } from '../services/queueService';
import { SiteSource, Queue, UserTracking } from '../types';
import {
  checkTrackingAlert,
  requestNotificationPermission,
  showAlert,
  syncTrackingToServiceWorker,
} from '../lib/notifications';

const SITE_LABELS: Record<SiteSource, string> = {
  hmh: 'HMH',
  vitalcare: 'VitalCare',
  adk: 'ADK',
  igmh: 'IGMH',
  vilimale: 'Vilimale',
  dharumavantha: 'Dharumavantha',
};

interface QueueBoardProps {
  source: SiteSource;
  tracking: UserTracking | null;
  onUpdateTracking: (t: UserTracking | null) => void;
}

function getCategory(name: string, counterInfo: string) {
  const text = `${name} ${counterInfo}`.toUpperCase();
  if (/\bROOM\b/.test(text)) return 'Rooms';
  if (/\bGP\b|\bGOPD\b/.test(text)) return 'OPD';
  if (/\bER\b|EMERGENCY|TRIAGE/.test(text)) return 'Emergency';
  if (/\bLAB\b|SAMPLE|X-?RAY|ULTRASOUND/.test(text)) return 'Diagnostics';
  if (/\bMEMO\b|REGISTRATION/.test(text)) return 'Registration';
  return 'Services';
}

export function QueueBoard({ source, tracking, onUpdateTracking }: QueueBoardProps) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [setupTrackMode, setSetupTrackMode] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [setupThreshold, setSetupThreshold] = useState(() => {
    const saved = localStorage.getItem('mv_queue_notify_threshold');
    return saved ? parseInt(saved, 10) : 2;
  });
  const [historyMap, setHistoryMap] = useState<Record<string, string[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('mv_queue_history') || '{}');
    } catch {
      return {};
    }
  });

  const lastNotificationRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await queueService.getQueuesForSource(source);

      setHistoryMap((prev) => {
        const newMap = { ...prev };
        let changed = false;
        data.forEach((q) => {
          const currentHistory = newMap[q.id] || [];
          if (currentHistory[0] !== q.currentNumber) {
            newMap[q.id] = [q.currentNumber, ...currentHistory].slice(0, 5);
            changed = true;
          }
        });
        if (changed) localStorage.setItem('mv_queue_history', JSON.stringify(newMap));
        return changed ? newMap : prev;
      });

      setQueues(data);

      if (tracking && tracking.source === source) {
        const alert = checkTrackingAlert(tracking, data, lastNotificationRef.current);
        if (alert) {
          lastNotificationRef.current = alert.alertId;
          await showAlert(alert.title, alert.body, { tag: alert.alertId });
        }
      }
    } catch (e) {
      console.error('Fetch error', e);
      setError('Could not load live queues. Pull to refresh or try again.');
    } finally {
      setLoading(false);
    }
  }, [source, tracking]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSaveTracking = async () => {
    if (!setupToken || !activeSelectedQueue) return;
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      alert('Please allow notifications to receive queue alerts.');
    }
    const next: UserTracking = {
      source,
      queueId: activeSelectedQueue.id,
      myToken: setupToken,
      notifyThreshold: setupThreshold,
    };
    onUpdateTracking(next);
    syncTrackingToServiceWorker(next);
    localStorage.setItem('mv_queue_notify_threshold', setupThreshold.toString());
    setSetupTrackMode(false);
    setSelectedQueue(null);
    setSetupToken('');
  };

  const clearTracking = () => {
    onUpdateTracking(null);
    syncTrackingToServiceWorker(null);
    lastNotificationRef.current = null;
  };

  const filteredQueues = queues.filter(
    (q) =>
      q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.counterInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.currentNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(
    new Set(filteredQueues.map((q) => getCategory(q.name, q.counterInfo)))
  ).sort();

  const activeTrackedQueue = queues.find((q) => q.id === tracking?.queueId);
  const activeSelectedQueue = queues.find((q) => q.id === selectedQueue?.id) || selectedQueue;

  if (loading && queues.length === 0) {
    return (
      <div className="space-y-3 px-1">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-40 animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight uppercase">
            {SITE_LABELS[source]}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{queues.length} active counters</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="sticky top-[4.25rem] z-20 -mx-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            inputMode="search"
            placeholder="Search counter, room, token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {filteredQueues.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-slate-500 text-sm">No active queues right now.</p>
          <p className="text-slate-400 text-xs mt-1">Counters appear when tokens are being served.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <section key={cat}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">
                {cat}
              </h3>
              <div className="space-y-2">
                {filteredQueues
                  .filter((q) => getCategory(q.name, q.counterInfo) === cat)
                  .map((queue) => {
                    const isTracked = tracking?.queueId === queue.id;
                    return (
                      <button
                        key={queue.id}
                        type="button"
                        onClick={() => {
                          setSelectedQueue(queue);
                          setSetupTrackMode(false);
                          setSetupToken('');
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                          isTracked
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/8'
                        }`}
                      >
                        <div
                          className={`min-w-[3.5rem] px-2 py-2 rounded-xl text-center font-black text-lg tabular-nums ${
                            isTracked ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600'
                          }`}
                        >
                          {queue.currentNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{queue.name}</p>
                          <p className={`text-[10px] truncate ${isTracked ? 'opacity-80' : 'text-slate-400'}`}>
                            {queue.counterInfo}
                          </p>
                        </div>
                        {isTracked ? (
                          <Bell className="w-4 h-4 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Active tracking bar */}
      <AnimatePresence>
        {tracking && activeTrackedQueue && tracking.source === source && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            className="fixed bottom-[5.5rem] md:bottom-6 left-3 right-3 z-[90] max-w-lg md:left-auto md:right-6"
          >
            <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <div className="text-center px-2">
                <p className="text-[9px] uppercase opacity-70 font-bold">You</p>
                <p className="text-xl font-black tabular-nums">{tracking.myToken}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase opacity-70 font-bold">Tracking</p>
                <p className="font-bold text-sm truncate">{activeTrackedQueue.name}</p>
                <p className="text-xs">
                  Now: <span className="font-black tabular-nums">{activeTrackedQueue.currentNumber}</span>
                </p>
              </div>
              <button
                onClick={clearTracking}
                className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"
              >
                <BellOff className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail sheet */}
      <AnimatePresence>
        {activeSelectedQueue && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[150]"
              onClick={() => setSelectedQueue(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[160] bg-white dark:bg-[#0a0a0a] rounded-t-3xl px-5 pt-3 pb-8 safe-bottom max-h-[85vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-5" />
              <div className="flex justify-between items-start mb-5">
                <div className="min-w-0 pr-4">
                  <h3 className="text-xl font-black leading-tight">{activeSelectedQueue.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{activeSelectedQueue.counterInfo}</p>
                </div>
                <button
                  onClick={() => setSelectedQueue(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-4 rounded-2xl bg-blue-600 text-white text-center">
                  <p className="text-[10px] uppercase opacity-70 font-bold mb-1">Serving</p>
                  <p className="text-3xl font-black tabular-nums">{activeSelectedQueue.currentNumber}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 text-center">
                  <History className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Recent</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {(historyMap[activeSelectedQueue.id] || []).slice(1, 4).map((h, i) => (
                      <span key={i} className="text-xs font-bold text-slate-400 tabular-nums">{h}</span>
                    ))}
                  </div>
                </div>
              </div>

              {tracking?.queueId === activeSelectedQueue.id ? (
                <button
                  onClick={() => { clearTracking(); setSelectedQueue(null); }}
                  className="w-full py-3.5 rounded-xl bg-slate-200 dark:bg-white/10 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <BellOff className="w-4 h-4" /> Stop Alerts
                </button>
              ) : setupTrackMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Your token</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value)}
                      placeholder="e.g. 142"
                      autoFocus
                      className="w-full mt-1.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent font-bold text-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Alert when</label>
                    <div className="grid grid-cols-4 gap-2 mt-1.5">
                      {[1, 2, 3, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSetupThreshold(val)}
                          className={`py-2.5 rounded-xl text-xs font-bold ${
                            setupThreshold === val
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                          }`}
                        >
                          {val} away
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupTrackMode(false)}
                      className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 font-bold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTracking}
                      disabled={!setupToken}
                      className="flex-[2] py-3 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-40"
                    >
                      Enable Alerts
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSetupTrackMode(true)}
                  className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" /> Track My Token
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
