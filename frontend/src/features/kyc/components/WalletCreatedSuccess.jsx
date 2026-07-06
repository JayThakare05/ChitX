import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Wallet, Zap, TrendingUp, ArrowRight, Star } from 'lucide-react';

export default function WalletCreatedSuccess({ data, onGoToDashboard }) {
    const [animStep, setAnimStep] = useState(0);

    const { walletAddress, tokensIssued, trustScore, kycConfidence } = data || {};
    const shortWallet = walletAddress
        ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
        : '—';

    useEffect(() => {
        const timers = [
            setTimeout(() => setAnimStep(1), 400),
            setTimeout(() => setAnimStep(2), 900),
            setTimeout(() => setAnimStep(3), 1400),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    const unlocked = [
        'Join / Create Pools',
        `${tokensIssued?.toLocaleString() || 0} CTX Tokens Airdropped`,
        'AI Trust Score Enabled',
        'Emergency Fund',
        'Full Dashboard',
    ];

    return (
        <div className="space-y-6 text-center">
            {/* Animated checkmark */}
            <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-teal-300/40"
            >
                <CheckCircle2 size={36} className="text-white" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h3 className="text-2xl font-black text-slate-800">KYC Complete! 🎉</h3>
                <p className="text-slate-500 text-sm mt-1">
                    Your identity has been verified. Welcome to ChitX.
                </p>
            </motion.div>

            {/* Stats row */}
            {animStep >= 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-3"
                >
                    {[
                        { icon: TrendingUp, label: 'Trust Score', value: trustScore || '—', color: 'bg-blue-50 text-blue-600' },
                        { icon: Zap, label: 'CTX Tokens', value: (tokensIssued || 0).toLocaleString(), color: 'bg-violet-50 text-violet-600' },
                        { icon: Star, label: 'KYC Score', value: `${kycConfidence || 0}%`, color: 'bg-emerald-50 text-emerald-600' },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className={`rounded-xl p-3 ${color} bg-opacity-60`}>
                            <Icon size={20} className="mx-auto mb-1" />
                            <p className="font-black text-lg leading-tight">{value}</p>
                            <p className="text-xs font-medium opacity-70">{label}</p>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Wallet address */}
            {animStep >= 2 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 rounded-2xl p-4 text-left"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={16} className="text-teal-400" />
                        <span className="text-teal-400 text-xs font-bold uppercase tracking-widest">Connected Web3 Wallet</span>
                    </div>
                    <p className="text-white font-mono text-sm font-bold break-all">{shortWallet}</p>
                    <p className="text-slate-500 text-xs mt-1">Ready for on-chain ChitX transactions.</p>
                </motion.div>
            )}

            {/* Unlocked features */}
            {animStep >= 3 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 rounded-2xl p-4 text-left border border-emerald-100"
                >
                    <p className="text-emerald-800 font-bold text-sm mb-3 uppercase tracking-widest">✅ You now have access to:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {unlocked.map(item => (
                            <div key={item} className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-500 flex-none" />
                                <span className="text-sm font-bold text-emerald-800">{item}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {animStep >= 3 && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGoToDashboard}
                    className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm
                        uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 transition-all"
                >
                    Go To Dashboard <ArrowRight size={16} />
                </motion.button>
            )}
        </div>
    );
}
