import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Phone } from 'lucide-react';
import { SiteSource } from '../types';
import { DirectoryPanel } from './DirectoryPanel';
import { HospitalCard } from './HospitalCard';
import { HOSPITALS, REGIONS, HospitalRegion } from '../data/hospitals';

interface LandingPageProps {
  onSelectSite: (site: SiteSource) => void;
}

export function LandingPage({ onSelectSite }: LandingPageProps) {
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [region, setRegion] = useState<HospitalRegion | 'all'>('all');

  const filtered = useMemo(
    () => (region === 'all' ? HOSPITALS : HOSPITALS.filter((h) => h.region === region)),
    [region]
  );

  return (
    <div className="space-y-5">
      <DirectoryPanel isOpen={isDirectoryOpen} onClose={() => setIsDirectoryOpen(false)} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-1 lg:pt-0"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-2 lg:hidden">
          Maldives · Live queues
        </p>
        <h1 className="text-[2rem] lg:text-4xl leading-[1.05] font-black tracking-tight">
          Track your <span className="brand-text-gradient">hospital queue</span>
        </h1>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-xl">
          Real-time tokens from {HOSPITALS.length} hospitals. Tap a card to view counters and set smart alerts.
        </p>
      </motion.div>

      <div className="chip-scroll">
        {REGIONS.map((r) => {
          const active = region === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setRegion(r.id)}
              className={`region-chip ${active ? 'region-chip-active' : ''}`}
            >
              {active && (
                <motion.span
                  layoutId="region-chip-bg"
                  className="region-chip-bg"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 lg:gap-3">
        {filtered.map((hospital, index) => (
          <div key={hospital.id}>
            <HospitalCard
              hospital={hospital}
              index={index}
              onSelect={() => onSelectSite(hospital.id)}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 pb-2 max-w-md lg:max-w-xs">
        <a
          href="tel:119"
          className="p-4 rounded-[1.25rem] flex flex-col items-center text-center border border-red-500/15"
          style={{ background: 'rgba(239,68,68,0.08)' }}
        >
          <AlertCircle className="w-5 h-5 text-red-500 mb-1" />
          <span className="text-[9px] font-bold uppercase text-red-500">Emergency</span>
          <span className="text-lg font-black text-red-600 tabular-nums">119</span>
        </a>
        <button
          onClick={() => setIsDirectoryOpen(true)}
          className="p-4 rounded-[1.25rem] flex flex-col items-center text-center border border-[var(--border)]"
          style={{ background: 'var(--surface)' }}
        >
          <Phone className="w-5 h-5 text-[var(--primary)] mb-1" />
          <span className="text-[9px] font-bold uppercase text-[var(--muted)]">Directory</span>
          <span className="text-sm font-black text-[var(--primary)]">Find a doctor</span>
        </button>
      </div>
    </div>
  );
}
