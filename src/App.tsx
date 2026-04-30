import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { QueueBoard } from './components/QueueBoard';
import { TrackingHub } from './components/TrackingHub';
import { SiteSource, UserTracking } from './types';
import { Moon, Sun, Bell, Home, MoreHorizontal, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [source, setSource] = useState<SiteSource | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [tracking, setTracking] = useState<UserTracking | null>(() => {
    const saved = localStorage.getItem('mv_queue_tracking');
    return saved ? JSON.parse(saved) : null;
  });

  const updateTracking = (newTracking: UserTracking | null) => {
    setTracking(newTracking);
    if (!newTracking) localStorage.removeItem('mv_queue_tracking');
    else localStorage.setItem('mv_queue_tracking', JSON.stringify(newTracking));
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="min-h-screen transition-colors duration-500 pb-24 md:pb-0">
      <TrackingHub 
        isOpen={isAlertsOpen} 
        onClose={() => setIsAlertsOpen(false)} 
        currentSource={source}
        tracking={tracking}
        onUpdateTracking={updateTracking}
      />
      
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass h-16 md:h-20 flex items-center justify-between px-6 md:px-16">
        <div 
          className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform" 
          onClick={() => setSource(null)}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="font-black text-lg md:text-xl tracking-tighter uppercase leading-none">QuePulse</span>
            <span className="text-[8px] md:text-[10px] font-bold text-indigo-600 tracking-widest uppercase opacity-80">Live Tracker</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleDarkMode}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={() => setIsAlertsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-black uppercase tracking-tighter transition-all hover:scale-105 shadow-lg shadow-blue-600/20"
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 md:pt-32 px-6 md:px-16 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {!source ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LandingPage onSelectSite={setSource} />
            </motion.div>
          ) : (
            <motion.div
              key="board"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <QueueBoard 
                source={source} 
                tracking={tracking} 
                onUpdateTracking={updateTracking} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav md:hidden flex justify-around items-center px-8 pt-3 h-20 shadow-[0_-1px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-1px_10px_rgba(255,255,255,0.02)]">
         <button 
           onClick={() => { setSource(null); setIsAlertsOpen(false); }}
           className={`flex flex-col items-center gap-1.5 ${!source && !isAlertsOpen ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}
         >
           <div className={`p-2 rounded-xl transition-colors ${!source && !isAlertsOpen ? 'bg-blue-600/10' : ''}`}>
             <Home className="w-6 h-6" />
           </div>
           <span className="text-[10px] font-black uppercase tracking-widest">Hub</span>
         </button>
         
         <div className="relative -top-2">
            <button 
              onClick={() => setIsAlertsOpen(true)}
              className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30 active:scale-95 transition-transform"
            >
               <Bell className="w-6 h-6" />
            </button>
            <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest ${isAlertsOpen ? 'text-blue-600' : 'text-slate-400'}`}>Alerts</span>
         </div>

         <button className="flex flex-col items-center gap-1.5 text-slate-400 opacity-60">
           <div className="p-2">
             <MoreHorizontal className="w-6 h-6" />
           </div>
           <span className="text-[10px] font-black uppercase tracking-widest">More</span>
         </button>
      </div>
    </div>
  );
}
