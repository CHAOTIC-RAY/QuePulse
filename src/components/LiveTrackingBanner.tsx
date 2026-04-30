import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Activity, Users, ArrowRight } from 'lucide-react';
import { UserTracking, Queue } from '../types';
import { queueService } from '../services/queueService';

interface LiveTrackingBannerProps {
  tracking: UserTracking;
}

export function LiveTrackingBanner({ tracking }: LiveTrackingBannerProps) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [etaText, setEtaText] = useState('Calculating...');
  const [patientsLeft, setPatientsLeft] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchStatus = async () => {
      try {
        let data: Queue[] = [];
        if (tracking.source === 'hmh') data = await queueService.getExternalHMHQueues();
        else if (tracking.source === 'vitalcare') data = await queueService.getExternalVitalCareQueues();
        else if (tracking.source === 'adk') data = await queueService.getExternalADKQueues();
        
        if (!mounted) return;

        let matchedQueue: Queue | undefined;
        if (tracking.isGlobal) {
          matchedQueue = data.find(q => {
             const current = parseInt(q.currentNumber.replace(/\D/g, ''));
             const target = parseInt(tracking.myToken.replace(/\D/g, ''));
             return !isNaN(current) && !isNaN(target) && current > 0;
          });
        } else {
          matchedQueue = data.find(q => q.id === tracking.queueId);
        }

        if (matchedQueue) {
          setQueue(matchedQueue);
          
          const current = parseInt(matchedQueue.currentNumber.replace(/\D/g, ''));
          const target = parseInt(tracking.myToken.replace(/\D/g, ''));
          
          if (!isNaN(current) && !isNaN(target)) {
            const left = target - current;
            setPatientsLeft(left >= 0 ? left : 0);
            
            // Calculate ETA based on history map with timestamps
            const historyStr = localStorage.getItem('mv_queue_history_times');
            if (historyStr) {
               const historyMap = JSON.parse(historyStr);
               const history = historyMap[matchedQueue.id] || [];
               if (history.length >= 2) {
                 // Try to calculate average time per patient
                 let timeDiffs = [];
                 let patientDiffs = [];
                 for(let i=0; i<history.length - 1; i++) {
                    const t1 = history[i].time;
                    const t2 = history[i+1].time;
                    const num1 = parseInt(history[i].token.replace(/\D/g, ''));
                    const num2 = parseInt(history[i+1].token.replace(/\D/g, ''));
                    if (!isNaN(num1) && !isNaN(num2) && num1 > num2) {
                      timeDiffs.push(t1 - t2);
                      patientDiffs.push(num1 - num2);
                    }
                 }
                 
                 if (timeDiffs.length > 0) {
                    const totalTime = timeDiffs.reduce((a, b) => a + b, 0);
                    const totalPatients = patientDiffs.reduce((a, b) => a + b, 0);
                    const avgTimePerPatientMs = totalTime / totalPatients;
                    
                    if (left > 0) {
                       const estimatedMs = left * avgTimePerPatientMs;
                       const mins = Math.round(estimatedMs / 60000);
                       if (mins < 1) {
                         setEtaText('Less than a minute');
                       } else {
                         setEtaText(`~${mins} mins`);
                       }
                    } else {
                       setEtaText('It is your turn!');
                    }
                 } else {
                   setEtaText('Analyzing speed...');
                 }
               } else {
                 setEtaText('Analyzing speed...');
               }
            } else {
               setEtaText('Analyzing speed...');
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
    const intv = setInterval(fetchStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(intv);
    };
  }, [tracking]);

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
      className="bg-indigo-600 text-white rounded-3xl p-6 md:p-8 mb-10 shadow-2xl shadow-indigo-600/20 relative overflow-hidden group"
    >
      {/* Decorative bg */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="min-w-[4rem] px-3 h-16 bg-white/20 rounded-2xl flex flex-col items-center justify-center border border-white/20 flex-shrink-0 shadow-inner">
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
