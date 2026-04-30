import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, X, AlertTriangle, Building2, Zap, Search } from 'lucide-react';
import { directoryData } from '../data/directory';

interface DirectoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DirectoryPanel({ isOpen, onClose }: DirectoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const formatKeyName = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const processObjectToItems = (obj: any, cat: string) => {
    return Object.entries(obj)
      .filter(([key, val]) => typeof val === 'string' && key !== 'national_emergency')
      .map(([key, val]) => ({
        name: formatKeyName(key),
        phone: val as string,
        category: cat
      }));
  };

  const allHospitals = [
    ...directoryData.hospitals.male_region.map(h => ({ ...h, category: 'Male Region Hospitals' })),
    ...directoryData.hospitals.regional_atoll.map(h => ({ ...h, category: 'Regional Atoll Hospitals' }))
  ];

  const emergencyItems = processObjectToItems(directoryData.emergency_services, 'Emergency Services');
  const utilityItems = processObjectToItems(directoryData.utility_and_support, 'Utility & Support');

  const allItems = [...emergencyItems, ...utilityItems, ...allHospitals];

  const filteredItems = allItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.phone.includes(searchTerm) ||
    ('atoll' in item && typeof item.atoll === 'string' && item.atoll.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ y: '100%', scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%', scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            className="fixed bottom-0 left-0 right-0 z-[210] bg-zinc-50 dark:bg-[#0a0a0a] rounded-t-[3rem] h-[85vh] flex flex-col border-t border-slate-200 dark:border-white/5 overflow-hidden transform-gpu origin-bottom"
          >
            {/* Header Sticky */}
            <div className="flex-shrink-0 px-8 pt-8 pb-4 bg-white dark:bg-[#0a0a0a] z-10 border-b border-slate-100 dark:border-white/5">
              <div className="w-12 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-6" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Directory</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Hospitals & Emergency</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search directory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-transparent outline-none focus:bg-white dark:focus:bg-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm"
                />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 safe-bottom">
               
               {/* 1. Emergency */}
               {(!searchTerm || filteredItems.some(i => i.category === 'Emergency Services')) && (
                 <section>
                    <div className="flex items-center gap-2 mb-4">
                       <AlertTriangle className="w-4 h-4 text-red-500" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">Emergency Services</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {filteredItems.filter(i => i.category === 'Emergency Services').map((item, idx) => (
                         <motion.a 
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.95 }}
                           key={idx} 
                           href={`tel:${item.phone}`} 
                           className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex justify-between items-center transform-gpu"
                         >
                            <span className="font-bold text-sm">{item.name}</span>
                            <span className="font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-lg text-sm">{item.phone}</span>
                         </motion.a>
                       ))}
                    </div>
                 </section>
               )}

               {/* 2. Male Region Hospitals */}
               {(!searchTerm || filteredItems.some(i => i.category === 'Male Region Hospitals')) && (
                 <section>
                    <div className="flex items-center gap-2 mb-4">
                       <Building2 className="w-4 h-4 text-blue-500" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Male' Region Hospitals</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {filteredItems.filter(i => i.category === 'Male Region Hospitals').map((item, idx) => (
                         <motion.a 
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.95 }}
                           key={idx} 
                           href={`tel:${item.phone}`} 
                           className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex justify-between items-center group transform-gpu"
                         >
                            <div className="flex flex-col">
                              <span className="font-bold text-sm group-hover:text-blue-500 transition-colors line-clamp-1">{item.name}</span>
                              {'location' in item && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.location}</span>}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg text-xs whitespace-nowrap">{item.phone}</span>
                              {'emergency_ambulance' in item && item.emergency_ambulance && (
                                <span className="font-black text-red-500 text-[9px] uppercase tracking-widest border border-red-500/20 px-1.5 py-0.5 rounded">Amb: {item.emergency_ambulance}</span>
                              )}
                            </div>
                         </motion.a>
                       ))}
                    </div>
                 </section>
               )}

               {/* 3. Regional Atoll Hospitals */}
               {(!searchTerm || filteredItems.some(i => i.category === 'Regional Atoll Hospitals')) && (
                 <section>
                    <div className="flex items-center gap-2 mb-4">
                       <Building2 className="w-4 h-4 text-emerald-500" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Atoll Hospitals</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {filteredItems.filter(i => i.category === 'Regional Atoll Hospitals').map((item, idx) => (
                         <motion.a 
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.95 }}
                           key={idx} 
                           href={`tel:${item.phone}`} 
                           className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex justify-between items-center group transform-gpu"
                         >
                            <div className="flex flex-col">
                              <span className="font-bold text-sm group-hover:text-emerald-500 transition-colors line-clamp-1">{item.name}</span>
                              {'atoll' in item && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.atoll}</span>}
                            </div>
                            <span className="font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg text-xs whitespace-nowrap">{item.phone}</span>
                         </motion.a>
                       ))}
                    </div>
                 </section>
               )}

               {/* 4. Utilities */}
               {(!searchTerm || filteredItems.some(i => i.category === 'Utility & Support')) && (
                 <section>
                    <div className="flex items-center gap-2 mb-4">
                       <Zap className="w-4 h-4 text-amber-500" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Utilities & Support</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {filteredItems.filter(i => i.category === 'Utility & Support').map((item, idx) => (
                         <motion.a 
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.95 }}
                           key={idx} 
                           href={`tel:${item.phone}`} 
                           className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex justify-between items-center transform-gpu hover:border-amber-500/30"
                         >
                            <span className="font-bold text-sm">{item.name}</span>
                            <span className="font-black text-amber-600 bg-amber-500/10 px-3 py-1 rounded-lg text-sm whitespace-nowrap">{item.phone}</span>
                         </motion.a>
                       ))}
                    </div>
                 </section>
               )}

               {filteredItems.length === 0 && (
                 <div className="py-12 text-center flex flex-col items-center">
                   <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                     <Search className="w-8 h-8 text-slate-400" />
                   </div>
                   <p className="text-sm font-bold text-slate-500">No contacts found for "{searchTerm}"</p>
                 </div>
               )}
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
