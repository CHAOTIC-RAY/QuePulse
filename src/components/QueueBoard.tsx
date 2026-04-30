import { useState, useEffect, useRef } from 'react';
import { Users, Loader2, Bell, BellOff, Search, ChevronRight, MapPin, Hospital, Activity, Clock, History, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { queueService } from '../services/queueService';
import { SiteSource, Queue, UserTracking } from '../types';

interface QueueBoardProps {
  source: SiteSource;
  tracking: UserTracking | null;
  onUpdateTracking: (t: UserTracking | null) => void;
}

export function QueueBoard({ source, tracking, onUpdateTracking }: QueueBoardProps) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [setupTrackMode, setSetupTrackMode] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [setupThreshold, setSetupThreshold] = useState(2);
  const [historyMap, setHistoryMap] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('mv_queue_history');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [myTokenInput, setMyTokenInput] = useState('');
  const lastNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let data: Queue[] = [];
        if (source === 'hmh') data = await queueService.getExternalHMHQueues();
        else if (source === 'vitalcare') data = await queueService.getExternalVitalCareQueues();
        else if (source === 'adk') data = await queueService.getExternalADKQueues();
        
        // Update history
        setHistoryMap(prev => {
          const newMap = { ...prev };
          let changed = false;
          
          let timesMap: Record<string, {token: string, time: number}[]> = {};
          try {
            const savedTimes = localStorage.getItem('mv_queue_history_times');
            if (savedTimes) timesMap = JSON.parse(savedTimes);
          } catch(e) {}

          data.forEach(q => {
            const currentHistory = newMap[q.id] || [];
            if (currentHistory[0] !== q.currentNumber) {
              const updated = [q.currentNumber, ...currentHistory].slice(0, 5);
              newMap[q.id] = updated;
              
              // update times history
              const tHist = timesMap[q.id] || [];
              const tUpdate = [{ token: q.currentNumber, time: Date.now() }, ...tHist].slice(0, 10);
              timesMap[q.id] = tUpdate;
              
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem('mv_queue_history', JSON.stringify(newMap));
            localStorage.setItem('mv_queue_history_times', JSON.stringify(timesMap));
          }
          return newMap;
        });

        setQueues(data);
        
        if (tracking && tracking.source === source) {
          const target = parseInt(tracking.myToken.replace(/\D/g, ''));
          
          if (tracking.isGlobal) {
            // Search all counters in current source
            data.forEach(q => {
              const current = parseInt(q.currentNumber.replace(/\D/g, ''));
              if (!isNaN(current) && !isNaN(target)) {
                const diff = target - current;
                if (diff <= tracking.notifyThreshold && diff >= 0) {
                   const notifId = `global-${q.id}-${q.currentNumber}`;
                   if (lastNotificationRef.current !== notifId) {
                     sendNotification(
                       `Global Match at ${q.name}`,
                       `Token ${q.currentNumber} is now serving. You are close!`
                     );
                     lastNotificationRef.current = notifId;
                   }
                }
              }
            });
          } else {
            const matchedQueue = data.find(q => q.id === tracking.queueId);
            if (matchedQueue) {
              const current = parseInt(matchedQueue.currentNumber.replace(/\D/g, ''));
              if (!isNaN(current) && !isNaN(target)) {
                const diff = target - current;
                if (diff <= tracking.notifyThreshold && diff >= 0) {
                  const notifId = `${tracking.queueId}-${matchedQueue.currentNumber}`;
                  if (lastNotificationRef.current !== notifId) {
                    sendNotification(
                      `Queue Alert: ${matchedQueue.name}`,
                      `Current: ${matchedQueue.currentNumber}. Your turn is next!`
                    );
                    lastNotificationRef.current = notifId;
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Fetch error', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [source, tracking]);

  const handleSaveTracking = () => {
    if (!setupToken) return;
    
    onUpdateTracking({
      source,
      queueId: activeSelectedQueue?.id,
      myToken: setupToken,
      notifyThreshold: setupThreshold
    });
    
    // Save threshold for future as well
    localStorage.setItem('mv_queue_notify_threshold', setupThreshold.toString());
    
    if ('Notification' in window) Notification.requestPermission();
    setSetupTrackMode(false);
    setSelectedQueue(null);
  };

  const clearTracking = () => {
    onUpdateTracking(null);
  };

  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  const getCategory = (name: string) => {
     if (name.includes('GP')) return 'General Practice';
     if (name.includes('GOPD')) return 'General OPD';
     if (name.includes('MH') || name.includes('PSY')) return 'Mental Health';
     if (name.includes('SPECIALIST') || name.includes('ROOM')) return 'Specialists';
     return 'Main Services';
  };

  const filteredQueues = queues.filter(q => 
    q.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.counterInfo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(filteredQueues.map(q => getCategory(q.name)))).sort();
  const activeTrackedQueue = queues.find(q => q.id === tracking?.queueId);
  const activeSelectedQueue = queues.find(q => q.id === selectedQueue?.id) || selectedQueue;

  if (loading && queues.length === 0) {
    return (
      <div className="space-y-8">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-48 animate-pulse"></div>
        <div className="space-y-4">
           {[1,2,3,4,5].map(i => (
             <div key={i} className="h-20 bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse"></div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Site Info Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/10 rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Live Scraped</span>
           </div>
           {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </div>
        
        <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">
          {source === 'hmh' ? 'HMH' : source === 'vitalcare' ? 'VitalCare' : 'ADK'} <br />
          <span className="text-slate-400">QUEUES.</span>
        </h2>
      </div>

      {/* Search Input - Desktop/Mobile unified */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by specialty, doctor or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 focus:border-blue-500/50 rounded-2xl py-4 pl-12 pr-6 outline-none transition-all font-bold text-sm"
        />
      </div>

      {/* Categorized Counter List */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.05 } }
        }}
        className="space-y-10"
      >
        {categories.map(cat => (
          <div key={cat} className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
              {cat}
              <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
              {filteredQueues.filter(q => getCategory(q.name) === cat).map((queue) => {
                const isTracked = tracking?.queueId === queue.id;
                return (
                  <motion.div
                    layout
                    variants={{
                      hidden: { opacity: 0, scale: 0.9, y: 20 },
                      show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", bounce: 0.4 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={queue.id}
                    onClick={() => {
                      setSelectedQueue(queue);
                      setSetupTrackMode(false);
                      setSetupToken('');
                    }}
                    className={`flex items-center justify-between p-4 rounded-3xl cursor-pointer transform-gpu ${
                      isTracked 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 ring-4 ring-blue-500/10' 
                      : 'bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                       <div className={`min-w-[4rem] px-3 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${
                         isTracked ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/5 text-blue-600'
                       }`}>
                         <motion.span
                           key={queue.currentNumber}
                           initial={{ scale: 1.5, opacity: 0.5, filter: 'brightness(2)' }}
                           animate={{ scale: 1, opacity: 1, filter: 'brightness(1)' }}
                           transition={{ duration: 0.6, type: 'spring', bounce: 0.6 }}
                         >
                           {queue.currentNumber}
                         </motion.span>
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase tracking-tighter leading-none mb-1 line-clamp-1">{queue.name}</h4>
                          <p className={`text-[10px] font-bold uppercase tracking-tight ${isTracked ? 'opacity-70' : 'text-slate-400'}`}>
                             {queue.counterInfo || 'Active Counter'}
                          </p>
                       </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isTracked ? 'bg-white/20' : 'text-slate-300'
                    }`}>
                       {isTracked ? <Bell className="w-4 h-4" /> : <ChevronRight className="w-5 h-5 opacity-50" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Active Tracking Mini-Overlay (Mobile focus) */}
      <AnimatePresence>
        {tracking && activeTrackedQueue && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 md:bottom-10 left-4 right-4 z-[110] md:max-w-md md:left-auto md:right-10"
          >
             <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="min-w-[4rem] px-2 h-14 bg-white/10 rounded-2xl flex flex-col items-center justify-center border border-white/20">
                      <span className="text-[10px] font-black uppercase opacity-60">You</span>
                      <span className="text-xl font-black">{tracking.myToken}</span>
                   </div>
                   <div>
                      <h5 className="text-[10px] font-black uppercase tracking-widest opacity-70">Active Tracker</h5>
                      <p className="font-black uppercase tracking-tighter text-lg leading-none">{activeTrackedQueue.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <Clock className="w-3 h-3 opacity-60" />
                         <span className="text-[10px] font-bold">
                           Serving <motion.span 
                             key={activeTrackedQueue.currentNumber}
                             initial={{ scale: 1.3, color: '#10b981' }}
                             animate={{ scale: 1, color: '#ffffff' }}
                             transition={{ duration: 0.6, type: 'spring', bounce: 0.6 }}
                             className="inline-block"
                           >
                             {activeTrackedQueue.currentNumber}
                           </motion.span>
                         </span>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={clearTracking}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center transition-colors hover:bg-white/30"
                >
                   <BellOff className="w-4 h-4" />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Detail Overlay */}
      <AnimatePresence>
        {activeSelectedQueue && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedQueue(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[200] bg-white dark:bg-[#0f0f0f] rounded-t-[3rem] px-8 pt-4 pb-12 shadow-2xl safe-bottom border-t border-slate-200 dark:border-white/5"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-start mb-8">
                 <div className="space-y-1">
                    <h3 className="text-3xl font-black tracking-tighter uppercase leading-none">{activeSelectedQueue.name}</h3>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{activeSelectedQueue.counterInfo}</p>
                 </div>
                 <button 
                  onClick={() => setSelectedQueue(null)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                 <div className="p-6 rounded-[2rem] bg-blue-600 text-white flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Currently Serving</span>
                    <motion.span 
                      key={activeSelectedQueue.currentNumber}
                      initial={{ scale: 1.3, opacity: 0.5, filter: 'brightness(2)' }}
                      animate={{ scale: 1, opacity: 1, filter: 'brightness(1)' }}
                      transition={{ duration: 0.6, type: 'spring', bounce: 0.6 }}
                      className="text-4xl sm:text-5xl font-black tracking-tighter break-all"
                    >
                      {activeSelectedQueue.currentNumber}
                    </motion.span>
                 </div>
                 <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                    <History className="w-5 h-5 text-slate-400 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Token History</span>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                       {(historyMap[activeSelectedQueue.id] || []).slice(1).map((h, i) => (
                         <span key={i} className="text-sm font-black opacity-40">{h}</span>
                       ))}
                       {(!historyMap[activeSelectedQueue.id] || historyMap[activeSelectedQueue.id].length <= 1) && (
                         <span className="text-[10px] font-bold text-slate-400 opacity-50 uppercase tracking-tighter">Waiting for updates...</span>
                       )}
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 {tracking?.queueId === activeSelectedQueue.id ? (
                   <>
                     <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
                        <Activity className="w-5 h-5 text-emerald-500" />
                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest leading-tight">Currently monitoring this counter for token {tracking.myToken}.</p>
                     </div>
                     <button 
                       onClick={() => { clearTracking(); setSelectedQueue(null); }}
                       className="w-full py-5 rounded-[2rem] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                     >
                       <BellOff className="w-4 h-4" /> Stop Tracking
                     </button>
                   </>
                 ) : setupTrackMode ? (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 space-y-6"
                   >
                     <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Your Token Number</label>
                       <input 
                         type="text" 
                         value={setupToken}
                         onChange={e => setSetupToken(e.target.value)}
                         placeholder="e.g. 142"
                         autoFocus
                         className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Alert me when...</label>
                       <div className="flex justify-between gap-2">
                          {[1, 2, 3, 5].map(val => (
                            <button
                              key={val}
                              onClick={() => setSetupThreshold(val)}
                              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                                setupThreshold === val 
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                                : 'bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-400'
                              }`}
                            >
                              {val} {val === 1 ? 'Wait' : 'Waits'}
                            </button>
                          ))}
                       </div>
                     </div>
                     <div className="flex gap-3">
                       <button 
                         onClick={() => setSetupTrackMode(false)}
                         className="flex-1 py-4 rounded-xl bg-slate-200 dark:bg-white/10 font-black uppercase tracking-widest text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white"
                       >
                         Cancel
                       </button>
                       <button 
                         onClick={handleSaveTracking}
                         disabled={!setupToken}
                         className="flex-[2] py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
                       >
                         Confirm Alerts
                       </button>
                     </div>
                   </motion.div>
                 ) : (
                   <>
                     <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-600/5 dark:bg-blue-600/10 border border-blue-600/10">
                        <Bell className="w-5 h-5 text-blue-600" />
                        <p className="text-xs font-bold text-slate-500 leading-tight">Track this counter to get notified when your token is near.</p>
                     </div>
                     <button 
                       onClick={() => setSetupTrackMode(true)}
                       className="w-full py-5 rounded-[2rem] bg-blue-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-transform"
                     >
                       <Bell className="w-4 h-4" /> Track My Token
                     </button>
                   </>
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
