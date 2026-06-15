import React from 'react';
import { motion } from 'motion/react';
import { Hospital, Activity, Building2, MapPin, ChevronRight, Phone, AlertCircle } from 'lucide-react';
import { SiteSource } from '../types';
import { DirectoryPanel } from './DirectoryPanel';

interface LandingPageProps {
  onSelectSite: (site: SiteSource) => void;
}

const SITES = [
  { id: 'hmh' as const, name: 'Hulhumalé Hospital', shortName: 'HMH', location: 'Hulhumalé', icon: Hospital, color: 'bg-blue-600', live: true },
  { id: 'adk' as const, name: 'ADK Hospital', shortName: 'ADK', location: 'Malé', icon: Building2, color: 'bg-red-500', live: true },
  { id: 'vitalcare' as const, name: 'Vital Care', shortName: 'VitalCare', location: 'Malé', icon: Activity, color: 'bg-teal-500', live: true },
  { id: 'igmh' as const, name: 'IGMH', shortName: 'IGMH', location: 'Malé', icon: Hospital, color: 'bg-purple-600', live: true },
  { id: 'vilimale' as const, name: 'Vilimale Hospital', shortName: 'Vilimale', location: 'Vilimale', icon: Building2, color: 'bg-orange-500', live: true },
  { id: 'dharumavantha' as const, name: 'Dharumavantha Hospital', shortName: 'Dharumavantha', location: 'Malé', icon: Activity, color: 'bg-green-600', live: true },
];

export function LandingPage({ onSelectSite }: LandingPageProps) {
  const [isDirectoryOpen, setIsDirectoryOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <DirectoryPanel isOpen={isDirectoryOpen} onClose={() => setIsDirectoryOpen(false)} />

      <div>
        <h1 className="text-3xl font-black tracking-tight leading-tight">
          Hospital <span className="text-blue-600">Queues</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Live token tracking · tap a hospital</p>
      </div>

      <div className="space-y-2">
        {SITES.map((site, index) => (
          <motion.button
            key={site.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => onSelectSite(site.id)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/8 active:scale-[0.98] transition-transform"
          >
            <div className={`w-12 h-12 ${site.color} rounded-xl flex items-center justify-center text-white shrink-0`}>
              <site.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold uppercase text-slate-400">{site.location}</span>
                {site.live && (
                  <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Live</span>
                )}
              </div>
              <p className="font-bold text-base truncate">{site.name}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href="tel:119"
          className="p-4 rounded-2xl bg-red-500/10 border border-red-500/15 flex flex-col items-center text-center"
        >
          <AlertCircle className="w-5 h-5 text-red-500 mb-1" />
          <span className="text-[9px] font-bold uppercase text-red-500">Police</span>
          <span className="text-lg font-black text-red-600 tabular-nums">119</span>
        </a>
        <button
          onClick={() => setIsDirectoryOpen(true)}
          className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/15 flex flex-col items-center text-center"
        >
          <Phone className="w-5 h-5 text-indigo-500 mb-1" />
          <span className="text-[9px] font-bold uppercase text-indigo-500">Directory</span>
          <span className="text-sm font-black text-indigo-600">Find Dr</span>
        </button>
      </div>
    </div>
  );
}
