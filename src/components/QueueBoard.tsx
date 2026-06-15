import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Bell, BellOff, Search, ChevronRight, History, X, RefreshCw, AlertTriangle, ArrowLeft, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { queueService } from '../services/queueService';
import { SiteSource, Queue, UserTracking } from '../types';
import { HOSPITAL_MAP } from '../data/hospitals';
import { CategoryChips } from './CategoryChips';
import { getQueueCategory, sortCategories, QueueCategory } from '../lib/categories';
import {
  recordQueueTimestamps,
  enrichQueuesWithPriority,
  getRoomEtaText,
  getWaitEtaText,
} from '../lib/queueTiming';
import { isNativeApp } from '../lib/platform';
import {
  checkTrackingAlert,
  requestNotificationPermission,
  showAlert,
  syncTrackingToServiceWorker,
} from '../lib/notifications';
import { getAlwaysOnNotifications } from '../lib/alwaysOn';

interface QueueBoardProps {
  source: SiteSource;
  tracking: UserTracking | null;
  onUpdateTracking: (t: UserTracking | null) => void;
  onBack?: () => void;
}

export function QueueBoard({ source, tracking, onUpdateTracking, onBack }: QueueBoardProps) {
  const hospital = HOSPITAL_MAP[source];
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<QueueCategory>('All');
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
      const tokenHistory = recordQueueTimestamps(data);
      const enriched = enrichQueuesWithPriority(data, tokenHistory);
      setHistoryMap(tokenHistory);
      setQueues(enriched);

      if (tracking && tracking.source === source && !isNativeApp()) {
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
    setCategory('All');
    setSearchTerm('');
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
      alwaysOnNotifications: getAlwaysOnNotifications(),
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

  const filteredQueues = queues.filter((q) => {
    const matchesSearch =
      q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.counterInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.currentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const cat = getQueueCategory(q.name, q.counterInfo, source);
    const matchesCategory = category === 'All' || cat === category;
    return matchesSearch && matchesCategory;
  });

  const availableCategories = sortCategories(
    Array.from(
      new Set(queues.map((q) => getQueueCategory(q.name, q.counterInfo, source)))
    ) as Exclude<QueueCategory, 'All'>[]
  );

  const grouped = availableCategories
    .filter((cat) => category === 'All' || cat === category)
    .map((cat) => ({
      cat,
      items: filteredQueues.filter((q) => getQueueCategory(q.name, q.counterInfo, source) === cat),
    }))
    .filter((g) => g.items.length > 0);

  const activeTrackedQueue = queues.find((q) => q.id === tracking?.queueId);
  const activeSelectedQueue = queues.find((q) => q.id === selectedQueue?.id) || selectedQueue;

  if (loading && queues.length === 0) {
    return (
      <div className="space-y-3 px-1">
        <div className="h-8 bg-[var(--surface)] rounded-lg w-40 animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-[var(--surface)] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32 md:pb-8">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] min-h-11 -ml-1 px-1 safe-top focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <img src={hospital.logo} alt="" className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">{hospital.name}</h2>
            <p className="text-xs text-[var(--muted)]">{hospital.location}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border)]"
          style={{ background: 'var(--surface)' }}
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </motion.div>

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/20 text-amber-700 dark:text-amber-400"
          style={{ background: 'rgba(249,168,37,0.1)' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      <div className="sticky top-0 lg:top-[4.25rem] z-20 space-y-2.5 -mx-1 pt-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="search"
            inputMode="search"
            placeholder="Search counter, room, token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none border border-[var(--border)] focus:border-[var(--primary)]"
            style={{ background: 'var(--surface-elevated)' }}
          />
        </div>
        {availableCategories.length > 1 && (
          <CategoryChips
            categories={availableCategories}
            selected={category}
            onSelect={setCategory}
          />
        )}
      </div>

      {filteredQueues.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-[var(--muted)] text-sm">No active queues right now.</p>
          <p className="text-[var(--muted)] text-xs mt-1 opacity-70">
            Counters appear when tokens are being served.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat, items }) => (
            <section key={cat}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-2 px-1">
                {cat}
              </h3>
              <div className="space-y-2">
                {items.map((queue, i) => {
                  const isTracked = tracking?.queueId === queue.id;
                  const roomEta = getRoomEtaText(queue.id);
                  return (
                    <motion.button
                      key={queue.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      type="button"
                      onClick={() => {
                        setSelectedQueue(queue);
                        setSetupTrackMode(false);
                        setSetupToken('');
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98] border ${
                        isTracked
                          ? 'queue-row-tracked border-transparent'
                          : 'border-[var(--border)]'
                      }`}
                      style={isTracked ? undefined : { background: 'var(--surface-elevated)' }}
                    >
                      <div
                        className={`min-w-[3.5rem] px-2 py-2 rounded-xl text-center font-black text-lg tabular-nums ${
                          isTracked ? 'bg-white/20 text-white' : 'queue-token-pill'
                        }`}
                      >
                        {queue.currentNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className="font-bold text-sm truncate">{queue.name}</p>
                          {queue.isPriority && (
                            <span className="priority-chip shrink-0">
                              <Zap className="w-2.5 h-2.5" />
                              Priority number
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] truncate ${isTracked ? 'opacity-80' : 'text-[var(--muted)]'}`}>
                          {queue.counterInfo}
                        </p>
                        <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isTracked ? 'opacity-75' : 'text-[var(--primary)]'}`}>
                          <Clock className="w-3 h-3 shrink-0" />
                          {roomEta}
                        </p>
                      </div>
                      {isTracked ? (
                        <Bell className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {tracking && activeTrackedQueue && tracking.source === source && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            className="fixed bottom-[6.5rem] md:bottom-6 left-3 right-3 z-[90] max-w-lg md:left-auto md:right-6"
          >
            <div className="brand-gradient text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <div className="text-center px-2">
                <p className="text-[9px] uppercase opacity-70 font-bold">You</p>
                <p className="text-xl font-black tabular-nums">{tracking.myToken}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase opacity-70 font-bold">Tracking</p>
                <p className="font-bold text-sm truncate">{activeTrackedQueue.name}</p>
                <p className="text-xs">
                  Now: <span className="font-black tabular-nums">{activeTrackedQueue.currentNumber}</span>
                  {tracking.myToken && (
                    <span className="opacity-80">
                      {' '}
                      · ETA{' '}
                      {getWaitEtaText(
                        activeTrackedQueue.id,
                        tracking.myToken,
                        activeTrackedQueue.currentNumber
                      )}
                    </span>
                  )}
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

      <AnimatePresence>
        {activeSelectedQueue && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[150] backdrop-blur-sm"
              onClick={() => setSelectedQueue(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[160] rounded-t-3xl px-5 pt-3 pb-8 safe-bottom max-h-[85vh] overflow-y-auto sheet-surface"
            >
              <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-5" />
              <div className="flex justify-between items-start mb-5">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-xl font-black leading-tight">{activeSelectedQueue.name}</h3>
                    {activeSelectedQueue.isPriority && (
                      <span className="priority-chip">
                        <Zap className="w-2.5 h-2.5" />
                        Priority number
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">{activeSelectedQueue.counterInfo}</p>
                </div>
                <button
                  onClick={() => setSelectedQueue(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-[var(--border)]"
                  style={{ background: 'var(--surface)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-4 rounded-2xl brand-gradient text-white text-center">
                  <p className="text-[10px] uppercase opacity-70 font-bold mb-1">Serving</p>
                  <p className="text-3xl font-black tabular-nums">{activeSelectedQueue.currentNumber}</p>
                </div>
                <div className="p-4 rounded-2xl text-center border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                  <Clock className="w-4 h-4 mx-auto text-[var(--primary)] mb-1" />
                  <p className="text-[10px] uppercase text-[var(--muted)] font-bold mb-1">Room pace</p>
                  <p className="text-sm font-black text-[var(--primary)]">{getRoomEtaText(activeSelectedQueue.id)}</p>
                </div>
              </div>

              {tracking?.queueId === activeSelectedQueue.id && tracking.myToken && (
                <div className="mb-5 p-3 rounded-xl border border-[var(--border)] flex items-center gap-2" style={{ background: 'var(--surface)' }}>
                  <Clock className="w-4 h-4 text-[var(--primary)] shrink-0" />
                  <p className="text-sm">
                    <span className="font-bold">Your wait: </span>
                    {getWaitEtaText(
                      activeSelectedQueue.id,
                      tracking.myToken,
                      activeSelectedQueue.currentNumber
                    )}
                  </p>
                </div>
              )}

              <div className="mb-5 p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                <History className="w-4 h-4 text-[var(--muted)] mb-1" />
                <p className="text-[10px] uppercase text-[var(--muted)] font-bold mb-1">Recent tokens</p>
                <div className="flex flex-wrap gap-1.5">
                  {(historyMap[activeSelectedQueue.id] || []).slice(1, 5).map((h, i) => (
                    <span key={i} className="text-xs font-bold text-[var(--muted)] tabular-nums px-2 py-0.5 rounded-lg border border-[var(--border)]">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {tracking?.queueId === activeSelectedQueue.id ? (
                <button
                  onClick={() => {
                    clearTracking();
                    setSelectedQueue(null);
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-[var(--border)]"
                  style={{ background: 'var(--surface)' }}
                >
                  <BellOff className="w-4 h-4" /> Stop Alerts
                </button>
              ) : setupTrackMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">Your token</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value)}
                      placeholder="e.g. 142"
                      autoFocus
                      className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[var(--border)] bg-transparent font-bold text-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">Alert when</label>
                    <div className="grid grid-cols-4 gap-2 mt-1.5">
                      {[1, 2, 3, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSetupThreshold(val)}
                          className={`py-2.5 rounded-xl text-xs font-bold ${
                            setupThreshold === val
                              ? 'brand-gradient text-white'
                              : 'border border-[var(--border)] text-[var(--muted)]'
                          }`}
                          style={setupThreshold === val ? undefined : { background: 'var(--surface)' }}
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
                      className="flex-1 py-3 rounded-xl font-bold text-sm border border-[var(--border)]"
                      style={{ background: 'var(--surface)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTracking}
                      disabled={!setupToken}
                      className="flex-[2] py-3 rounded-xl brand-gradient text-white font-bold text-sm disabled:opacity-40"
                    >
                      Enable Alerts
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSetupTrackMode(true)}
                  className="w-full py-3.5 rounded-xl brand-gradient text-white font-bold text-sm flex items-center justify-center gap-2"
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
