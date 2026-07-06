import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowRight, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import BalanceCard from '../components/dashboard/BalanceCard';
import TrustScoreCard from '../components/dashboard/TrustScoreCard';
import APYCard from '../components/dashboard/APYCard';
import AIInsightsCard from '../components/dashboard/AIInsightsCard';
import ActivePoolsSection from '../components/dashboard/ActivePoolsSection';
import RecentTransactionsWidget from '../components/dashboard/RecentTransactionsWidget';
import KYCGate from '../components/auth/KYCGate';

// ── KYC Banner ─────────────────────────────────────────────────────────────
const KYCBanner = ({ kycStatus, kycStep, onDismiss }) => {
  const navigate = useNavigate();
  const progress = Math.round(((kycStep || 0) / 6) * 100);

  if (kycStatus === 'verified') return null;

  const isInProgress = kycStep > 0;

  return (
    <div className={`relative rounded-2xl p-5 border ${
      isInProgress
        ? 'bg-blue-50 border-blue-100'
        : 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-100'
    } overflow-hidden`}>
      {/* BG decoration */}
      <div className="absolute right-0 top-0 w-40 h-40 bg-teal-100/40 rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isInProgress ? 'bg-blue-100' : 'bg-teal-100'
          }`}>
            {isInProgress ? (
              <ShieldCheck size={22} className="text-blue-600" />
            ) : (
              <AlertTriangle size={22} className="text-teal-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-800 text-base">
              {isInProgress ? `KYC In Progress — ${progress}% Complete` : 'Complete Your KYC to Unlock All Features'}
            </h3>
            <p className="text-slate-600 text-sm mt-0.5">
              {isInProgress
                ? `You're on Step ${kycStep} of 6. Continue to unlock wallet, pools, and CTX tokens.`
                : 'Verify your identity to access your blockchain wallet, join pools, and receive CTX tokens.'
              }
            </p>

            {/* KYC steps mini list */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {[
                ['Phone', kycStep >= 1],
                ['PAN', kycStep >= 2],
                ['Aadhaar', kycStep >= 3],
                ['Face', kycStep >= 4],
                ['Bank', kycStep >= 5],
              ].map(([label, done]) => (
                <div key={label} className="flex items-center gap-1">
                  {done
                    ? <CheckCircle2 size={12} className="text-teal-500" />
                    : <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                  }
                  <span className={`text-xs font-medium ${done ? 'text-teal-700' : 'text-slate-400'}`}>{label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/kyc')}
              className="mt-4 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm 
                transition-all shadow-md shadow-teal-200 active:scale-95"
            >
              {isInProgress ? 'Continue KYC' : 'Start KYC'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

// ── Locked Feature Placeholder ──────────────────────────────────────────────
const LockedCard = ({ title, description }) => (
  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[140px]">
    <Lock size={22} className="text-slate-300" />
    <div>
      <p className="font-bold text-slate-500 text-sm">{title}</p>
      <p className="text-slate-400 text-xs mt-0.5">{description}</p>
    </div>
  </div>
);

// ── Main Dashboard ──────────────────────────────────────────────────────────
const Dashboard = () => {
  const userData = JSON.parse(localStorage.getItem('chitx_user') || '{}');
  const trustScore = userData.trustScore || 0;
  const ctxBalance = userData.airdropAmount || (trustScore * 10);
  const walletAddress = userData.walletAddress || '0x0000...0000';
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '—';

  const isVerified = userData.kycStatus === 'verified';
  const kycStep = userData.kycStep || 0;
  const kycStatus = userData.kycStatus || 'pending';

  const [realBalance, setRealBalance] = useState(ctxBalance);
  const [showBanner, setShowBanner] = useState(!isVerified);

  useEffect(() => {
    if (!walletAddress || walletAddress === '0x0000...0000') return;

    const fetchLiveBalance = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/pools/balance/${walletAddress}`);
        if (res.ok) {
          const data = await res.json();
          const displayBal = parseFloat(data.onChainBalance).toFixed(1);
          setRealBalance(displayBal);
          if (userData?.walletAddress) {
            userData.airdropAmount = displayBal;
            localStorage.setItem('chitx_user', JSON.stringify(userData));
          }
        }
      } catch (err) {
        console.error('Failed to fetch real-time balance', err);
      }
    };

    fetchLiveBalance();
  }, [walletAddress]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* ── KYC Banner ── */}
      {showBanner && !isVerified && (
        <KYCBanner
          kycStatus={kycStatus}
          kycStep={kycStep}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* ── Top Row: Key Metrics ── */}
      <div className="flex flex-wrap gap-8">
        {isVerified ? (
          <>
            <BalanceCard
              balance={Number(realBalance).toLocaleString()}
              address={shortWallet}
              riskStatus="KYC-VERIFIED"
            />
            <TrustScoreCard score={trustScore} />
            <APYCard apy={12.4} />
          </>
        ) : (
          <>
            <KYCGate featureName="your CTX balance and wallet">
              <BalanceCard balance="—" address="Complete KYC" riskStatus="PENDING" />
            </KYCGate>
            <TrustScoreCard score={0} />
            <APYCard apy={12.4} />
          </>
        )}
      </div>

      {/* ── Middle Row: Active Pools & AI Oracle ── */}
      <div className="flex flex-wrap lg:flex-nowrap gap-12 items-start">
        <div className="flex-1 min-w-0">
          {isVerified ? (
            <ActivePoolsSection />
          ) : (
            <KYCGate featureName="Pool Management">
              <ActivePoolsSection />
            </KYCGate>
          )}
        </div>
        <div className="shrink-0">
          <AIInsightsCard />
        </div>
      </div>

      {/* ── Bottom Row: Recent Transactions ── */}
      <div className="pb-12">
        {isVerified ? (
          <RecentTransactionsWidget />
        ) : (
          <KYCGate featureName="Transaction History">
            <RecentTransactionsWidget />
          </KYCGate>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
