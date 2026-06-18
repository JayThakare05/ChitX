import React, { useState, useRef, useEffect } from 'react';
import { Layers, LogOut, ShieldAlert, Award, Clock, Users, ArrowRight, CheckCircle2, AlertCircle, BrainCircuit, Upload, FileText, X, Shuffle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseEther } from 'viem';
import { ConfirmModal, ResultModal, EligibilityModal } from '../ui/PoolModals';

import { CTX_ADDRESS, TREASURY_ADDRESS, ERC20_ABI } from '../../constants';

const PoolFlipCard = ({ pool, onRefresh }) => {
  const members = pool.members || null;
  const monthlyPay = pool.monthlyPay || 0;
  const totalAmount = pool.totalAmount || (members ? (monthlyPay * members) : 'Dynamic');
  const fixedDeposit = monthlyPay * 2;
  const navigate = useNavigate();

  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [emergencyFile, setEmergencyFile] = useState(null);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, success: false, title: '', message: '', details: [] });
  const [joinStep, setJoinStep] = useState(''); // '', 'wallet', 'backend'
  const [showEligibility, setShowEligibility] = useState(false);
  const [eligibilityChecks, setEligibilityChecks] = useState([]);
  // For dynamic contribution pools — member sets their own amount
  const [customMonthlyPay, setCustomMonthlyPay] = useState('');

  const userStr = localStorage.getItem('chitx_user');
  const userWallet = userStr ? JSON.parse(userStr).walletAddress?.toLowerCase() : null;
  const isAlreadyJoined = pool.joinedMembers && userWallet && pool.joinedMembers.includes(userWallet);
  const isDynamicContribution = pool.contributionStyle === 'DYNAMIC';
  const isDynamicMembership = pool.membershipType === 'DYNAMIC';
  const isRandomPool = pool.poolType === 'RANDOM';

  const effectiveFixedDeposit = isDynamicContribution
    ? (Number(customMonthlyPay) || 0) * 2
    : fixedDeposit;

  const myContribution = pool.contributions && userWallet
    ? pool.contributions.find(c => c.walletAddress === userWallet)
    : null;
  const canLeave = isAlreadyJoined && myContribution && myContribution.monthlyPayments === 0;

  // Joining deadline countdown
  const [deadlineStr, setDeadlineStr] = useState('');
  useEffect(() => {
    if (!pool.joinDeadline) return;
    const update = () => {
      const diff = new Date(pool.joinDeadline) - Date.now();
      if (diff <= 0) { setDeadlineStr('Closed'); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs  = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setDeadlineStr(days > 0 ? `${days}d ${hrs}h left` : `${hrs}h left`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [pool.joinDeadline]);

  const [ctxBalance, setCtxBalance] = useState(null);

  // Wagmi hooks
  const { address: connectedAddress, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const fetchBalance = async () => {
    if (!userWallet) return;
    try {
      const res = await fetch(`http://localhost:5000/api/pools/balance/${userWallet}`);
      const data = await res.json();
      if (res.ok) setCtxBalance(data.onChainBalance);
    } catch { /* ignore */ }
  };

  const openJoinConfirm = async (e) => {
    e.stopPropagation();

    // For dynamic contribution pools, check if user has entered their amount
    if (isDynamicContribution && (!customMonthlyPay || Number(customMonthlyPay) <= 0)) {
      return; // The input is shown inline, wait for them to fill it
    }

    // ── Read stored user data ──────────────────────────────────
    const userData = userStr ? JSON.parse(userStr) : {};
    const trustScore       = Number(userData.trustScore   ?? 0);
    const income           = Number(userData.income        ?? 0);
    const expenses         = Number(userData.expenses      ?? 0);
    const disposable       = income - expenses;
    const effectiveMonthlyPay = isDynamicContribution ? Number(customMonthlyPay) : monthlyPay;

    // ── Fetch live CTX balance ────────────────────────────────
    let balance = 0;
    try {
      const res  = await fetch(`http://localhost:5000/api/pools/balance/${userWallet}`);
      const data = await res.json();
      if (res.ok) {
        balance = parseFloat(data.onChainBalance) || 0;
        setCtxBalance(balance);
      }
    } catch { /* network error — leave balance at 0 */ }

    // ── Build checks ──────────────────────────────────────────
    const isMicroPool  = effectiveMonthlyPay >= 5 && effectiveMonthlyPay <= 10;
    const isLowTrust   = trustScore < 50;
    const depositRequired = effectiveMonthlyPay * 2;

    const incomeOk     = disposable >= effectiveMonthlyPay;
    const balanceOk    = balance    >= depositRequired;
    
    // Low trust users can join micro-pools IF balance is OK.
    // For larger pools, low trust is a hard fail for that check.
    const trustPassed  = trustScore >= 50 || (isMicroPool && balanceOk);
    
    let trustHint = '';
    if (trustScore >= 50) {
      trustHint = 'Score is above the minimum threshold of 50.';
    } else if (isMicroPool) {
      trustHint = balanceOk 
        ? `Low-Trust Exception: You can join this micro-pool because your balance is sufficient.`
        : `Your score is ${trustScore}. For micro-pools, a sufficient CTX balance is compulsory.`;
    } else {
      trustHint = `Your score is ${trustScore}. Pools above $10 require a minimum trust score of 50.`;
    }

    const checks = [
      {
        label:  'Trust Score',
        value:  `${trustScore} / 100`,
        passed: trustPassed,
        hint:   trustHint,
        isHardRequirement: isLowTrust && !isMicroPool,
      },
      {
        label:  'Disposable Income',
        value:  `$${disposable.toLocaleString()} / mo`,
        passed: incomeOk,
        hint:   incomeOk
          ? `You have \$${disposable.toLocaleString()} free after expenses — enough to cover the \$${effectiveMonthlyPay} monthly pay.`
          : `Your disposable income (\$${disposable.toLocaleString()}) is less than the pool's monthly pay (\$${effectiveMonthlyPay}). Reduce expenses or choose a smaller pool.`,
      },
      {
        label:  'CTX Balance',
        value:  `${balance.toFixed(1)} CTX`,
        passed: balanceOk,
        hint:   balanceOk
          ? `You have ${balance.toFixed(1)} CTX — sufficient for the ${depositRequired} CTX fixed deposit.`
          : `You need ${depositRequired} CTX as a fixed deposit but only have ${balance.toFixed(1)} CTX. Earn more CTX first.`,
        isHardRequirement: isLowTrust && isMicroPool,
      },
    ];

    setEligibilityChecks(checks);
    setShowEligibility(true);
  };

  // Called when user clicks "Proceed to Pay" from the eligibility modal
  const proceedAfterEligibility = () => {
    setShowEligibility(false);
    setShowJoinConfirm(true);
  };

  const showResult = (success, title, message, details = []) => {
    setResultModal({ open: true, success, title, message, details });
  };

  const handleJoin = async () => {
    if (!userWallet) return showResult(false, 'Not Logged In', 'Please login first to join pools.');
    setShowJoinConfirm(false);
    setIsJoining(true);
    setJoinStep('wallet');

    const effectiveMonthlyPay = isDynamicContribution ? Number(customMonthlyPay) : monthlyPay;
    const depositAmount = effectiveMonthlyPay * 2;

    try {
      // Step 0: Ensure we are on the Sepolia network
      if (chainId !== sepolia.id) {
        try {
          await switchChainAsync({ chainId: sepolia.id });
        } catch (switchErr) {
          showResult(false, 'Network Switch Failed', 'Please switch your wallet to Sepolia to continue.');
          setIsJoining(false);
          setJoinStep('');
          return;
        }
      }

      // Step 1: On-chain CTX transfer via MetaMask
      const amountWei = parseEther(depositAmount.toString());
      
      let txHash;
      try {
        txHash = await writeContractAsync({
          address: CTX_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [TREASURY_ADDRESS, amountWei],
          chainId: sepolia.id,
          gas: 100000n,
        });
      } catch (walletErr) {
        const msg = walletErr?.shortMessage || walletErr?.message || 'MetaMask transaction rejected.';
        showResult(false, 'Transaction Cancelled', msg);
        setIsJoining(false);
        setJoinStep('');
        return;
      }

      // Step 2: Register join in backend
      setJoinStep('backend');
      const res = await fetch(`http://localhost:5000/api/pools/${pool.id || pool._id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet,
          txHash,
          // For dynamic pools, send the chosen contribution amount
          ...(isDynamicContribution && { customMonthlyPay: effectiveMonthlyPay })
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        showResult(false, 'Cannot Join Pool', data.error || 'Failed to join pool.');
      } else {
        const stored = JSON.parse(localStorage.getItem('chitx_user') || '{}');
        stored.airdropAmount = data.remainingBalance || data.onChainBalance;
        localStorage.setItem('chitx_user', JSON.stringify(stored));
        const activatedMsg = data.poolActivated ? ' 🚀 Pool is now ACTIVE — cycle has started!' : '';
        showResult(true, 'Pool Joined!', (data.message || 'Successfully joined the pool!') + activatedMsg, [
          { label: 'Monthly Contribution', value: `$${effectiveMonthlyPay.toLocaleString()}` },
          { label: 'Fixed Deposit Deducted', value: `${depositAmount} CTX` },
          { label: 'Tx Hash', value: txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-6)}` : 'Confirmed' },
          { label: 'Remaining Balance', value: `${data.remainingBalance || data.onChainBalance || '—'} CTX` }
        ]);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      showResult(false, 'Error', err?.message || 'Could not complete the transaction.');
    } finally {
      setIsJoining(false);
      setJoinStep('');
    }
  };

  const handleLeave = async () => {
    setShowLeaveConfirm(false);
    setIsLeaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/pools/${pool.id || pool._id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: userWallet })
      });
      const data = await res.json();
      if (!res.ok) {
        showResult(false, 'Cannot Leave', data.error || 'Failed to leave pool.');
      } else {
        const stored = JSON.parse(localStorage.getItem('chitx_user') || '{}');
        stored.airdropAmount = data.newBalance;
        localStorage.setItem('chitx_user', JSON.stringify(stored));
        showResult(true, 'Pool Left Successfully', data.message || 'Refund processed.', [
          { label: 'Refunded', value: `${data.refunded || fixedDeposit} CTX` },
          { label: 'New Balance', value: `${data.newBalance || '—'} CTX` }
        ]);
        if (onRefresh) onRefresh();
      }
    } catch {
      showResult(false, 'Connection Error', 'Could not reach the server. Please try again.');
    } finally {
      setIsLeaving(false);
    }
  };

  const [showEmergencyUpload, setShowEmergencyUpload] = useState(false);
  const emergencyFileRef = useRef(null);

  const openEmergencyFlow = (e) => {
    e.stopPropagation();
    setEmergencyFile(null);
    setShowEmergencyUpload(true);
  };

  const handleEmergencyFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setEmergencyFile(file);
  };

  const submitEmergency = async () => {
    if (!emergencyFile) return;
    setIsFlagging(true);
    setShowEmergencyUpload(false);
    try {
      const formData = new FormData();
      formData.append('walletAddress', userWallet);
      formData.append('document', emergencyFile);
      formData.append('reason', emergencyReason || 'No reason provided');

      const res = await fetch(`http://localhost:5000/api/pools/${pool._id || pool.id}/emergency`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        const verif = data.verification || {};
        showResult(true, '🚨 Emergency Approved!', 
          `AI verified your document as "${verif.category || 'emergency'}" (${verif.severity || 'high'} severity, ${verif.confidence || 0}% confidence). Your new Priority Score is ${data.newScore}.`);
        if (onRefresh) onRefresh();
      } else if (res.status === 403) {
        showResult(false, 'Emergency Denied', `${data.error}\n\nReason: ${data.reason || 'N/A'}`);
      } else {
        showResult(false, 'Failed', data.error || 'Server error computing emergency flag.');
      }
    } catch (err) {
      showResult(false, 'Network Error', 'Backend not reachable.');
    } finally {
      setIsFlagging(false);
      setEmergencyFile(null);
    }
  };

  // Progress bar
  const joinedCount = pool.joinedMembers ? pool.joinedMembers.length : 0;
  const targetMembers = members || 15;
  const fillPercent = Math.min(100, Math.round((joinedCount / targetMembers) * 100));

  // Joining state text
  const getJoinButtonText = () => {
    if (!isJoining) {
      if (isDynamicContribution) return `Join with $${customMonthlyPay || '?'}/mo`;
      return `Join Pool (${fixedDeposit} CTX)`;
    }
    if (joinStep === 'wallet') return 'Confirm in MetaMask...';
    if (joinStep === 'backend') return 'Registering...';
    return 'Processing...';
  };

  return (
    <>
      <div className="w-full h-[22rem] bg-transparent cursor-pointer group [perspective:1000px]">
        <div className="relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-sm hover:shadow-md rounded-3xl">
          
          {/* Front Side */}
          <div className="absolute inset-0 w-full h-full bg-white rounded-3xl p-7 border border-slate-100 flex flex-col justify-between [backface-visibility:hidden]">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100/50">
                {isRandomPool ? <Shuffle size={24} /> : <Layers size={24} />}
              </div>
              <div className="flex flex-col items-end gap-1">
                {/* Real pool status — always shown */}
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                  pool.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200 animate-pulse' :
                  pool.status === 'CLOSED' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                  pool.status === 'EXPIRED' ? 'bg-red-50 text-red-500 border-red-100' :
                  'bg-teal-50 text-teal-700 border-teal-100'
                }`}>
                  {pool.status === 'ACTIVE' ? '🟢 ACTIVE' : (pool.status || 'OPEN')}
                </span>
                {/* Joined indicator */}
                {isAlreadyJoined && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                    ✓ Joined
                  </span>
                )}
                {/* Pool type badge */}
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                  isRandomPool ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  {isRandomPool ? '🎲 Random' : '🤖 AI Priority'}
                </span>
              </div>
            </div>
            
            <div>
              <h4 className="text-3xl font-black text-slate-800 tracking-tight">
                {isDynamicContribution ? 'Dynamic' : `$${monthlyPay.toLocaleString()}`}
                {!isDynamicContribution && <span className="text-sm font-bold text-slate-400"> / mo</span>}
              </h4>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-400"></span>
                  {isDynamicMembership ? `Dynamic Pool` : (members ? `${members} Members` : 'Open Pool')}
                </p>
                {isDynamicContribution && (
                  <span className="text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded uppercase tracking-widest">Dynamic Contrib.</span>
                )}
              </div>
            </div>

            {/* Pool fill progress */}
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                <span>{joinedCount} joined</span>
                <span>{members ? `${members} slots` : 'open'}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${fillPercent}%` }}></div>
              </div>
              {/* Joining deadline */}
              {deadlineStr && pool.status === 'OPEN' && (
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                  <Clock size={9} /> {deadlineStr} to join
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
              <span className="flex-1 h-px bg-slate-100"></span>
              <span className="text-[10px] uppercase tracking-widest font-bold">Hover to flip</span>
              <span className="flex-1 h-px bg-slate-100"></span>
            </div>
          </div>

          {/* Back Side */}
          <div className="absolute inset-0 w-full h-full bg-[#134e4a] rounded-3xl p-7 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] text-white shadow-xl shadow-[#134e4a]/30">
            <div>
              <h4 className="text-[10px] font-extrabold text-[#1aa08c] uppercase tracking-widest mb-1">Total Pool Output</h4>
              <div className="text-3xl font-black text-white">{isDynamicContribution ? 'Dynamic' : (members ? `$${totalAmount.toLocaleString()}` : 'Dynamic')}</div>
              {/* Pool type + contribution badges */}
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-white/10 text-white/70 uppercase tracking-widest">
                  {isRandomPool ? '🎲 Random' : '🤖 AI Priority'}
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-white/10 text-white/70 uppercase tracking-widest">
                  {isDynamicContribution ? 'Dynamic Contrib.' : 'Fixed Contrib.'}
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-white/10 text-white/70 uppercase tracking-widest">
                  {isDynamicMembership ? 'Dynamic Members' : 'Fixed Members'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2.5 bg-white/5 rounded-2xl p-3.5 border border-white/10">
              {!isDynamicContribution && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#1aa08c] font-bold uppercase tracking-widest text-[10px]">Monthly Pay</span>
                  <span className="font-black text-white">${monthlyPay.toLocaleString()}</span>
                </div>
              )}
              {isDynamicContribution && !isAlreadyJoined && (
                <div>
                  <span className="text-[#1aa08c] font-bold uppercase tracking-widest text-[10px] block mb-1.5">Your Monthly Contribution</span>
                  <input
                    type="number"
                    placeholder="Enter amount..."
                    value={customMonthlyPay}
                    onChange={e => setCustomMonthlyPay(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-white/10 text-white placeholder:text-white/30 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#1aa08c] focus:bg-white/15 transition-all"
                    min="1"
                  />
                  {customMonthlyPay > 0 && (
                    <p className="text-[10px] text-white/50 font-bold mt-1">Fixed deposit: {Number(customMonthlyPay) * 2} CTX</p>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#1aa08c] font-bold uppercase tracking-widest text-[10px]">Members</span>
                <span className="font-black text-white">{isDynamicMembership ? `Dynamic (min ${pool.minMembersForDynamic || 3})` : (members || 'Any')}</span>
              </div>
              {!isDynamicContribution && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#1aa08c] font-bold uppercase tracking-widest text-[10px]">Fixed Deposit</span>
                  <span className="font-black text-white">{fixedDeposit} CTX</span>
                </div>
              )}
              {isAlreadyJoined && myContribution && (
                <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2.5">
                  <span className="text-[#1aa08c] font-bold uppercase tracking-widest text-[10px]">Your Contribution</span>
                  <span className="font-black text-white">{myContribution.totalContributed} CTX</span>
                </div>
              )}
              {pool.poolTreasury > 0 && (
                <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2.5">
                  <span className="text-amber-400 font-bold uppercase tracking-widest text-[10px]">Pool Treasury</span>
                  <span className="font-black text-amber-100">{pool.poolTreasury} CTX</span>
                </div>
              )}
              {deadlineStr && pool.status === 'OPEN' && (
                <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2.5">
                  <span className="text-amber-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1"><Clock size={9} /> Join Deadline</span>
                  <span className="font-black text-amber-200 text-[11px]">{deadlineStr}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {!isAlreadyJoined ? (
                <button
                  onClick={openJoinConfirm}
                  disabled={isJoining || (isDynamicContribution && (!customMonthlyPay || Number(customMonthlyPay) <= 0))}
                  className="w-full py-2.5 bg-white text-[#134e4a] rounded-xl font-bold text-sm hover:bg-[#f4fcf9] transition-colors shadow-inner flex justify-center items-center disabled:opacity-50 active:scale-95"
                >
                  {getJoinButtonText()}
                </button>
              ) : canLeave ? (
                <>
                  <button onClick={() => navigate(`/pool-simulator?poolId=${pool._id}`)} className="flex-1 py-2.5 bg-gradient-to-r from-[#1aa08c] to-[#0d9488] shadow-lg shadow-[#1aa08c]/20 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95">
                    <BrainCircuit size={14} /> Simulate
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowLeaveConfirm(true); }} disabled={isLeaving} className="flex-1 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all flex justify-center items-center gap-1.5 disabled:opacity-80 active:scale-95">
                    <LogOut size={14} />
                    {isLeaving ? '...' : 'Leave'}
                  </button>
                </>
              ) : (
                <button onClick={() => navigate(`/pool-simulator?poolId=${pool._id}`)} className="w-full py-2.5 bg-gradient-to-r from-[#1aa08c] to-[#0d9488] shadow-lg shadow-[#1aa08c]/20 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all hover:scale-[1.02] active:scale-95">
                  <BrainCircuit size={16} /> Simulate AI Process
                </button>
              )}
            </div>
            {/* View details button / Enlarge link */}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              className="mt-3 text-[11px] font-bold text-white/50 hover:text-white uppercase tracking-widest text-center block w-full outline-none transition-colors"
            >
              View Full Details
            </button>
          </div>
        </div>
      </div>

      {/* ENLARGED POOL CARD MODAL */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f3d3a]/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="bg-[#f4fcf9] border border-[#1aa08c]/20 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative px-8 py-8 animate-in zoom-in-95 duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-[#134e4a] tracking-tight">Pool Details</h2>
                <div className="flex items-center gap-2 mt-2 text-[#134e4a]/60 text-sm">
                  <span className="px-2.5 py-0.5 bg-white text-[#1aa08c] shadow-sm rounded-md uppercase font-black text-[10px] tracking-wider border border-[#1aa08c]/20">
                    {pool.status || 'AVAILABLE'}
                  </span>
                  <span className="font-bold">{members || 'Dynamic'} Members Max</span>
                </div>
              </div>
              <button onClick={() => setIsExpanded(false)} className="p-2 rounded-full text-[#134e4a]/40 hover:text-[#134e4a] bg-black/5 hover:bg-black/10 transition-all cursor-pointer z-50">
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl border border-[#1aa08c]/10 shadow-sm">
                <p className="text-[10px] font-black uppercase text-[#1aa08c] tracking-wider mb-1">Monthly Pay</p>
                <p className="text-2xl font-black text-[#134e4a]">${monthlyPay.toLocaleString()}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#1aa08c]/10 shadow-sm">
                <p className="text-[10px] font-black uppercase text-[#1aa08c] tracking-wider mb-1">Target Output</p>
                <p className="text-2xl font-black text-emerald-500">${totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#1aa08c]/10 shadow-sm">
                <p className="text-[10px] font-black uppercase text-[#1aa08c] tracking-wider mb-1">Fixed Deposit</p>
                <p className="text-2xl font-black text-amber-500">{fixedDeposit} CTX</p>
              </div>
            </div>

            {/* Detailed Member List */}
            <div className="flex-1 min-h-[200px]">
               <h3 className="text-xs font-black uppercase tracking-widest text-[#134e4a]/50 mb-4 flex items-center gap-2 border-b border-[#1aa08c]/10 pb-3">
                 <Users size={16} /> Registered Investors
               </h3>
               
               <div className="space-y-3">
                  {!pool.contributions || pool.contributions.length === 0 ? (
                    <p className="text-[#134e4a]/40 font-medium text-sm italic">No investors have joined yet.</p>
                  ) : (
                    pool.contributions.map((c, i) => {
                      const isMe = c.walletAddress === userWallet;
                      const hasFlag = c.emergencyFlag;
                      return (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          isMe ? 'border-[#1aa08c]/30 bg-white shadow-sm' : 'border-slate-100 bg-white'
                        }`}>
                          <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isMe ? 'bg-[#1aa08c]/10 text-[#1aa08c]' : 'bg-slate-50 text-[#134e4a]/30'}`}>
                               #{i+1}
                             </div>
                             <div>
                               <p className="font-bold text-sm text-[#134e4a] flex items-center gap-2">
                                 {c.walletAddress}
                                 {isMe && <span className="bg-gradient-to-r from-[#1aa08c] to-[#0d9488] text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase shadow-sm">You</span>}
                                 {hasFlag && <span className="bg-red-50 text-red-500 border border-red-500/20 text-[9px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-1 shadow-sm"><AlertCircle size={10}/> Emergency</span>}
                               </p>
                               <div className="flex items-center gap-3 mt-1.5">
                                 <p className="text-[10px] font-bold text-[#134e4a]/40 uppercase tracking-widest">
                                   Contrib: <span className="text-[#134e4a]">${c.monthlyContribution}/mo</span>
                                 </p>
                                 <p className="text-[10px] font-bold text-[#134e4a]/40 uppercase tracking-widest">
                                   Score: <span className="text-[#1aa08c]">{c.priorityScore.toFixed(1)}</span>
                                 </p>
                               </div>
                             </div>
                          </div>
                        </div>
                      )
                    })
                  )}
               </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-6 border-t border-[#1aa08c]/10 flex justify-between items-center sticky bottom-0 z-10 bg-[#f4fcf9]/90 backdrop-blur pb-2">
               <div className="flex gap-3">
                  {isAlreadyJoined && canLeave && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsExpanded(false); setShowLeaveConfirm(true); }}
                      className="px-5 py-3 border-2 border-slate-200 text-[#134e4a] bg-white hover:bg-[#f4fcf9] rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95"
                    >
                      <LogOut size={16} /> Leave Pool
                    </button>
                  )}
                  {isAlreadyJoined && myContribution && !myContribution.emergencyFlag && !myContribution.hasBeenPaid && (
                    <button 
                      onClick={openEmergencyFlow} 
                      disabled={isFlagging}
                      className="px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-500/20 text-red-600 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95"
                    >
                      <ShieldAlert size={16} /> {isFlagging ? 'AI Verifying...' : 'Request Emergency Payout'}
                    </button>
                  )}
               </div>
               
               <div>
                 {isAlreadyJoined && (
                   <button 
                     onClick={() => navigate(`/pool-simulator?poolId=${pool._id}`)} 
                     className="px-6 py-3 bg-gradient-to-r from-[#1aa08c] to-[#0d9488] hover:shadow-lg hover:shadow-[#1aa08c]/30 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 active:scale-95"
                   >
                     Go to Simulator <ArrowRight size={16} strokeWidth={3} />
                   </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* EMERGENCY DOCUMENT UPLOAD MODAL */}
      {showEmergencyUpload && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0f3d3a]/60 backdrop-blur-md"
          onClick={() => setShowEmergencyUpload(false)}
        >
          <div 
            className="bg-white border border-[#1aa08c]/20 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-[#134e4a] flex items-center gap-2">
                  <ShieldAlert className="text-red-500" size={22} strokeWidth={2.5} /> Emergency Form
                </h3>
                <p className="text-[#134e4a]/60 font-medium text-sm mt-1">Upload an authentic document for AI verification.</p>
              </div>
              <button onClick={() => setShowEmergencyUpload(false)} className="text-[#134e4a]/40 hover:text-[#134e4a] p-2 bg-black/5 rounded-full hover:bg-black/10 transition-all cursor-pointer">
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-black text-[#1aa08c] uppercase tracking-widest mb-3">Accepted Documents</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#f4fcf9] rounded-xl p-3 border border-[#1aa08c]/10">
                  <FileText size={20} className="text-blue-500 mx-auto mb-1" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-[#134e4a]/60">Document</span>
                </div>
                <div className="bg-[#f4fcf9] rounded-xl p-3 border border-[#1aa08c]/10">
                  <FileText size={20} className="text-emerald-500 mx-auto mb-1" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-[#134e4a]/60">Bill</span>
                </div>
                <div className="bg-[#f4fcf9] rounded-xl p-3 border border-[#1aa08c]/10">
                  <FileText size={20} className="text-amber-500 mx-auto mb-1" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-[#134e4a]/60">Scan</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-black text-[#1aa08c] uppercase tracking-widest mb-2 block">Describe your Emergency</label>
              <textarea 
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                placeholder="Hospital bill for surgery, sudden job loss..."
                className="w-full bg-[#f4fcf9] font-medium border border-[#1aa08c]/20 rounded-xl p-4 text-sm text-[#134e4a] placeholder:text-[#134e4a]/30 focus:outline-none focus:border-[#1aa08c] focus:ring-4 focus:ring-[#1aa08c]/10 min-h-[80px] resize-none transition-all"
              />
            </div>

            {/* File Upload Area */}
            <input 
              type="file" 
              ref={emergencyFileRef}
              onChange={handleEmergencyFileChange}
              accept=".pdf,.txt,.csv,.jpg,.jpeg,.png,.webp"
              className="hidden"
            />
            <div 
              onClick={() => emergencyFileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                emergencyFile 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : 'border-slate-200 hover:border-[#1aa08c]/50 bg-[#f4fcf9] hover:bg-white'
              }`}
            >
              {emergencyFile ? (
                <div>
                  <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" strokeWidth={3} />
                  <p className="text-emerald-600 font-bold text-sm tracking-tight">{emergencyFile.name}</p>
                  <p className="text-[#134e4a]/40 font-bold text-[10px] tracking-widest uppercase mt-1">{(emergencyFile.size / 1024).toFixed(1)} KB — Click to change</p>
                </div>
              ) : (
                <div>
                  <Upload size={28} className="text-[#1aa08c]/50 mx-auto mb-2" />
                  <p className="text-[#134e4a] font-bold tracking-tight text-sm">Drop file or click to browse</p>
                  <p className="text-[#134e4a]/40 font-bold tracking-widest uppercase text-[10px] mt-1.5">PDF, TXT, IMG · Max 10MB</p>
                </div>
              )}
            </div>

            <div className="mt-5 p-3 bg-red-50 border border-red-500/20 rounded-xl">
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest leading-relaxed">
                <strong className="text-red-500">⚠️ AI Verifier:</strong> Groq analyzes this for authenticity. Forgery hurts your immutable trust score.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowEmergencyUpload(false)} 
                className="flex-[0.8] py-3.5 border-2 border-slate-200 bg-white text-[#134e4a] rounded-xl font-bold text-sm hover:bg-[#f4fcf9] transition-all active:scale-95 shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={submitEmergency} 
                disabled={!emergencyFile || isFlagging}
                className="flex-[1.2] py-3.5 bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg hover:shadow-red-500/30 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <ShieldAlert size={16} strokeWidth={3} /> Submit for AI Review
              </button>
            </div>
          </div>
        </div>
      )}

      <EligibilityModal
        isOpen={showEligibility}
        onClose={() => setShowEligibility(false)}
        onProceed={proceedAfterEligibility}
        checks={eligibilityChecks}
        poolMonthlyPay={monthlyPay}
        fixedDeposit={fixedDeposit}
      />

      {/* ===== MODALS ===== */}
      <ConfirmModal
        isOpen={showJoinConfirm}
        onClose={() => setShowJoinConfirm(false)}
        onConfirm={handleJoin}
        isLoading={isJoining}
        variant="join"
        title="Join This Pool?"
        description="MetaMask will prompt you to transfer CTX tokens as a fixed deposit. You can leave and get a full refund only before making your first monthly payment."
        details={[
          { label: 'Pool Type', value: isRandomPool ? '🎲 Random Lottery' : '🤖 AI Priority' },
          { label: 'Contribution Style', value: isDynamicContribution ? 'Dynamic' : 'Fixed' },
          { label: 'Monthly Pay', value: isDynamicContribution ? `$${customMonthlyPay}/mo (your amount)` : `$${monthlyPay.toLocaleString()}` },
          { label: 'Fixed Deposit', value: `${effectiveFixedDeposit} CTX` },
          { label: 'Your CTX Balance', value: ctxBalance !== null ? `${ctxBalance} CTX` : 'Loading...' },
          { label: 'Membership', value: members ? `${members} Members` : 'Dynamic' },
        ]}
        confirmText="Approve in MetaMask"
      />

      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        isLoading={isLeaving}
        variant="leave"
        title="Leave This Pool?"
        description="Your fixed deposit will be refunded to your wallet since you haven't made any monthly payments yet."
        details={[
          { label: 'Refund Amount', value: `${myContribution?.fixedDeposit || fixedDeposit} CTX` },
        ]}
        confirmText="Leave & Refund"
      />

      <ResultModal
        isOpen={resultModal.open}
        onClose={() => { setResultModal(prev => ({ ...prev, open: false })); }}
        success={resultModal.success}
        title={resultModal.title}
        message={resultModal.message}
        details={resultModal.details}
      />
    </>
  );
};

export default PoolFlipCard;
