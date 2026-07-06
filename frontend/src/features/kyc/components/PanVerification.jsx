import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function PanVerification({ onComplete }) {
    const [pan, setPan] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const token = localStorage.getItem('chitx_token');
    const headers = { Authorization: `Bearer ${token}` };

    const handleVerify = async () => {
        const normalized = pan.toUpperCase().trim();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalized)) {
            setError('Invalid PAN format. Example: ABCDE1234F');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/kyc/verify-pan`, { panNumber: normalized }, { headers });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'PAN verification failed.');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck size={28} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">PAN Verified!</h3>
                    <p className="text-slate-500 text-sm mt-1">Your PAN has been successfully verified.</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                    {[
                        ['PAN Number', result.maskedPAN],
                        ['Name on PAN', result.panHolderName],
                        ['PAN Status', result.panStatus],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">{label}</span>
                            <span className="font-bold text-slate-800 text-sm">{value}</span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => onComplete({ panVerified: true, panName: result.panHolderName })}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm 
                        uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                >
                    <CheckCircle2 size={16} /> Continue
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={28} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800">PAN Verification</h3>
                <p className="text-slate-500 text-sm mt-1">
                    Enter your PAN card number for identity verification.
                </p>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    PAN Number
                </label>
                <div className="relative">
                    <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={pan}
                        onChange={e => { setPan(e.target.value.toUpperCase()); setError(''); }}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-slate-800 
                            font-mono font-bold text-base tracking-widest uppercase
                            focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                </div>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)</p>
            </div>

            {/* Dev hint */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-amber-700 text-xs font-bold">🧑‍💻 Dev Mode: Any valid format PAN works (e.g. ABCDE1234F)</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm font-medium">{error}</div>
            )}

            <button
                onClick={handleVerify}
                disabled={loading || pan.length !== 10}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm 
                    uppercase tracking-widest transition-all flex items-center justify-center gap-2 
                    disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
            >
                {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                ) : (
                    <><ShieldCheck size={16} /> Verify PAN</>
                )}
            </button>
        </div>
    );
}
