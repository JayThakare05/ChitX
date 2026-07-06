import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, ArrowRight, ShieldCheck, Zap, TrendingUp, CheckCircle2, ChevronLeft, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ethers } from 'ethers';

const API = 'http://localhost:5000/api';

// ── Feature Pills ───────────────────────────────────────────────────────────
const features = [
    { icon: ShieldCheck, label: 'Bank-grade KYC', color: 'text-emerald-600 bg-emerald-50' },
    { icon: Zap, label: 'AI Trust Score', color: 'text-violet-600 bg-violet-50' },
    { icon: TrendingUp, label: 'Blockchain Wallet', color: 'text-blue-600 bg-blue-50' },
];

export default function AuthFlow() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ── MetaMask Connect ───────────────────────────────────────────────────────
    const handleConnectMetaMask = async () => {
        setError('');
        setSuccess('');

        if (!window.ethereum) {
            setError('MetaMask is not installed. Please install it to continue.');
            return;
        }

        try {
            setLoading(true);

            // 1. Request account access
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const walletAddress = accounts[0];

            // 2. Request signature for authentication
            const message = `Welcome to ChitX!\n\nPlease sign this message to authenticate your wallet.\n\nNonce: ${Date.now()}`;
            const signer = await provider.getSigner();
            const signature = await signer.signMessage(message);

            // 3. Authenticate with Backend
            const res = await axios.post(`${API}/auth/metamask`, {
                walletAddress,
                signature,
                message
            });

            const { token, user } = res.data;

            // 4. Save session
            localStorage.setItem('chitx_token', token);
            localStorage.setItem('chitx_user', JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                kycStatus: user.kycStatus,
                kycStep: user.kycStep,
                walletCreated: user.walletCreated,
                walletAddress: user.walletAddress,
                trustScore: user.trustScore || 0,
                airdropAmount: user.tokensIssued || 0,
                loginType: user.loginType
            }));

            setSuccess('Authentication successful! Redirecting...');
            setTimeout(() => {
                if (user.kycStatus === 'pending') {
                    navigate('/dashboard'); // Dashboard will intercept and show KYC modal
                } else {
                    navigate('/dashboard');
                }
            }, 1000);

        } catch (err) {
            console.error('MetaMask Connect Error:', err);
            if (err.code === 4001) {
                setError('You rejected the connection or signature request.');
            } else {
                setError(err.response?.data?.error || 'Authentication failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 flex">
            {/* ── Left Panel (branding) ── */}
            <div className="hidden lg:flex flex-col justify-between w-[45%] p-16 relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />

                {/* Logo */}
                <button onClick={() => navigate('/')} className="flex items-center gap-2 group w-fit">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg">
                        <span className="text-white font-black text-lg">C</span>
                    </div>
                    <span className="text-2xl font-black text-white tracking-tight">
                        Chit<span className="text-teal-400">X</span>
                    </span>
                </button>

                {/* Main copy */}
                <div className="space-y-8 relative z-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            <span className="text-teal-400 text-xs font-semibold uppercase tracking-widest">
                                Web3 Digital Chit Fund
                            </span>
                        </div>
                        <h1 className="text-5xl font-black text-white leading-tight">
                            Save together,<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                                grow faster.
                            </span>
                        </h1>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                            Connect your wallet to join India's smartest trust-scored blockchain chit fund platform.
                        </p>
                    </div>

                    {/* Feature pills */}
                    <div className="flex flex-col gap-3">
                        {features.map(({ icon: Icon, label, color }) => (
                            <div key={label} className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                                    <Icon size={16} />
                                </div>
                                <span className="text-slate-300 font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right Panel (Auth) ── */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                            <span className="text-white font-black">C</span>
                        </div>
                        <span className="text-xl font-black text-white">Chit<span className="text-teal-400">X</span></span>
                    </button>

                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-8 shadow-2xl shadow-black/30 text-center"
                        >
                            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-10 h-10" />
                            </div>

                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-slate-800">
                                    Authenticate
                                </h2>
                                <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                                    Connect your MetaMask wallet to login or create a new ChitX account.
                                </p>
                            </div>

                            {/* Error / Success */}
                            {error && (
                                <div className="mb-6 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm font-medium text-left">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl p-3 text-sm font-medium flex items-center gap-2 text-left">
                                    <CheckCircle2 size={16} />
                                    {success}
                                </div>
                            )}

                            <button
                                onClick={handleConnectMetaMask}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 
                                    text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest
                                    transition-all duration-200 flex items-center justify-center gap-2
                                    disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25
                                    active:scale-[0.98]"
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Authenticating...</>
                                ) : (
                                    <><Wallet size={18} /> Connect MetaMask</>
                                )}
                            </button>
                            
                            <p className="text-xs text-slate-400 mt-6 leading-relaxed">
                                By connecting, you agree to our{' '}
                                <span className="text-slate-600 font-bold cursor-pointer hover:underline">Terms of Service</span>
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Back to home */}
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors mx-auto"
                    >
                        <ChevronLeft size={16} />
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}
