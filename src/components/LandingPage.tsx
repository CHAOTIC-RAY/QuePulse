import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Hospital, Activity, Building2, MapPin, ChevronRight, Info, AlertCircle, Phone } from 'lucide-react';
import { SiteSource } from '../types';
import { DirectoryPanel } from './DirectoryPanel';

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
  { 
    id: 'igmh' as const, 
    name: 'IGMH', 
    shortName: 'IGMH',
    location: 'Malé', 
    icon: Hospital, 
    color: 'bg-purple-600',
    description: 'Indira Gandhi Memorial Hospital.'
  },
  { 
    id: 'vilimale' as const, 
    name: 'Vilimale Hospital', 
    shortName: 'Vilimale',
    location: 'Vilimale', 
    icon: Building2, 
    color: 'bg-orange-500',
    description: 'Male\' City Group - Vilimale.'
  },
  { 
    id: 'dharumavantha' as const, 
    name: 'Dharumavantha Hospital', 
    shortName: 'Dharumavantha',
    location: 'Malé', 
    icon: Activity, 
    color: 'bg-green-600',
    description: 'Male\' City Group - Dharumavantha.'
  },
];

export function LandingPage({ onSelectSite }: LandingPageProps) {
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
      }}
      className="space-y-10 relative"
    >
      <DirectoryPanel isOpen={isDirectoryOpen} onClose={() => setIsDirectoryOpen(false)} />
      {/* Header Info */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20, scale: 0.95 },
          show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.5 } }
        }}
        className="space-y-2"
      >
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
          Medical <br /> <span className="text-blue-600">Dashboard.</span>
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-lg max-w-sm">
          Select a facility to track live queue status and tokens.
        </p>
      </motion.div>

      {/* Sites List - Mobile Hub Feel */}
      <div className="space-y-4">
        {SITES.map((site, index) => (
          <motion.button
            key={site.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectSite(site.id)}
            className="w-full flex items-center gap-5 p-5 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all hover:bg-slate-100 dark:hover:bg-white/10 transform-gpu group"
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
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20, scale: 0.95 },
          show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.5 } }
        }}
        className="grid grid-cols-2 gap-4 pb-8"
      >
          <motion.a 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="tel:119" 
            className="p-5 rounded-[2rem] bg-red-600/5 border border-red-600/10 flex flex-col items-center justify-center text-center group cursor-pointer transform-gpu"
          >
              <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
              <span className="text-[8px] font-black uppercase tracking-widest text-red-500">Police</span>
              <span className="text-xl font-black tracking-tighter text-red-600">119</span>
          </motion.a>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDirectoryOpen(true)} 
            className="p-5 rounded-[2rem] bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/5 flex flex-col items-center justify-center text-center cursor-pointer group hover:bg-indigo-100 hover:border-indigo-300 transform-gpu"
          >
              <Phone className="w-6 h-6 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Directory</span>
              <span className="text-xl font-black tracking-tighter uppercase leading-none text-indigo-600">Find Dr</span>
          </motion.div>
      </motion.div>
    </motion.div>
  );
}
