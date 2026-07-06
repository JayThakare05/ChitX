import React from 'react';
import {
  LayoutDashboard,
  Layers,
  PlusCircle,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  BrainCircuit,
  Settings,
  Bot,
  Users,
  Lock
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Sidebar = ({ onOpenChat }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Read user session
  const userData = JSON.parse(localStorage.getItem('chitx_user') || '{}');
  const isVerified = userData.kycStatus === 'verified';
  const kycStep = userData.kycStep || 0;
  const progressPercent = Math.round((kycStep / 6) * 100);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', locked: false },
    { icon: Layers, label: 'My Pools', path: '/my-pools', locked: !isVerified },
    { icon: PlusCircle, label: 'Joint Pool', path: '/joint-pool', locked: !isVerified },
    { icon: CreditCard, label: 'Payments', path: '/payments', locked: !isVerified },
    { icon: ShieldCheck, label: 'Trust Score', path: '/trust-score', locked: false },
    { icon: BrainCircuit, label: 'AI Sim Pool', path: '/pool-simulator', locked: false },
    { icon: Users, label: 'Massive Pooling', path: '/massive-pooling', locked: false },
    { icon: AlertCircle, label: 'Emergency Fund', path: '/emergency-fund', locked: !isVerified },
    { icon: Settings, label: 'Settings', path: '/settings', locked: false },
  ];

  return (
    <div className="w-64 h-full bg-white border-r border-slate-200 flex flex-col p-6 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800">Overview</h2>
        <p className="text-xs text-slate-400 font-medium tracking-tight">Protocol V2.0</p>
      </div>

      {/* KYC status indicator */}
      {!isVerified && (
        <button
          onClick={() => navigate('/kyc')}
          className="mb-5 w-full bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl p-3 text-left hover:from-teal-100 hover:to-emerald-100 transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">KYC Progress</span>
            <span className="text-xs font-black text-teal-600">{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-teal-600 text-[11px] font-semibold mt-1.5 group-hover:underline">
            {kycStep === 0 ? 'Start verification →' : `Continue — Step ${kycStep}/6 →`}
          </p>
        </button>
      )}

      {isVerified && (
        <div className="mb-5 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-emerald-700">KYC Verified</p>
            <p className="text-[11px] text-emerald-600 font-medium">Full access unlocked</p>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.locked ? '/kyc' : item.path}
            title={item.locked ? 'Complete KYC to unlock' : item.label}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              !item.locked && location.pathname === item.path
                ? "bg-teal-50 text-teal-600 font-semibold"
                : item.locked
                ? "text-slate-400 hover:bg-slate-50 cursor-pointer"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <item.icon size={20} className={cn(
              "transition-colors flex-shrink-0",
              !item.locked && location.pathname === item.path
                ? "text-teal-600"
                : item.locked
                ? "text-slate-300"
                : "text-slate-400 group-hover:text-slate-600"
            )} />
            <span className="text-sm flex-1">{item.label}</span>
            {item.locked && <Lock size={13} className="text-slate-300" />}
          </Link>
        ))}
      </nav>

      <button
        onClick={onOpenChat}
        className="mt-auto bg-[#134e4a] text-white rounded-2xl py-4 px-6 flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-teal-900/10 group active:scale-95"
      >
        <Bot size={20} className="group-hover:rotate-12 transition-transform" />
        <span className="font-bold text-sm tracking-tight">Ask Oracle</span>
      </button>
    </div>
  );
};

export default Sidebar;
