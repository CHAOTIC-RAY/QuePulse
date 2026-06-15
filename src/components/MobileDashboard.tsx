import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, ChevronRight, Clock, Hash, Zap } from 'lucide-react';
import { SiteSource, UserTracking } from '../types';
import { HOSPITALS, HOSPITAL_MAP } from '../data/hospitals';
import { getRecentHospitals } from '../lib/recentHospitals';
import { queueService } from '../services/queueService';
import {
  requestNotificationPermission,
  syncTrackingToServiceWorker,
} from '../lib/notifications';

interface MobileDashboardProps {
  tracking: UserTracking | null;
  onUpdateTracking: (t: UserTracking | null) => void;
  onSelectSite: (site: SiteSource) => void;
  onOpenAlerts: () => void;
}

export function MobileDashboard({
  tracking,
  onUpdateTracking,
  onSelectSite,
  onOpenAlerts,
}: MobileDashboardProps) {
  const [recent, setRecent] = useState<SiteSource[]>(() => getRecentHospitals());
  const [serving, setServing] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [alertHospital, setAlertHospital] = useState<SiteSource>('hmh');
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem('mv_queue_notify_threshold');
    return saved ? parseInt(saved, 10) : 2;
  });

  useEffect(() => {
    setRecent(getRecentHospitals());
  }, []);

  useEffect(() => {
    if (!tracking) {
      setServing(null);
      return;
    }
    let mounted = true;
    const load = async () => {
      try {
        const queues = await queueService.getQueuesForSource(tracking.source);
        if (!mounted) return;
        const match = tracking.queueId
          ? queues.find((q) => q.id === tracking.queueId)
          : queues[0];
        setServing(match?.currentNumber ?? null);
      } catch {
        if (mounted) setServing(null);
      }
    };
    load();
    const id = setInterval(load, 12000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [tracking]);

  const startQuickTrack = async () => {
    if (!tokenInput.trim()) return;
    await requestNotificationPermission();
    const next: UserTracking = {
      source: alertHospital,
      isGlobal: true,
      myToken: tokenInput.trim(),
      notifyThreshold: threshold,
    };
    onUpdateTracking(next);
    syncTrackingToServiceWorker(next);
    localStorage.setItem('mv_queue_notify_threshold', String(threshold));
    setTokenInput('');
  };

  const hospital = tracking ? HOSPITAL_MAP[tracking.source] : null;

  return (
    <div className="space-y-4 pb-2">
      {tracking && hospital && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onSelectSite(tracking.source)}
          className="w-full text-left rounded-2xl p-4 brand-gradient text-white shadow-lg shadow-purple-900/25"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Tracking now</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center min-w-[4rem] px-2 py-2 rounded-xl bg-white/15 border border-white/20">
              <p className="text-[9px] uppercase opacity-70 font-bold">Your token</p>
              <p className="text-2xl font-black tabular-nums leading-none mt-0.5">{tracking.myToken}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{hospital.shortName}</p>
              <p className="text-xs opacity-80 mt-0.5">
                Now serving{' '}
                <span className="font-black tabular-nums">{serving ?? '…'}</span>
              </p>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70 shrink-0" />
          </div>
        </motion.button>
      )}

      <section
        className="rounded-2xl p-4 border border-[var(--border)]"
        style={{ background: 'var(--surface-elevated)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-bold">Quick alert</h2>
        </div>
        <div className="chip-scroll mb-3">
          {HOSPITALS.slice(0, 6).map((h) => (
            <button
              key={h.id}
              onClick={() => setAlertHospital(h.id)}
              className={`relative region-chip text-[10px] px-2.5 py-1.5 ${alertHospital === h.id ? 'region-chip-active' : ''}`}
            >
              {alertHospital === h.id && <span className="region-chip-bg absolute inset-0 rounded-full" />}
              <span className="relative z-10">{h.shortName}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Token number"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-transparent text-sm font-bold tabular-nums"
            />
          </div>
          <button
            onClick={startQuickTrack}
            disabled={!tokenInput.trim()}
            className="px-4 rounded-xl brand-gradient text-white text-xs font-bold disabled:opacity-40"
          >
            Track
          </button>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 5].map((n) => (
            <button
              key={n}
              onClick={() => setThreshold(n)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold ${
                threshold === n ? 'brand-gradient text-white' : 'border border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {n} away
            </button>
          ))}
        </div>
        <button
          onClick={onOpenAlerts}
          className="mt-3 w-full py-2 text-[10px] font-semibold text-[var(--primary)] flex items-center justify-center gap-1"
        >
          <Bell className="w-3 h-3" /> Advanced alert settings
        </button>
      </section>

      {recent.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Recent</h2>
          </div>
          <div className="space-y-2">
            {recent.map((id) => {
              const h = HOSPITAL_MAP[id];
              if (!h) return null;
              return (
                <button
                  key={id}
                  onClick={() => onSelectSite(id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] active:scale-[0.98] transition-transform"
                  style={{ background: 'var(--surface-elevated)' }}
                >
                  <img src={h.logo} alt="" className="w-10 h-10 rounded-xl object-contain" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-bold text-sm truncate">{h.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">{h.location}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
