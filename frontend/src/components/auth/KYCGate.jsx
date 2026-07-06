import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';

/**
 * KYCGate — Wraps a feature component.
 * If user has not completed KYC (kycStatus !== 'verified'),
 * renders a blurred lock overlay instead of the feature.
 */
export default function KYCGate({ children, featureName = 'this feature' }) {
    const navigate = useNavigate();
    const userData = JSON.parse(localStorage.getItem('chitx_user') || '{}');
    const isVerified = userData.kycStatus === 'verified';

    if (isVerified) return children;

    return (
        <div className="relative rounded-2xl overflow-hidden">
            {/* Blurred preview */}
            <div className="select-none pointer-events-none opacity-30 blur-[2px]" aria-hidden>
                {children}
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Lock size={24} className="text-slate-400" />
                </div>
                <h4 className="font-black text-slate-800 text-base mb-1">KYC Required</h4>
                <p className="text-slate-500 text-sm mb-5 max-w-xs">
                    Complete identity verification to unlock{' '}
                    <span className="font-bold text-slate-700">{featureName}</span>.
                </p>
                <button
                    onClick={() => navigate('/kyc')}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-black text-sm 
                        uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-teal-500/25 
                        hover:from-teal-600 hover:to-emerald-600 transition-all"
                >
                    <ShieldCheck size={16} /> Complete KYC <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}
