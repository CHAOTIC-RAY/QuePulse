import { motion } from 'motion/react';
import { ChevronRight, MapPin, Radio } from 'lucide-react';
import type { CSSProperties } from 'react';
import { HospitalConfig } from '../data/hospitals';

interface HospitalCardProps {
  hospital: HospitalConfig;
  index: number;
  onSelect: () => void;
}

export function HospitalCard({ hospital, index, onSelect }: HospitalCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="hospital-card group text-left w-full"
      style={{ '--hospital-accent': hospital.accent, '--hospital-muted': hospital.accentMuted } as CSSProperties}
    >
      <div className="hospital-card-glow" />
      <div className="flex items-center gap-3.5 relative z-10">
        <div className="hospital-logo-wrap">
          <img src={hospital.logo} alt="" className="w-11 h-11 rounded-2xl" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="w-3 h-3 text-[var(--muted)]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {hospital.location}
            </span>
            {hospital.live && (
              <span className="live-chip">
                <Radio className="w-2.5 h-2.5" />
                Live
              </span>
            )}
          </div>
          <p className="font-bold text-[15px] leading-tight truncate">{hospital.name}</p>
          {hospital.tagline && (
            <p className="text-[11px] text-[var(--muted)] mt-0.5">{hospital.tagline}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:translate-x-0.5 transition-transform shrink-0" />
      </div>
    </motion.button>
  );
}
