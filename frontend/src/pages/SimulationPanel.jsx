import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayCircle, ShieldCheck, Trophy, Users, AlertTriangle, 
  ShieldAlert, Wand2, Power, Clock, ListChecks, 
  IterationCcw, ChevronRight, Zap, Target, TrendingUp,
  CircleDot, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SimulationPanel = () => {
  const [pool, setPool] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [timer, setTimer] = useState(60);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationMode, setSimulationMode] = useState('CONSTANT'); // 'CONSTANT', 'DYNAMIC', or 'EMERGENCY'
  
  const timerRef = useRef(null);

  // Initialize the demo pool (10 users)
  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      const res = await fetch('http://localhost:5000/api/pools/init-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: simulationMode })
      });
      const data = await res.json();
      if (res.ok) {
        setPool(data.pool);
        setSimulationResult(null);
        setAutoSimulate(false);
        setTimer(60);
      } else {
        alert(data.error || "Initialization failed");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to connect to backend server");
    }
    setIsInitializing(false);
  };

  const executeSimulation = async () => {
    if (!pool || pool.status === 'CLOSED') return;
    setIsSimulating(true);
    try {
      const res = await fetch(`http://localhost:5000/api/pools/${pool._id}/simulate-month`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setSimulationResult(data);
        const poolsRes = await fetch('http://localhost:5000/api/pools');
        const poolsData = await poolsRes.json();
        const updatedPool = poolsData.pools.find(p => p._id === pool._id);
        if (updatedPool) setPool(updatedPool);
      }
    } catch (e) {
      console.error(e);
    }
    setIsSimulating(false);
  };

  const toggleAutoSimulate = () => {
    if (!pool || pool.status === 'CLOSED') return;
    setAutoSimulate(prev => !prev);
  };

  useEffect(() => {
    if (autoSimulate && pool && pool.status !== 'CLOSED') {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            executeSimulation();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setTimer(60);
    }
    return () => clearInterval(timerRef.current);
  }, [autoSimulate, pool]);

  useEffect(() => {
    if (pool?.status === 'CLOSED') setAutoSimulate(false);
  }, [pool?.status]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 animate-in fade-in duration-700 pb-20"
    >
      {/* ── Page Header ── */}
      <div>
        <h2 className="text-4xl font-black text-[#134e4a] tracking-tight leading-tight">AI Payout Simulator</h2>
        <p className="text-[#134e4a]/50 font-medium text-lg mt-2 font-black">
          Simulates <span className="text-[#1aa08c]">{simulationMode === 'CONSTANT' ? 'Constant' : simulationMode === 'DYNAMIC' ? 'Dynamic' : 'Emergency'}</span> monthly payouts based on member priority scores.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── Left Col: Setup & Controls (4/12) ── */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-8 shadow-xl shadow-[#134e4a]/5">
             <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-[#f4fcf9] flex items-center justify-center text-[#1aa08c] shadow-inner shadow-[#1aa08c]/10">
                   <Zap size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-[#134e4a]/20 uppercase tracking-[0.3em] leading-none mb-1.5">Step 1</p>
                  <h3 className="text-xl font-black text-[#134e4a]">1. Choose Mode</h3>
                </div>
             </div>
             
             <div className="mb-10">
               <div className="bg-[#f4fcf9] p-2 rounded-2xl flex relative h-14 border border-[#1aa08c]/10">
                  <motion.div 
                    layoutId="modeIndicator"
                    className="absolute bg-white shadow-lg rounded-xl top-2 bottom-2 z-0"
                    style={{ 
                      width: 'calc(33.33% - 8px)',
                      left: simulationMode === 'CONSTANT' ? '8px' : simulationMode === 'DYNAMIC' ? '33.33%' : '66.66%'
                    }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                  <button 
                    onClick={() => setSimulationMode('CONSTANT')}
                    className={`flex-1 relative z-10 text-[11px] font-black uppercase tracking-wider transition-colors ${simulationMode === 'CONSTANT' ? 'text-[#1aa08c]' : 'text-[#134e4a]/30'}`}
                  >
                    Constant
                  </button>
                  <button 
                    onClick={() => setSimulationMode('DYNAMIC')}
                    className={`flex-1 relative z-10 text-[11px] font-black uppercase tracking-wider transition-colors ${simulationMode === 'DYNAMIC' ? 'text-[#1aa08c]' : 'text-[#134e4a]/30'}`}
                  >
                    Dynamic
                  </button>
                  <button 
                    onClick={() => setSimulationMode('EMERGENCY')}
                    className={`flex-1 relative z-10 text-[11px] font-black uppercase tracking-wider transition-colors ${simulationMode === 'EMERGENCY' ? 'text-rose-500' : 'text-[#134e4a]/30'}`}
                  >
                    Emergency
                  </button>
               </div>
               <p className="text-xs text-[#134e4a]/40 mt-5 leading-relaxed font-bold px-1">
                 {simulationMode === 'CONSTANT' 
                   ? "All members pay the same amount each month. The pool amount is given to one winner per round."
                   : simulationMode === 'DYNAMIC'
                   ? "Members can pay different amounts. Payouts adjust based on how much each person contributes."
                   : "Members facing emergencies (medical, financial hardship) get paid out first, with a small 10% fee."}
               </p>
             </div>

             <button 
               onClick={handleInitialize} 
               disabled={isInitializing || autoSimulate}
               className="w-full py-5 bg-gradient-to-br from-[#134e4a] to-[#0d9488] hover:shadow-2xl hover:shadow-[#1aa08c]/30 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 group mb-10"
             >
               {isInitializing ? (
                 <RefreshCw size={18} className="animate-spin" />
               ) : (
                 <>Start Simulation <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
               )}
             </button>

             <div className="pt-8 border-t border-slate-50">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#134e4a]/20 border border-slate-50 shadow-sm">
                      <Clock size={22} />
                   </div>
                   <div>
                     <p className="text-[11px] font-black text-[#134e4a]/20 uppercase tracking-[0.3em] leading-none mb-1.5">Step 2</p>
                     <h3 className="text-xl font-black text-[#134e4a]">2. Run Monthly Draw</h3>
                   </div>
                </div>
                
                <p className="text-[13px] text-[#134e4a]/40 mb-8 font-bold leading-relaxed px-1">
                   Runs one month of the pool � collects payments from all members and picks a winner for the payout.
                </p>

                <button 
                  onClick={toggleAutoSimulate}
                  disabled={!pool || pool.status === 'CLOSED'}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
                    autoSimulate 
                    ? 'bg-rose-500 text-white shadow-rose-200'
                    : 'bg-[#1aa08c] text-white shadow-[#1aa08c]/20 hover:shadow-2xl'
                  } disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed`}
                >
                  <Power size={18} strokeWidth={3} />
                  {autoSimulate ? 'Stop Auto-Play' : 'Auto-Play All Months'}
                </button>
             </div>
          </div>
        </div>

        {/* ── Right Col: Simulation Viewer (8/12) ── */}
        <div className="lg:col-span-8">
           <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-2xl shadow-[#134e4a]/5 overflow-hidden min-h-[700px] flex flex-col relative">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#f4fcf9]/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1aa08c]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              {!pool ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20 relative z-10">
                  <div className="w-24 h-24 rounded-3xl bg-[#f4fcf9] flex items-center justify-center text-[#1aa08c] mb-8 border border-[#1aa08c]/10">
                    <ShieldCheck size={48} strokeWidth={1.5} className="opacity-40" />
                  </div>
                  <h4 className="text-2xl font-black text-[#134e4a] tracking-tight mb-3">Ready to Start</h4>
                  <p className="text-[#134e4a]/30 font-bold max-w-sm">Choose a mode and click "Start Simulation" on the left to begin the payout demo.</p>
                </div>
              ) : (
                <div className="p-10 relative z-10 flex flex-col flex-1">
                   {/* Top Stats Bar */}
                   <div className="flex flex-wrap justify-between items-end gap-10 mb-12">
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <h3 className="text-4xl font-black text-[#134e4a] tracking-tighter">Month {pool.simulationMonth}<span className="text-lg text-[#134e4a]/20 ml-2">/ 10</span></h3>
                            {pool.status === 'CLOSED' && (
                              <span className="bg-[#1aa08c] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-[#1aa08c]/20">Verified Complete</span>
                            )}
                         </div>
                         <div className="flex items-center gap-6">
                            <div>
                               <p className="text-[11px] font-black text-[#134e4a]/20 uppercase tracking-[0.2em] mb-1">Pool Balance</p>
                               <p className="text-2xl font-black text-[#1aa08c] tracking-tight">₹{pool.currentBalance.toLocaleString()}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-100" />
                            <div>
                               <p className="text-[11px] font-black text-[#134e4a]/20 uppercase tracking-[0.2em] mb-1">Collected Per Month</p>
                               <p className="text-lg font-black text-[#134e4a]/60 tracking-tight">₹{pool.totalMonthlyCollection.toLocaleString()}</p>
                            </div>
                         </div>
                      </div>
                      
                      {pool.status !== 'CLOSED' && (
                         <div className="flex items-center gap-4 bg-[#f4fcf9] p-4 rounded-3xl border border-[#1aa08c]/10 shadow-sm min-w-[180px]">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#1aa08c] shadow-sm relative">
                               <CircleDot size={24} className={autoSimulate ? 'animate-pulse' : ''} />
                               {autoSimulate && <div className="absolute inset-0 rounded-2xl bg-[#1aa08c]/10 animate-ping" />}
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-[#134e4a]/30 uppercase tracking-[0.2em] mb-1">Next Draw</p>
                               <p className={`text-2xl font-black font-mono leading-none tracking-tight ${autoSimulate ? 'text-[#1aa08c]' : 'text-[#134e4a]/20'}`}>
                                 {timer}s
                               </p>
                            </div>
                         </div>
                      )}
                   </div>

                   {/* Current Draw Result Container */}
                   <AnimatePresence mode="wait">
                    {simulationResult && (
                      <motion.div 
                        key={simulationResult.month}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-12"
                      >
                         <div className="bg-gradient-to-br from-[#134e4a] to-[#0d9488] p-8 rounded-[2rem] shadow-2xl shadow-[#1aa08c]/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
                            
                            <div className="flex items-center gap-4 mb-8">
                               <Trophy size={32} className="text-[#2dd4bf]" />
                               <h4 className="text-2xl font-black text-white tracking-tight">This Month's Payout</h4>
                            </div>

                            {simulationResult.winners.length > 0 ? (
                              <div className="space-y-6">
                                {simulationResult.winners.map((w, i) => (
                                   <div key={i} className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 hover:border-white/20 transition-all">
                                      <div className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-6 border-b border-white/5">
                                         <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-[#2dd4bf] flex items-center justify-center text-[#134e4a] shadow-lg shadow-[#2dd4bf]/30">
                                               <Users size={20} />
                                            </div>
                                            <div>
                                               <p className="text-[13px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                                                 {w.walletAddress}
                                                 {w.isEmergency && <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-white/20 shadow-lg shadow-rose-900/40 animate-pulse">Emergency Status</span>}
                                               </p>
                                               <p className="text-[11px] font-black text-[#2dd4bf]/60 uppercase tracking-[0.2em] mt-1">Pool Member</p>
                                            </div>
                                         </div>
                                         <div className="text-right">
                                            {w.isEmergency ? (
                                              <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5 inline-block">
                                                <span className="text-white/20 text-xs line-through mr-3 font-bold">₹{w.targetAmount}</span>
                                                <span className="text-white text-2xl font-black tracking-tighter">₹{w.actualPayout}</span>
                                                <span className="text-rose-400 text-[10px] ml-3 uppercase font-black tracking-widest">-10% Reset</span>
                                              </div>
                                            ) : (
                                              <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5 inline-block">
                                                <span className="text-white/40 text-xs font-black uppercase tracking-widest mr-3">Payout Amount:</span>
                                                <span className="text-white text-2xl font-black tracking-tighter">₹{w.targetAmount}</span>
                                              </div>
                                            )}
                                         </div>
                                      </div>
                                      
                                      <div className="flex gap-4 items-start">
                                         <div className="w-10 h-10 shrink-0 rounded-2xl border border-white/10 flex items-center justify-center text-white/40">
                                            <Zap size={18} />
                                         </div>
                                         <div>
                                            <p className="text-[10px] font-black text-[#2dd4bf] uppercase tracking-[0.3em] mb-2">Why This Member Won</p>
                                            <p className="text-white/80 text-sm font-black leading-relaxed italic">"{w.aiReasoning}"</p>
                                         </div>
                                      </div>
                                   </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center gap-5">
                                 <AlertTriangle size={32} className="text-amber-400 opacity-50" />
                                 <div>
                                   <p className="text-white font-black text-lg">Funds Carried Over</p>
                                   <p className="text-white/40 text-xs font-bold mt-1 uppercase tracking-widest">Not enough balance to pay out this month. Funds will roll over to the next round.</p>
                                 </div>
                              </div>
                            )}

                            {simulationResult.cycleReset && (
                              <div className="mt-8 p-6 bg-[#2dd4bf] rounded-2xl text-[#134e4a] font-black text-center shadow-xl shadow-[#2dd4bf]/20">
                                ALL ROUNDS COMPLETE • EVERY MEMBER HAS BEEN PAID
                              </div>
                            )}
                         </div>
                      </motion.div>
                    )}
                   </AnimatePresence>

                   {/* Global Priority Standings */}
                   <div className="flex-1 flex flex-col pt-4">
                      <div className="flex items-center justify-between gap-4 mb-8">
                         <h4 className="text-2xl font-black text-[#134e4a] tracking-tight flex items-center gap-3">
                           <Users size={24} className="text-[#1aa08c]" /> Member Rankings
                         </h4>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#134e4a]/20 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                           Live Rankings
                         </span>
                      </div>

                      <div className="space-y-4 pb-10">
                        <AnimatePresence>
                        {[...pool.contributions].sort((a,b) => b.priorityScore - a.priorityScore).map((mem, i) => (
                           <motion.div 
                             key={mem.walletAddress}
                             layout
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             className={`flex items-center justify-between p-6 rounded-3xl border transition-all group ${
                               mem.hasBeenPaid 
                               ? 'border-[#1aa08c]/10 bg-[#f4fcf9]/40 opacity-50 grayscale' 
                               : 'border-slate-50 bg-white hover:border-[#1aa08c]/20 hover:shadow-xl hover:shadow-[#134e4a]/5'
                             }`}
                           >
                              <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-110 ${
                                  mem.hasBeenPaid ? 'bg-[#1aa08c]/10 text-[#1aa08c]' : 'bg-white border border-slate-100 text-[#134e4a]'
                                }`}>
                                  {mem.hasBeenPaid ? <Target size={20} /> : `#${i+1}`}
                                </div>
                                <div className="space-y-1">
                                  <p className="font-black text-lg text-[#134e4a] tracking-tight flex items-center gap-3">
                                    {mem.walletAddress}
                                    {mem.hasBeenPaid && <span className="text-[10px] uppercase tracking-widest bg-[#1aa08c] text-white px-3 py-1 rounded-full font-black shadow-lg shadow-[#1aa08c]/20">Disbursed Month {mem.payoutMonth}</span>}
                                  </p>
                                  <div className="flex items-center gap-4">
                                     <p className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${mem.monthlyContribution !== 5 ? 'text-amber-500' : 'text-[#134e4a]/40'}`}>
                                       Contribution: ₹{mem.monthlyContribution}/mo
                                     </p>
                                     {mem.emergencyFlag && (
                                       <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                         <CircleDot size={10} className="fill-rose-500 animate-pulse" /> Emergency
                                       </span>
                                     )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-12">
                                <div className="hidden sm:block">
                                  <p className="text-[10px] font-black uppercase text-[#134e4a]/20 tracking-[0.2em] mb-1">Priority</p>
                                  <p className={`text-2xl font-black tracking-tighter ${mem.priorityScore >= 80 ? 'text-[#1aa08c]' : mem.priorityScore >= 50 ? 'text-[#134e4a]/60' : 'text-[#134e4a]/20'}`}>
                                    {mem.priorityScore}
                                  </p>
                                </div>
                                <div className="min-w-[120px]">
                                  <p className="text-[10px] font-black uppercase text-[#134e4a]/20 tracking-[0.2em] mb-1">Payout Amount</p>
                                  <p className={`text-2xl font-black tracking-tighter ${mem.hasBeenPaid ? 'text-[#1aa08c]/40 line-through' : 'text-[#134e4a]'}`}>
                                    ₹{mem.targetAmount}
                                  </p>
                                </div>
                                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200 group-hover:text-[#1aa08c] group-hover:bg-[#f4fcf9] transition-all">
                                   <ChevronRight size={18} strokeWidth={3} />
                                </div>
                              </div>
                           </motion.div>
                        ))}
                        </AnimatePresence>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>

      </div>
    </motion.div>
  );
};

export default SimulationPanel;

