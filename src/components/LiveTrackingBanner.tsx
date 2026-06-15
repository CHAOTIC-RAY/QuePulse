import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock, Activity, Users } from 'lucide-react';
import { UserTracking } from '../types';
import { getWaitEtaText } from '../lib/queueTiming';
import { useQueuePolling } from '../hooks/useQueuePolling';

interface LiveTrackingBannerProps {
  tracking: UserTracking;
}

export function LiveTrackingBanner({ tracking }: LiveTrackingBannerProps) {
  const { queues, loading } = useQueuePolling(tracking.source, 8_000);

  const { queue, patientsLeft, etaText } = useMemo(() => {
    let matchedQueue = queues.find((q) => q.id === tracking.queueId);
    if (!matchedQueue && tracking.isGlobal) {
      matchedQueue = queues.find((q) => {
        const current = parseInt(q.currentNumber.replace(/\D/g, ''), 10);
        const target = parseInt(tracking.myToken.replace(/\D/g, ''), 10);
        return !Number.isNaN(current) && !Number.isNaN(target) && current > 0;
      });
    }

    if (!matchedQueue) {
      return { queue: null, patientsLeft: null as number | null, etaText: 'Calculating...' };
    }

    const current = parseInt(matchedQueue.currentNumber.replace(/\D/g, ''), 10);
    const target = parseInt(tracking.myToken.replace(/\D/g, ''), 10);
    const left =
      !Number.isNaN(current) && !Number.isNaN(target) ? Math.max(target - current, 0) : null;

    return {
      queue: matchedQueue,
      patientsLeft: left,
      etaText: getWaitEtaText(matchedQueue.id, tracking.myToken, matchedQueue.currentNumber),
    };
  }, [queues, tracking]);

  if (loading && !queue) {
    return (
      <div className="bg-indigo-600/5 border border-indigo-600/10 rounded-3xl p-6 mb-8 animate-pulse flex items-center justify-center">
         <div className="flex gap-2 items-center text-indigo-400">
           <Activity className="w-5 h-5 animate-spin" />
           <span className="text-xs font-black uppercase tracking-widest">Loading Live Status...</span>
         </div>
      </div>
    );
  }

  if (!queue) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0.4 }}
      className="brand-gradient text-white rounded-3xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden group"
    >
      {/* Decorative bg */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--accent)]/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 pulse-ring" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="min-w-[4.5rem] px-3 h-16 bg-white/20 rounded-2xl flex flex-col items-center justify-center border border-white/20 flex-shrink-0 shadow-inner">
             <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Token</span>
             <span className="text-2xl font-black">{tracking.myToken}</span>
           </div>
           <div>
             <div className="flex items-center gap-2 mb-1">
               <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Live Status • {tracking.source.toUpperCase()}</span>
             </div>
             <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">{queue.name}</h3>
             <p className="text-xs font-bold uppercase tracking-widest opacity-80">
               Serving:{' '}
               <motion.span 
                 key={queue.currentNumber}
                 initial={{ scale: 1.3, backgroundColor: 'rgba(16, 185, 129, 0.4)' }}
                 animate={{ scale: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                 transition={{ duration: 0.6, type: 'spring', bounce: 0.6 }}
                 className="text-white px-2 py-0.5 rounded-md inline-block"
               >
                 {queue.currentNumber}
               </motion.span>
             </p>
           </div>
        </div>

        <div className="flex flex-row md:flex-col gap-4 md:gap-2 w-full md:w-auto">
          <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl flex-1 md:flex-none backdrop-blur-sm">
             <Users className="w-5 h-5 text-indigo-200" />
             <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 opacity-80">Left in line</p>
               <p className="text-lg font-black leading-none">{patientsLeft ?? '--'} <span className="text-xs opacity-70">people</span></p>
             </div>
          </div>
          
          <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl flex-1 md:flex-none backdrop-blur-sm">
             <Clock className="w-5 h-5 text-emerald-300" />
             <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300 opacity-80">Estimated Wait</p>
               <p className="text-lg font-black leading-none tracking-tight">{etaText}</p>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
