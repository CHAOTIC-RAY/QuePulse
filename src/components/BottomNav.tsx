import { motion } from 'motion/react';
import { Home, Bell, Hospital } from 'lucide-react';
import { SiteSource } from '../types';

interface BottomNavProps {
  activeTab: 'home' | 'hospitals' | 'alerts';
  hasTracking: boolean;
  onHome: () => void;
  onHospitals: () => void;
  onAlerts: () => void;
}

export function BottomNav({ activeTab, hasTracking, onHome, onHospitals, onAlerts }: BottomNavProps) {
  const items = [
    { id: 'home' as const, label: 'Home', icon: Home, onClick: onHome },
    { id: 'hospitals' as const, label: 'Hospitals', icon: Hospital, onClick: onHospitals },
    { id: 'alerts' as const, label: 'Alerts', icon: Bell, onClick: onAlerts },
  ];

  return (
    <nav className="ios-nav lg:hidden safe-bottom">
      <div className="ios-nav-pill">
        {items.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`ios-nav-item ${active ? 'ios-nav-item-active' : ''}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="nav-glow"
                  className="ios-nav-glow"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  {item.id === 'alerts' && hasTracking && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--nav-glass-bg)]" />
                  )}
                </span>
                <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type { SiteSource };
