import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, Settings2, ShieldCheck, ChevronRight, Hash, Trash2, Vibrate } from 'lucide-react';
import { SiteSource, UserTracking } from '../types';

interface TrackingHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentSource: SiteSource | null;
  tracking: UserTracking | null;
  onUpdateTracking: (t: UserTracking | null) => void;
}

export function TrackingHub({ isOpen, onClose, currentSource, tracking, onUpdateTracking }: TrackingHubProps) {
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem('mv_queue_notify_threshold');
    return saved ? parseInt(saved) : 2;
  });
  const [globalTokenInput, setGlobalTokenInput] = useState('');
  const [selectedSource, setSelectedSource] = useState<SiteSource>('hmh');
  const [notifMessage, setNotifMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);

  useEffect(() => {
    if (currentSource) {
      setSelectedSource(currentSource);
    }
  }, [currentSource]);

  const updateThreshold = (val: number) => {
    setThreshold(val);
    if (tracking) {
      onUpdateTracking({ ...tracking, notifyThreshold: val });
    }
    localStorage.setItem('mv_queue_notify_threshold', val.toString());
  };

  const handleGlobalTrack = () => {
    if (!globalTokenInput || !selectedSource) return;
    
    onUpdateTracking({
      source: selectedSource,
      isGlobal: true,
      myToken: globalTokenInput,
      notifyThreshold: threshold
    });
    
    setGlobalTokenInput('');
    if ('Notification' in window) Notification.requestPermission();
  };

  const clearTracking = () => {
    onUpdateTracking(null);
  };

  const testNotification = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test to ensure alerts are working!',
            icon: '/favicon.ico'
          });
          setNotifMessage({text: 'Notification sent successfully!', type: 'success'});
          setTimeout(() => setNotifMessage(null), 3000);
        } else {
          setNotifMessage({text: 'Notifications are blocked or not supported. Try opening the app in a new tab.', type: 'error'});
          setTimeout(() => setNotifMessage(null), 5000);
        }
      });
    } else {
      setNotifMessage({text: 'Notifications are not supported by your browser.', type: 'error'});
      setTimeout(() => setNotifMessage(null), 5000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 z-[210] bg-white dark:bg-[#0a0a0a] rounded-t-[3rem] p-8 pb-12 safe-bottom border-t border-slate-200 dark:border-white/5 max-h-[90vh] overflow-y-auto"
          >
            <div className="w-12 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-8" />
            
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                     <Bell className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Smart Alerts</h3>
               </div>
               <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/5">
                 <X className="w-5 h-5 text-slate-500" />
               </button>
            </div>

            <AnimatePresence>
              {notifMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
                  className={`p-4 rounded-xl flex items-center gap-3 overflow-hidden ${
                    notifMessage.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}
                >
                   <Info className="w-5 h-5 flex-shrink-0" />
                   <p className="text-[10px] font-bold uppercase tracking-widest">{notifMessage.text}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6">
               {/* Global Token Tracking */}
               <div className="p-6 rounded-[2rem] bg-indigo-600/5 dark:bg-indigo-600/10 border border-indigo-600/20">
                  <div className="flex items-center gap-3 mb-4">
                     <Hash className="w-4 h-4 text-indigo-500" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Hospital-Wide tracking</span>
                  </div>
                  <h4 className="font-black text-sm mb-1 uppercase leading-none">Track Token Globally</h4>
                  <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-tight">Monitor any counter in a specific hospital</p>
                  
                  <div className="flex gap-2 mb-3">
                     {(['hmh', 'vitalcare', 'adk'] as SiteSource[]).map(src => (
                       <button
                         key={src}
                         onClick={() => setSelectedSource(src)}
                         className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${
                           selectedSource === src
                           ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                           : 'bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-500'
                         }`}
                       >
                         {src}
                       </button>
                     ))}
                  </div>

                  <div className="flex gap-2">
                     <input 
                       type="text" 
                       placeholder="Token ID..."
                       value={globalTokenInput}
                       onChange={(e) => setGlobalTokenInput(e.target.value)}
                       className="flex-1 min-w-0 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold text-sm"
                     />
                     <button
                       onClick={handleGlobalTrack}
                       disabled={!globalTokenInput}
                       className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-black text-xs uppercase tracking-widest disabled:opacity-50"
                     >
                       Track
                     </button>
                  </div>
               </div>

               {/* Threshold Settings */}
               <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                     <Settings2 className="w-4 h-4 text-blue-600" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alert config</span>
                  </div>
                  <h4 className="font-black text-sm mb-2 uppercase leading-none">Notification Threshold</h4>
                  <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-tight tracking-widest">Buzz me when token is near:</p>
                  
                  <div className="flex justify-between gap-2">
                     {[1, 2, 3, 5, 10].map(val => (
                       <button
                         key={val}
                         onClick={() => updateThreshold(val)}
                         className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all uppercase ${
                           threshold === val 
                           ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                           : 'bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-400'
                         }`}
                       >
                         {val} {val === 1 ? 'Next' : 'Away'}
                       </button>
                     ))}
                  </div>
               </div>

               {/* Active Tracking Status */}
               {tracking ? (
                 <div className="p-6 rounded-[2rem] bg-blue-600/5 dark:bg-blue-600/10 border border-blue-600/20 relative overflow-hidden">
                    <div className="relative z-10">
                       <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4 text-emerald-500" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                {tracking.isGlobal ? 'Global Hub Monitor' : 'Room Monitor'}
                             </span>
                          </div>
                          <button onClick={clearTracking} className="p-1 px-2 rounded-lg bg-red-600/10 text-red-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                             <Trash2 className="w-2.5 h-2.5" /> Stop
                          </button>
                       </div>
                       <div className="flex justify-between items-center">
                          <div>
                             <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">{tracking.source.toUpperCase()}</h4>
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Your Token: <span className="text-blue-600">{tracking.myToken}</span></p>
                          </div>
                          <button onClick={testNotification} className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all">
                             <Vibrate className="w-6 h-6" />
                          </button>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center">
                    <Bell className="w-10 h-10 text-slate-200 dark:text-white/10 mb-4" />
                    <h4 className="font-black uppercase tracking-tighter text-slate-400 leading-none">No Active Monitor</h4>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-2 max-w-[150px]">Select a counter or enter a token above to start tracking.</p>
                    <button onClick={testNotification} className="mt-6 text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                      <Vibrate className="w-3 h-3" /> Test Alerts
                    </button>
                 </div>
               )}

               <div className="flex items-start gap-3 px-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-tight">
                    This uses real-time scrapers. Keep this tab active or pinned for reliable background alerts on your mobile device.
                  </p>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

