import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Hash,
  MapPin,
  Moon,
  Radio,
  Sun,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { SiteSource, UserTracking, Queue } from '../types';
import { HOSPITALS, HOSPITAL_MAP } from '../data/hospitals';
import { getRecentHospitals } from '../lib/recentHospitals';
import { queueService } from '../services/queueService';
import {
  requestNotificationPermission,
  syncTrackingToServiceWorker,
} from '../lib/notifications';
import { recordQueueTimestamps, getRoomEtaText } from '../lib/queueTiming';
import { formatNowServing } from '../lib/queueDisplay';
import { BrandLogo } from './BrandLogo';
import { useTheme } from '../hooks/useTheme';

interface MobileDashboardProps {
  tracking: UserTracking | null;
  onUpdateTracking: (t: UserTracking | null) => void;
  onSelectSite: (site: SiteSource) => void;
  onOpenAlerts: () => void;
  recentVersion?: number;
}

export function MobileDashboard({
  tracking,
  onUpdateTracking,
  onSelectSite,
  onOpenAlerts,
  recentVersion = 0,
}: MobileDashboardProps) {
  const { isDark, toggle } = useTheme();
  const [recent, setRecent] = useState<SiteSource[]>(() => getRecentHospitals());
  const [servingQueue, setServingQueue] = useState<Queue | null>(null);
  const [featuredQueue, setFeaturedQueue] = useState<Queue | null>(null);
  const [featuredEta, setFeaturedEta] = useState<string | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [alertHospital, setAlertHospital] = useState<SiteSource>('hmh');
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem('mv_queue_notify_threshold');
    return saved ? parseInt(saved, 10) : 2;
  });

  useEffect(() => {
    setRecent(getRecentHospitals());
  }, [recentVersion]);

  const featuredId = recent[0] ?? HOSPITALS[0].id;
  const featured = HOSPITAL_MAP[featuredId];

  const otherHospitals = useMemo(
    () => HOSPITALS.filter((h) => h.id !== featuredId),
    [featuredId]
  );

  useEffect(() => {
    if (!tracking) {
      setServingQueue(null);
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
        setServingQueue(match ?? null);
      } catch {
        if (mounted) setServingQueue(null);
      }
    };
    load();
    const id = setInterval(load, 12000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [tracking]);

  useEffect(() => {
    let mounted = true;
    const loadFeatured = async () => {
      setFeaturedLoading(true);
      try {
        const queues = await queueService.getQueuesForSource(featuredId);
        if (!mounted) return;
        recordQueueTimestamps(queues);
        const lead = queues[0] ?? null;
        setFeaturedQueue(lead);
        setFeaturedEta(lead ? getRoomEtaText(lead.id) : null);
      } catch {
        if (mounted) {
          setFeaturedQueue(null);
          setFeaturedEta(null);
        }
      } finally {
        if (mounted) setFeaturedLoading(false);
      }
    };
    loadFeatured();
    const id = setInterval(loadFeatured, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [featuredId]);

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

  const trackingHospital = tracking ? HOSPITAL_MAP[tracking.source] : null;

  return (
    <div className="mobile-dash pb-2">
      <header className="dash-top dash-header flex items-center justify-between gap-3">
        <BrandLogo size="mobile" variant="plain" />
        <button
          type="button"
          onClick={toggle}
          className="dash-icon-btn"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>
      </header>

      {featured && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="dash-section"
        >
          <div className="dash-section-header flex items-center justify-between gap-3">
            <p className="dash-section-label">Continue where you left off</p>
            {featured.live && (
              <span className="live-chip shrink-0">
                <Radio className="w-2.5 h-2.5" />
                Live
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSelectSite(featured.id)}
            className="dash-hero-card dash-card-pad w-full text-left"
            style={
              {
                '--hospital-accent': featured.accent,
                '--hospital-muted': featured.accentMuted,
              } as CSSProperties
            }
          >
            <div className="dash-hero-glow" />
            <div className="relative z-10 dash-stack-loose">
              <div className="flex items-start gap-4">
                <div className="hospital-logo-wrap shrink-0">
                  <img
                    src={featured.logo}
                    alt=""
                    className="w-14 h-14 rounded-2xl object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0 dash-stack-tight">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--muted)] leading-relaxed">
                      {featured.location}
                    </span>
                  </div>
                  <h2 className="text-lg font-black leading-snug tracking-tight">
                    {featured.name}
                  </h2>
                  {featured.tagline && (
                    <p className="text-xs text-[var(--muted)] leading-relaxed">{featured.tagline}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="dash-stat-pill">
                  <p className="dash-stat-label">Now serving</p>
                  <p className="dash-stat-value text-[var(--primary)] text-base leading-tight">
                    {featuredLoading ? '…' : formatNowServing(featuredQueue)}
                  </p>
                </div>
                <div className="dash-stat-pill">
                  <p className="dash-stat-label">Room ETA</p>
                  <p className="dash-stat-value text-base leading-tight">
                    {featuredLoading ? '…' : featuredEta ?? '—'}
                  </p>
                </div>
              </div>

              <span className="dash-hero-cta">
                View live queues
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </button>
        </motion.section>
      )}

      {tracking && trackingHospital && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="dash-section"
        >
          <button
            type="button"
            onClick={() => onSelectSite(tracking.source)}
            className="w-full text-left rounded-2xl dash-card-pad brand-gradient text-white shadow-lg shadow-purple-900/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
          >
            <div className="dash-stack">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-85">
                  Tracking now
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[4.5rem] px-3 py-3 rounded-xl bg-white/15 border border-white/20">
                  <p className="text-[10px] uppercase opacity-75 font-bold leading-relaxed">
                    Your token
                  </p>
                  <p className="text-2xl font-black tabular-nums leading-none mt-1">
                    {tracking.myToken}
                  </p>
                </div>
                <div className="flex-1 min-w-0 dash-stack-tight">
                  <p className="font-bold truncate text-base leading-snug">
                    {trackingHospital.shortName}
                  </p>
                  <p className="text-sm opacity-85 leading-relaxed">
                    Now serving{' '}
                    <span className="font-black tabular-nums">
                      {formatNowServing(servingQueue)}
                    </span>
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 opacity-75 shrink-0" />
              </div>
            </div>
          </button>
        </motion.section>
      )}

      <section className="dash-section" aria-labelledby="quick-alert-heading">
        <div className="dash-section-header">
          <h2 id="quick-alert-heading" className="dash-section-title">
            Quick alert
          </h2>
        </div>
        <div className="dash-glass-card dash-card-pad dash-stack">
          <p className="dash-body">
            Enter your token and get notified when your turn is near.
          </p>

          <div className="chip-scroll" role="group" aria-label="Select hospital">
            {HOSPITALS.slice(0, 6).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setAlertHospital(h.id)}
                className={`region-chip min-h-11 text-xs px-3.5 ${alertHospital === h.id ? 'region-chip-active' : ''}`}
              >
                {alertHospital === h.id && (
                  <span className="region-chip-bg absolute inset-0 rounded-full" />
                )}
                <span className="relative z-10">{h.shortName}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Token number"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="dash-input w-full pl-10 pr-3 min-h-11"
                aria-label="Token number"
              />
            </div>
            <button
              type="button"
              onClick={startQuickTrack}
              disabled={!tokenInput.trim()}
              className="dash-primary-btn px-5 min-h-11 text-sm shrink-0"
            >
              Track
            </button>
          </div>

          <div className="flex gap-2" role="group" aria-label="Alert distance">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setThreshold(n)}
                className={`flex-1 min-h-11 rounded-xl text-xs font-bold transition-colors ${
                  threshold === n
                    ? 'brand-gradient text-white'
                    : 'border border-[var(--border)] text-[var(--muted)] bg-[var(--surface)]'
                }`}
              >
                {n} away
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenAlerts}
            className="w-full min-h-11 text-sm font-semibold text-[var(--primary)] flex items-center justify-center gap-2 rounded-xl hover:bg-[var(--surface)] transition-colors"
          >
            <Bell className="w-4 h-4" /> Advanced alert settings
          </button>
        </div>
      </section>

      <section className="dash-section" aria-labelledby="all-hospitals-heading">
        <div className="dash-section-header flex items-center justify-between gap-3">
          <h2 id="all-hospitals-heading" className="dash-section-title">
            All hospitals
          </h2>
          <span className="text-xs font-semibold text-[var(--muted)] leading-relaxed shrink-0">
            {otherHospitals.length + 1} total
          </span>
        </div>
        <div className="dash-hospital-list">
          {otherHospitals.map((hospital, index) => (
            <motion.button
              key={hospital.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelectSite(hospital.id)}
              className="dash-hospital-row w-full text-left"
              style={
                {
                  '--hospital-accent': hospital.accent,
                  '--hospital-muted': hospital.accentMuted,
                } as CSSProperties
              }
            >
              <div className="hospital-logo-wrap shrink-0">
                <img
                  src={hospital.logo}
                  alt=""
                  className="w-11 h-11 rounded-xl object-contain"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0 dash-stack-tight">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <MapPin className="w-3 h-3 text-[var(--muted)] shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] leading-relaxed">
                    {hospital.location}
                  </span>
                  {hospital.live && (
                    <span className="live-chip py-0">
                      <Radio className="w-2 h-2" />
                      Live
                    </span>
                  )}
                </div>
                <p className="font-bold text-[15px] leading-snug truncate">{hospital.name}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
