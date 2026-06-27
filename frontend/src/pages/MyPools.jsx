import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, Trash2, Shuffle, BrainCircuit, DollarSign, Users, ChevronRight, ChevronLeft, Check, Clock } from 'lucide-react';
import { useAccount, useWriteContract, useSwitchChain, useBalance } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseEther } from 'viem';

import PoolFlipCard from '../components/dashboard/PoolFlipCard';
import { ConfirmModal, ResultModal, EligibilityModal } from '../components/ui/PoolModals';
import { CTX_ADDRESS, TREASURY_ADDRESS, ERC20_ABI } from '../constants';

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepDot = ({ num, label, active, done }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${
      done ? 'bg-[#1aa08c] text-white' : active ? 'bg-[#134e4a] text-white scale-110 shadow-lg shadow-[#134e4a]/20' : 'bg-slate-100 text-slate-400'
    }`}>
      {done ? <Check size={14} strokeWidth={3} /> : num}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-[#134e4a]' : 'text-slate-400'}`}>{label}</span>
  </div>
);

// ─── Option card for pool type / style selection ──────────────────────────────
const OptionCard = ({ icon: Icon, title, desc, badge, selected, onClick, color = '#1aa08c' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
      selected
        ? 'border-[#1aa08c] bg-[#f4fcf9] shadow-md shadow-[#1aa08c]/10'
        : 'border-slate-100 bg-white hover:border-[#1aa08c]/40 hover:bg-[#f4fcf9]/50'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#1aa08c]/10 text-[#1aa08c]' : 'bg-slate-50 text-slate-400'}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`font-black text-sm ${selected ? 'text-[#134e4a]' : 'text-slate-600'}`}>{title}</p>
          {badge && (
            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${selected ? 'bg-[#1aa08c] text-white' : 'bg-slate-100 text-slate-400'}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${selected ? 'border-[#1aa08c] bg-[#1aa08c]' : 'border-slate-200'}`}>
        {selected && <Check size={10} className="text-white m-auto" strokeWidth={3} />}
      </div>
    </div>
  </button>
);

// ─── Main Create Pool Modal ───────────────────────────────────────────────────
const CreatePoolModal = ({ onClose, refreshPools, showResult }) => {
  const [step, setStep] = useState(1); // 1: type, 2: contribution, 3: membership, 4: details+confirm
  
  // Pool configuration state
  const [poolType, setPoolType] = useState('PRIORITY');         // 'RANDOM' | 'PRIORITY'
  const [contributionStyle, setContributionStyle] = useState('FIXED'); // 'FIXED' | 'DYNAMIC'
  const [membershipType, setMembershipType] = useState('FIXED'); // 'FIXED' | 'DYNAMIC'
  
  // Detail fields (Step 4)
  const [monthlyPay, setMonthlyPay] = useState(100);
  const [members, setMembers] = useState('');
  const [minMembers, setMinMembers] = useState(3);
  const [isLoading, setIsLoading] = useState(false);

  // Web3 Hooks
  const { address: userWallet } = useAccount();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { data: balanceData } = useBalance({ address: userWallet });

  // Eligibility State
  const [showEligibility, setShowEligibility] = useState(false);
  const [eligibilityChecks, setEligibilityChecks] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userWallet) return;
      try {
        const res = await fetch(`http://localhost:5000/api/auth/profile/${userWallet}`);
        const data = await res.json();
        if (res.ok) setUserProfile(data.user);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };
    fetchProfile();
  }, [userWallet]);

  const parsedMembers = members ? Number(members) : null;
  const effectiveMonthlyPay = contributionStyle === 'DYNAMIC' ? 0 : monthlyPay;
  const totalPool = parsedMembers && monthlyPay ? (monthlyPay * parsedMembers) : (monthlyPay * 10);
  const fixedDeposit = contributionStyle === 'DYNAMIC' ? 0 : monthlyPay * 2;

  const JOIN_WINDOW_DAYS = 15;
  const joinDeadlineStr = (() => {
    const d = new Date(Date.now() + JOIN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const stepLabels = ['Type', 'Contribution', 'Membership', 'Details'];

  const validateEligibilityAndProceed = async () => {
    if (!userWallet) return showResult(false, 'Not Connected', 'Please connect your wallet first.');
    if (!userProfile) return showResult(false, 'Profile Missing', 'Please complete your financial profile onboarding first.');

    if (contributionStyle === 'DYNAMIC') {
      // Dynamic pools don't need upfront fixed deposit validation
      handleCreateWithPayment();
      return;
    }

    const disposable = userProfile.income - userProfile.expenses;
    const balance = parseFloat(balanceData?.formatted || '0');
    const isMicroPool = monthlyPay >= 5 && monthlyPay <= 10;
    const balanceOk = balance >= fixedDeposit;
    const incomeOk = disposable >= monthlyPay;
    const trustOk = userProfile.trustScore >= 50 || (isMicroPool && balanceOk);

    const checks = [
      { label: 'Trust Score', value: `${userProfile.trustScore} / 100`, passed: trustOk, hint: trustOk ? 'Good standing' : 'Low trust score' },
      { label: 'Disposable Income', value: `$${disposable.toLocaleString()}/mo`, passed: incomeOk, hint: incomeOk ? `Sufficient.` : `Disposable income ($${disposable}) is less than monthly pay ($${monthlyPay}).` },
      { label: 'CTX Balance', value: `${balance.toFixed(1)} CTX`, passed: balanceOk, hint: balanceOk ? `Sufficient for the ${fixedDeposit} CTX deposit.` : `Need ${fixedDeposit} CTX.` }
    ];

    const passedCount = checks.filter(c => c.passed).length;
    const isLowTrust = userProfile.trustScore < 50;

    if ((isLowTrust && !isMicroPool) || passedCount < 2) {
      setEligibilityChecks(checks);
      setShowEligibility(true);
      return;
    }

    handleCreateWithPayment();
  };

  const handleCreateWithPayment = async () => {
    setIsLoading(true);
    try {
      if (contributionStyle !== 'DYNAMIC') {
        // Step 1: Network Check
        if (chainId !== sepolia.id) await switchChainAsync({ chainId: sepolia.id });

        // Step 2: On-chain Payment (Fixed Deposit + First Month)
        const totalInitialDeposit = fixedDeposit + effectiveMonthlyPay;
        const amountWei = parseEther(totalInitialDeposit.toString());
        let txHash;
        try {
          txHash = await writeContractAsync({
            address: CTX_ADDRESS, abi: ERC20_ABI, functionName: 'transfer',
            args: [TREASURY_ADDRESS, amountWei], chainId: sepolia.id, gas: 100000n,
          });
        } catch (err) {
          setIsLoading(false);
          return showResult(false, 'Payment Cancelled', 'You must pay the fixed deposit to host this pool.');
        }

        // Step 3: Backend Registration
        const response = await fetch('http://localhost:5000/api/pools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthlyPay,
            members: membershipType === 'DYNAMIC' ? null : parsedMembers,
            minMembersForDynamic: membershipType === 'DYNAMIC' ? minMembers : undefined,
            status: 'OPEN',
            creatorWallet: userWallet,
            isCreatorJoining: true,
            txHash,
            poolType,
            contributionStyle,
            membershipType,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          refreshPools();
          onClose();
          showResult(true, 'Pool Created! 🎉', `Your ${poolType === 'RANDOM' ? '🎲 Random' : '🤖 AI Priority'} pool is live! You are member #1. Joining window closes on ${joinDeadlineStr}. Tx: ${txHash.slice(0, 10)}...`);
        } else {
          const data = await response.json();
          showResult(false, 'Creation Failed', data.error || 'Failed to create pool.');
        }
      } else {
        // Dynamic contribution: no on-chain payment at creation, creator joins without fixed deposit
        const response = await fetch('http://localhost:5000/api/pools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthlyPay: 0,
            members: membershipType === 'DYNAMIC' ? null : parsedMembers,
            minMembersForDynamic: membershipType === 'DYNAMIC' ? minMembers : undefined,
            status: 'OPEN',
            creatorWallet: userWallet,
            isCreatorJoining: false, // Creator will join separately with their custom amount
            poolType,
            contributionStyle,
            membershipType,
          }),
        });

        if (response.ok) {
          refreshPools();
          onClose();
          showResult(true, 'Dynamic Pool Created! 🎉', `Your ${poolType === 'RANDOM' ? '🎲 Random' : '🤖 AI Priority'} dynamic pool is live! Members set their own contribution when joining. Closing on ${joinDeadlineStr}.`);
        } else {
          const data = await response.json();
          showResult(false, 'Creation Failed', data.error || 'Failed to create pool.');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      showResult(false, 'Error', 'Something went wrong during creation.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f3d3a]/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="w-full max-w-[460px] bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 border border-[#1aa08c]/20 shadow-2xl shadow-[#134e4a]/10 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#1aa08c]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl pointer-events-none" />

          {/* Close button */}
          <button onClick={onClose} className="absolute top-6 right-6 z-50 text-[#134e4a]/40 hover:text-[#134e4a] transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#1aa08c]/10 hover:scale-110 hover:bg-[#f4fcf9] transition-all">✕</div>
          </button>

          {/* Header */}
          <h2 className="text-xl font-black text-[#134e4a] mb-1 relative z-10">Create New Pool</h2>
          <p className="text-[11px] text-[#1aa08c] font-bold uppercase tracking-widest mb-6 relative z-10">Step {step} of 4</p>

          {/* Step progress */}
          <div className="flex items-center justify-between mb-8 relative z-10 px-1">
            {stepLabels.map((label, i) => (
              <React.Fragment key={i}>
                <StepDot num={i + 1} label={label} active={step === i + 1} done={step > i + 1} />
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${step > i + 1 ? 'bg-[#1aa08c]' : 'bg-slate-100'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 space-y-3"
            >
              {/* ── Step 1: Pool Type ── */}
              {step === 1 && (
                <>
                  <p className="text-sm font-bold text-[#134e4a]/60 mb-4">How should the winner be selected each cycle?</p>
                  <OptionCard
                    icon={BrainCircuit} title="AI Priority Pool" badge="Recommended"
                    desc="Winner each cycle is selected by AI based on financial need, trust score, and emergency flags. You can be in max 2 Priority pools at a time."
                    selected={poolType === 'PRIORITY'}
                    onClick={() => setPoolType('PRIORITY')}
                  />
                  <OptionCard
                    icon={Shuffle} title="Random Pool"
                    desc="Winner each cycle is selected by a trustless random lottery. No AI intervention — pure mathematics."
                    selected={poolType === 'RANDOM'}
                    onClick={() => setPoolType('RANDOM')}
                  />
                </>
              )}

              {/* ── Step 2: Contribution Style ── */}
              {step === 2 && (
                <>
                  <p className="text-sm font-bold text-[#134e4a]/60 mb-4">How should members contribute to the pool?</p>
                  <OptionCard
                    icon={DollarSign} title="Fixed Amount" badge="Traditional"
                    desc="All members pay the same monthly amount set by you. Clear, predictable smart contract logic."
                    selected={contributionStyle === 'FIXED'}
                    onClick={() => setContributionStyle('FIXED')}
                  />
                  <OptionCard
                    icon={BrainCircuit} title="Dynamic Amount" badge="Web3 Innovation"
                    desc="Each member sets their own monthly contribution when joining. AI dynamically calculates proportional payouts. Amounts stay private until cycle starts."
                    selected={contributionStyle === 'DYNAMIC'}
                    onClick={() => setContributionStyle('DYNAMIC')}
                  />
                </>
              )}

              {/* ── Step 3: Membership Type ── */}
              {step === 3 && (
                <>
                  <p className="text-sm font-bold text-[#134e4a]/60 mb-4">How should pool membership work?</p>
                  <OptionCard
                    icon={Users} title="Fixed Members" badge="Stable"
                    desc="Set a hard cap on members. Pool activates when full or after the 15-day window closes. If not full in time, all are refunded automatically."
                    selected={membershipType === 'FIXED'}
                    onClick={() => setMembershipType('FIXED')}
                  />
                  <OptionCard
                    icon={Shuffle} title="Dynamic Members"
                    desc="No hard cap. Pool auto-activates once a minimum of 3 members join. Duration and payouts adjust as new members join."
                    selected={membershipType === 'DYNAMIC'}
                    onClick={() => setMembershipType('DYNAMIC')}
                  />
                </>
              )}

              {/* ── Step 4: Pool Details ── */}
              {step === 4 && (
                <div className="space-y-5">
                  {contributionStyle === 'FIXED' && (
                    <div>
                      <label className="text-[11px] font-black text-[#1aa08c] uppercase tracking-widest mb-2 block">Monthly Contribution ($)</label>
                      <div className="flex items-center text-4xl font-black text-[#134e4a]">
                        <span className="text-[#134e4a]/40 mr-2">$</span>
                        <input
                          type="number" value={monthlyPay} onChange={e => setMonthlyPay(Number(e.target.value) || 0)}
                          className="bg-transparent text-[#134e4a] w-full outline-none font-black border-b-2 border-[#1aa08c]/20 focus:border-[#1aa08c] transition-colors py-1"
                        />
                      </div>
                    </div>
                  )}

                  {contributionStyle === 'DYNAMIC' && (
                    <div className="p-4 bg-[#f4fcf9] rounded-2xl border border-[#1aa08c]/20">
                      <p className="text-[11px] font-black text-[#1aa08c] uppercase tracking-widest mb-1">Dynamic Contribution Pool</p>
                      <p className="text-sm text-[#134e4a]/60 font-medium">Each member sets their own monthly amount at join. You'll set yours when you join the pool.</p>
                    </div>
                  )}

                  {membershipType === 'FIXED' && (
                    <div className="flex justify-between items-center bg-[#f4fcf9] rounded-2xl p-4 border border-[#1aa08c]/10">
                      <span className="text-[11px] font-black text-[#134e4a]/60 uppercase tracking-widest">No. of Members</span>
                      <input
                        type="number" placeholder="Any" value={members} onChange={e => setMembers(e.target.value)}
                        className="bg-white text-[#134e4a] w-20 text-center rounded-xl px-3 py-1.5 outline-none font-bold border border-[#1aa08c]/20 focus:border-[#1aa08c] focus:ring-2 focus:ring-[#1aa08c]/10 transition-all placeholder:text-[#134e4a]/30"
                      />
                    </div>
                  )}

                  {membershipType === 'DYNAMIC' && (
                    <div className="flex justify-between items-center bg-[#f4fcf9] rounded-2xl p-4 border border-[#1aa08c]/10">
                      <div>
                        <span className="text-[11px] font-black text-[#134e4a]/60 uppercase tracking-widest block">Min Members to Start</span>
                        <span className="text-[10px] text-[#134e4a]/40 font-medium">Pool activates once this many members join</span>
                      </div>
                      <input
                        type="number" min="3" value={minMembers} onChange={e => setMinMembers(Number(e.target.value) || 3)}
                        className="bg-white text-[#134e4a] w-16 text-center rounded-xl px-2 py-1.5 outline-none font-bold border border-[#1aa08c]/20 focus:border-[#1aa08c] focus:ring-2 focus:ring-[#1aa08c]/10 transition-all"
                      />
                    </div>
                  )}

                  {/* Summary box */}
                  <div className="bg-[#f4fcf9] rounded-2xl p-5 border border-[#1aa08c]/10 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[#134e4a]/50 font-bold uppercase tracking-widest text-[10px]">Pool Type</span>
                      <span className="font-black text-[#134e4a] flex items-center gap-1">
                        {poolType === 'PRIORITY' ? <><BrainCircuit size={12} /> AI Priority</> : <><Shuffle size={12} /> Random</>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#134e4a]/50 font-bold uppercase tracking-widest text-[10px]">Contribution</span>
                      <span className="font-black text-[#134e4a]">{contributionStyle === 'FIXED' ? 'Fixed' : 'Dynamic'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#134e4a]/50 font-bold uppercase tracking-widest text-[10px]">Membership</span>
                      <span className="font-black text-[#134e4a]">{membershipType === 'FIXED' ? (parsedMembers ? `${parsedMembers} Members` : 'Open') : `Dynamic (min ${minMembers})`}</span>
                    </div>
                    {contributionStyle === 'FIXED' && parsedMembers && (
                      <div className="flex justify-between items-center border-t border-[#1aa08c]/10 pt-3">
                        <span className="text-[#134e4a]/50 font-bold uppercase tracking-widest text-[10px]">Total Payout</span>
                        <span className="font-black text-[#134e4a]">${totalPool.toLocaleString()}</span>
                      </div>
                    )}
                    {contributionStyle === 'FIXED' && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#1aa08c] font-black uppercase tracking-widest text-[10px]">Your Commitment</span>
                        <span className="font-black text-[#0d9488]">{fixedDeposit} CTX Fixed Deposit</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-[#1aa08c]/10 pt-3">
                      <span className="text-amber-500 font-black uppercase tracking-widest text-[10px] flex items-center gap-1"><Clock size={10} /> Joining Window</span>
                      <span className="font-black text-amber-600 text-xs">Closes {joinDeadlineStr}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest leading-relaxed">
                      ⚠️ If the pool is not full by the deadline, all members are automatically refunded.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-7 relative z-10">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-5 py-3 border-2 border-slate-100 text-[#134e4a] rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95"
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 flex items-center justify-center gap-1 py-3 bg-gradient-to-r from-[#1aa08c] to-[#0d9488] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#1aa08c]/20 hover:shadow-xl hover:shadow-[#1aa08c]/30 transition-all active:scale-95"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                disabled={isLoading}
                onClick={validateEligibilityAndProceed}
                className="flex-1 py-3 bg-gradient-to-r from-[#1aa08c] to-[#0d9488] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#1aa08c]/20 hover:shadow-xl hover:shadow-[#1aa08c]/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : contributionStyle === 'FIXED' ? 'Authenticate & Create' : 'Create Pool'}
              </button>
            )}
          </div>
          {step === 4 && (
            <p className="text-[9.5px] text-[#134e4a]/50 mt-3 text-center font-bold uppercase tracking-widest relative z-10">
              {contributionStyle === 'FIXED' ? 'You will join as the 1st member automatically.' : 'Join the pool separately after creation to set your contribution.'}
            </p>
          )}
        </motion.div>
      </motion.div>

      <EligibilityModal
        isOpen={showEligibility}
        onClose={() => setShowEligibility(false)}
        onProceed={handleCreateWithPayment}
        checks={eligibilityChecks}
        poolMonthlyPay={monthlyPay}
        fixedDeposit={fixedDeposit}
      />
    </>
  );

  return document.body ? createPortal(modalContent, document.body) : modalContent;
};

// ─── Main MyPools page ────────────────────────────────────────────────────────
const MyPools = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [availablePools, setAvailablePools] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, success: false, title: '', message: '', details: [] });

  const { address: userWallet } = useAccount();

  const fetchPools = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/pools');
      const data = await response.json();
      if (response.ok) {
        // Filter out demo/simulation pools (which don't have a creatorWallet)
        const realPools = data.pools.filter(pool => pool.creatorWallet);
        setAvailablePools(realPools);
      }
    } catch (error) {
      console.error('Failed to fetch pools:', error);
    }
  };

  useEffect(() => { fetchPools(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget || !userWallet) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/pools/${deleteTarget}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: userWallet })
      });
      const data = await response.json();
      setDeleteTarget(null);
      if (response.ok) {
        setResultModal({ open: true, success: true, title: 'Pool Deleted', message: data.message || 'Pool deleted. Members refunded.', details: [] });
        fetchPools();
      } else {
        setResultModal({ open: true, success: false, title: 'Delete Failed', message: data.error || 'Failed to delete pool.', details: [] });
      }
    } catch (error) {
      setDeleteTarget(null);
      setResultModal({ open: true, success: false, title: 'Connection Error', message: 'Could not reach server.', details: [] });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pool Offerings</h2>
          <p className="text-slate-500 font-medium mt-2">Discover or create recurring chit fund participation opportunities.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-gradient-to-r from-[#1aa08c] to-[#0d9488] text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-[#1aa08c]/30 hover:scale-[1.02] transition-all active:scale-95 shrink-0"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create New Offering
        </button>
      </div>

      {availablePools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {availablePools.map(pool => {
            const isCreator = userWallet && pool.creatorWallet?.toLowerCase() === userWallet.toLowerCase();
            return (
              <div key={pool._id} className="relative group">
                <PoolFlipCard pool={{ ...pool, id: pool._id }} onRefresh={fetchPools} />
                {isCreator && (
                  <button
                    onClick={() => setDeleteTarget(pool._id)}
                    className="absolute -top-3 -right-3 z-10 p-2 bg-red-100 text-red-600 rounded-full shadow hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                    title="Delete Pool"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 text-center text-slate-400">
          <p className="font-bold">No pools available. Create one to get started!</p>
        </div>
      )}

      <AnimatePresence>
        {isCreating && (
          <CreatePoolModal
            refreshPools={fetchPools}
            onClose={() => setIsCreating(false)}
            showResult={(success, title, message) => setResultModal({ open: true, success, title, message, details: [] })}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        isLoading={deleteLoading} variant="delete" title="Delete This Pool?"
        description="This will permanently remove the pool. All joined members will have their fixed deposits automatically refunded."
        confirmText="Delete Pool"
      />

      <ResultModal
        isOpen={resultModal.open}
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))}
        success={resultModal.success} title={resultModal.title}
        message={resultModal.message} details={resultModal.details}
      />
    </div>
  );
};

export default MyPools;
