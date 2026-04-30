import React from 'react';
import { motion } from 'motion/react';
import { Hospital, Activity, Building2, MapPin, ChevronRight, Info, AlertCircle } from 'lucide-react';
import { SiteSource } from '../types';

interface LandingPageProps {
  onSelectSite: (site: SiteSource) => void;
}

const SITES = [
  { 
    id: 'hmh' as const, 
    name: 'Hulhumalé Hospital', 
    shortName: 'HMH',
    location: 'Hulhumalé', 
    icon: Hospital, 
    color: 'bg-blue-600',
    description: 'Specialists, GOPD & Diagnostics.'
  },
  { 
    id: 'adk' as const, 
    name: 'ADK Hospital', 
    shortName: 'ADK',
    location: 'Malé', 
    icon: Building2, 
    color: 'bg-red-500',
    description: 'Consultations & Service Queues.'
  },
  { 
    id: 'vitalcare' as const, 
    name: 'Vital Care', 
    shortName: 'VitalCare',
    location: 'Malé', 
    icon: Activity, 
    color: 'bg-teal-500',
    description: 'Premium specialist clinic tokens.'
  },
];

export function LandingPage({ onSelectSite }: LandingPageProps) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
          Medical <br /> <span className="text-blue-600">Dashboard.</span>
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-lg max-w-sm">
          Select a facility to track live queue status and tokens.
        </p>
      </div>

      {/* Sites List - Mobile Hub Feel */}
      <div className="space-y-4">
        {SITES.map((site, index) => (
          <motion.button
            key={site.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectSite(site.id)}
            className="w-full flex items-center gap-5 p-5 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.98] group"
          >
            <div className={`w-14 h-14 ${site.color} rounded-2xl flex items-center justify-center text-white shadow-xl shadow-opacity-20 flex-shrink-0`}>
               <site.icon className="w-8 h-8" />
            </div>
            
            <div className="flex-1 text-left">
               <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {site.location}
               </div>
               <h3 className="text-xl font-black tracking-tighter uppercase leading-none mb-1 group-hover:text-blue-600 transition-colors">{site.name}</h3>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{site.description}</p>
            </div>

            <div className="w-10 h-10 rounded-full bg-white dark:bg-black/20 flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors">
               <ChevronRight className="w-5 h-5" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Info Card */}
      <div className="p-6 rounded-[2rem] bg-blue-600/5 dark:bg-blue-600/10 border border-blue-600/10 flex items-start gap-4">
         <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
            <Info className="w-4 h-4" />
         </div>
         <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-600">Smart Alert System</h4>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              Enable notifications to get a buzz when you are 3 numbers away. No more waiting in lobbies.
            </p>
         </div>
      </div>

      {/* Emergency Quick Action */}
      <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-[2rem] bg-red-600/5 border border-red-600/10 flex flex-col items-center justify-center text-center group active:scale-95 transition-transform cursor-pointer">
              <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
              <span className="text-[8px] font-black uppercase tracking-widest text-red-500">Emergency</span>
              <span className="text-xl font-black tracking-tighter text-red-600">1440</span>
          </div>
          <div className="p-5 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-center active:scale-95 transition-transform cursor-pointer">
              <Activity className="w-6 h-6 text-slate-400 mb-2" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Directory</span>
              <span className="text-xl font-black tracking-tighter uppercase leading-none">Find Dr</span>
          </div>
      </div>
    </div>
  );
}
