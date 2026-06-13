import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, FileText, ExternalLink, Calendar, 
  CheckCircle2, XCircle, Clock, Search, ChevronRight,
  Activity, HeartPulse, ShieldCheck, Lock, Sparkles, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EmergencyFund = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userStr = localStorage.getItem('chitx_user');
  const userWallet = userStr ? JSON.parse(userStr).walletAddress?.toLowerCase() : null;

  const fetchHistory = async (silent = false) => {
    if (!userWallet) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch(`http://localhost:5000/api/pools/emergency-history/${userWallet}`);
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch emergency history:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userWallet]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/40 backdrop-blur-sm">
            <CheckCircle2 size={10} /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/40 backdrop-blur-sm">
            <XCircle size={10} /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/40 backdrop-blur-sm">
            <Clock size={10} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-10 max-w-7xl mx-auto pb-24 px-4 font-['Outfit',_sans-serif]">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-[#1aa08c]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] bg-[#0d9488]/5 rounded-full blur-[100px]" />
      </div>

      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-8"
      >
        <div className="space-y-4">
           <div className="flex items-center gap-4 mb-1">
             <div className="w-12 h-12 bg-white/40 backdrop-blur-3xl rounded-[1.25rem] flex items-center justify-center border border-white/60 shadow-2xl shadow-[#134e4a]/5 text-[#1aa08c]">
               <HeartPulse size={24} strokeWidth={2.5} />
             </div>
             <div>
                <p className="text-[11px] font-bold text-[#1aa08c] uppercase tracking-[0.4em] mb-1">Emergency Support</p>
                <h1 className="text-5xl font-bold text-[#134e4a] tracking-tight hover:tracking-tighter transition-all duration-500 cursor-default">Emergency Fund</h1>
             </div>
           </div>
           <p className="text-slate-400 font-medium max-w-xl text-[17px] leading-relaxed">
             View your emergency requests, AI review results, and uploaded documents � all stored <span className="text-[#134e4a] font-semibold">securely on the blockchain</span>.
           </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
           <button 
             onClick={() => fetchHistory(true)} 
             disabled={isRefreshing}
             className="group flex items-center gap-3 px-6 py-4 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl text-[11px] font-bold text-slate-500 hover:bg-white hover:text-[#1aa08c] transition-all duration-300 shadow-sm hover:shadow-xl active:scale-95 disabled:opacity-50"
           >
             <RotateCcw size={16} className={`${isRefreshing ? "animate-spin" : "group-hover:rotate-180"} transition-transform duration-500`} />
             {isRefreshing ? 'LOADING...' : 'REFRESH'}
           </button>
           
           <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-0.5 shadow-2xl shadow-emerald-500/20 group">
              <div className="bg-[#f4fcf9] backdrop-blur-3xl rounded-[2.4rem] px-8 py-5 flex items-center gap-6">
                 <div className="text-right">
                   <p className="text-[10px] font-bold text-[#1aa08c]/50 uppercase tracking-[0.2em] mb-1">Emergency Fund Available</p>
                   <p className="text-3xl font-bold text-[#134e4a] tracking-tighter">1.2M <span className="opacity-30 text-lg ml-0.5">CTX</span></p>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-[#1aa08c] flex items-center justify-center text-white shadow-lg shadow-[#1aa08c]/40 group-hover:scale-110 transition-transform duration-500 relative overflow-hidden">
                    <ShieldCheck size={24} className="relative z-20" />
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-10" />
                 </div>
              </div>
           </div>
        </div>
      </motion.div>

      {/* Application History Table (Deep Glass Ledger) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-[#031513]/70 backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-2xl shadow-black/20 overflow-hidden flex flex-col min-h-[500px]"
      >
        <div className="p-10 px-12 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white/5 relative overflow-hidden">
           {/* Header Shimmer */}
           <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
           
           <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-[0.3em] flex items-center gap-3 relative z-10">
             <Calendar size={18} className="text-[#1aa08c]" /> Your Requests
           </h3>
           <div className="relative group w-full sm:w-auto z-10">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#1aa08c] transition-colors" />
             <input 
               type="text" 
               placeholder="Filter records..."
               className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-medium text-white/90 placeholder:text-white/50 focus:bg-black/60 focus:ring-4 ring-[#1aa08c]/5 outline-none w-full sm:w-80 transition-all shadow-inner"
             />
           </div>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar relative">
           {loading ? (
             <div className="p-32 flex flex-col items-center justify-center space-y-6">
               <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 animate-pulse shadow-xl">
                  <Activity size={28} className="text-[#1aa08c]" />
               </div>
               <p className="text-white/40 font-bold text-[10px] tracking-[0.3em] uppercase">Loading your requests...</p>
             </div>
           ) : history.length === 0 ? (
             <div className="p-32 flex flex-col items-center justify-center text-center">
               <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 text-white/10 border border-white/10 shadow-2xl relative group">
                  <ShieldAlert size={40} className="text-[#1aa08c]/40 group-hover:text-[#1aa08c]/60 transition-colors duration-500" />
                  <div className="absolute inset-0 bg-[#1aa08c]/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
               <h4 className="text-2xl font-bold text-white/90 mb-3 tracking-tight">No Requests Yet</h4>
               <p className="text-white/60 text-base max-w-xs mx-auto mb-8 font-medium">
                 You haven't submitted any emergency fund requests yet.
               </p>
             </div>
           ) : (
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-black/20 border-b border-white/5">
                   <th className="px-12 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">Date & Status</th>
                   <th className="px-12 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">Reason</th>
                   <th className="px-12 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 text-center">AI Review</th>
                   <th className="px-12 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {history.map((record) => (
                   <tr key={record._id} className="hover:bg-white/5 transition-all duration-300 group">
                     <td className="px-12 py-7">
                       <div className="flex flex-col gap-3">
                         <span className="text-[13px] font-semibold text-white/30 tracking-tight flex items-center gap-2">
                           <Clock size={12} className="opacity-30" />
                           {new Date(record.createdAt).toLocaleDateString('en-US', { 
                             month: 'short', day: 'numeric', year: 'numeric' 
                           })}
                         </span>
                         {getStatusBadge(record.status)}
                       </div>
                     </td>
                     <td className="px-12 py-7 max-w-md">
                       <p className="text-base font-semibold text-white/90 leading-relaxed mb-2 tracking-tight">{record.reason}</p>
                       {record.status === 'REJECTED' && record.aiResult?.reason && (
                         <div className="flex items-start gap-2 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                           <XCircle size={14} className="text-rose-400 mt-1 shrink-0" />
                           <p className="text-[11px] text-rose-400 font-bold tracking-tight uppercase leading-relaxed">
                              Rejected: {record.aiResult.reason}
                           </p>
                         </div>
                       )}
                     </td>
                     <td className="px-12 py-7">
                       <div className="flex flex-col items-center text-center gap-2.5">
                         <div className="flex items-center gap-2 px-4 py-1.5 bg-[#1aa08c]/10 rounded-full border border-[#1aa08c]/20">
                            <Sparkles size={12} className="text-[#1aa08c]" />
                            <span className="text-[10px] font-bold text-[#1aa08c] uppercase tracking-widest leading-none">
                               {record.aiResult?.category || 'General'}
                            </span>
                         </div>
                         <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                           Confidence: <span className="text-[#1aa08c]">{record.aiResult?.confidence || 0}%</span>
                         </p>
                       </div>
                     </td>
                     <td className="px-12 py-7 text-right">
                       <a 
                         href={`http://localhost:5000${record.documentUrl}`} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="inline-flex items-center gap-3 px-6 py-3.5 bg-white/5 hover:bg-white hover:text-[#134e4a] text-white rounded-2xl text-[11px] font-bold transition-all shadow-xl active:scale-95 group uppercase tracking-widest border border-white/10"
                       >
                         <FileText size={16} className="text-[#1aa08c] group-hover:text-[#134e4a] transition-colors" />
                         Preview <ChevronRight size={14} className="opacity-40" />
                       </a>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
        </div>
      </motion.div>

      {/* AI Transparency Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#06201d]/80 backdrop-blur-3xl rounded-[3rem] p-12 border border-white/10 shadow-2xl relative overflow-hidden group"
      >
         {/* Glass Shimmer Overlay */}
         <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
         
         <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-1000 pointer-events-none">
            <Lock size={180} className="text-white" />
         </div>
         
         <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
               <div className="w-10 h-10 rounded-xl bg-[#1aa08c]/20 flex items-center justify-center border border-[#1aa08c]/30 shadow-[0_0_15px_rgba(26,160,140,0.2)]">
                  <ShieldCheck size={22} className="text-[#1aa08c]" />
               </div>
               <h3 className="text-2xl font-bold text-white tracking-tight">How It Works</h3>
            </div>
            
            <p className="text-emerald-50/50 font-medium text-[19px] leading-relaxed mb-10">
               Every emergency request is reviewed by our <span className="text-white font-semibold">ChitX AI</span> and saved securely on the blockchain. Genuine requests help build your <span className="text-white font-semibold">trust score</span>—fake ones may reduce your <span className="text-white font-semibold">borrowing limits</span>.
            </p>
            
            <div className="flex flex-wrap gap-6">
               <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 hover:border-[#1aa08c]/40 hover:bg-white/10 transition-all duration-500 cursor-default">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1aa08c] shadow-[0_0_8px_#1aa08c]" />
                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-[0.2em]">Fully Encrypted</span>
               </div>
               <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 hover:border-[#1aa08c]/40 hover:bg-white/10 transition-all duration-500 cursor-default">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1aa08c] shadow-[0_0_8px_#1aa08c]" />
                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-[0.2em]">AI Fraud Protection</span>
               </div>
            </div>
         </div>
      </motion.div>
    </div>
  );
};

export default EmergencyFund;
