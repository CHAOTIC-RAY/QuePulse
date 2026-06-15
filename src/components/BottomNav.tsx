import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Home, Bell, Hospital } from 'lucide-react';
import { SiteSource } from '../types';

interface BottomNavProps {
  activeTab: 'home' | 'hospitals' | 'alerts';
  hasTracking: boolean;
  onHome: () => void;
  onHospitals: () => void;
  onAlerts: () => void;
}

function NavButton({
  label,
  active,
  onClick,
  layoutId,
  children,
  className = '',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  layoutId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ios-nav-item ${active ? 'ios-nav-item-active' : ''} ${className}`}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      {active && layoutId && (
        <motion.span
          layoutId={layoutId}
          className="ios-nav-glow"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative z-10 flex flex-col items-center gap-0.5">{children}</span>
    </button>
  );
}

export function BottomNav({ activeTab, hasTracking, onHome, onHospitals, onAlerts }: BottomNavProps) {
  const homeActive = activeTab === 'home';
  const hospitalsActive = activeTab === 'hospitals';

  return (
    <nav className="ios-nav lg:hidden safe-bottom" aria-label="Main navigation">
      <div className="ios-nav-split">
        <div className="ios-nav-group">
          <NavButton
            label="Home"
            active={homeActive}
            onClick={onHome}
            layoutId="nav-glow-main"
            className="ios-nav-item-main"
          >
            <Home className="w-5 h-5" strokeWidth={homeActive ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-wide">Home</span>
          </NavButton>

          <NavButton
            label="Hospitals"
            active={hospitalsActive}
            onClick={onHospitals}
            layoutId="nav-glow-main"
            className="ios-nav-item-main"
          >
            <Hospital className="w-5 h-5" strokeWidth={hospitalsActive ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-wide">Hospitals</span>
          </NavButton>
        </div>

        <button
          type="button"
          onClick={onAlerts}
          className={`ios-nav-alerts ${activeTab === 'alerts' ? 'ios-nav-alerts-active' : ''}`}
          aria-label="Alerts"
          aria-current={activeTab === 'alerts' ? 'page' : undefined}
        >
          {activeTab === 'alerts' && (
            <motion.span
              layoutId="nav-glow-alerts"
              className="ios-nav-glow"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex flex-col items-center gap-0.5">
            <span className="relative">
              <Bell className="w-5 h-5" strokeWidth={activeTab === 'alerts' ? 2.5 : 2} />
              {hasTracking && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--nav-glass-bg)]" />
              )}
            </span>
            <span className="text-[9px] font-bold tracking-wide">Alerts</span>
          </span>
        </button>
      </div>
    </nav>
  );
}

export type { SiteSource };
