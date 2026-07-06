import React, { useState } from 'react';
import { Building2, CreditCard, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function BankVerification({ onComplete }) {
    const [form, setForm] = useState({ accountNumber: '', ifsc: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const token = localStorage.getItem('chitx_token');
    const headers = { Authorization: `Bearer ${token}` };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: name === 'ifsc' ? value.toUpperCase() : value }));
        setError('');
    };

    const handleVerify = async () => {
        if (!form.accountNumber || form.accountNumber.length < 9) {
            setError('Enter a valid account number (9-18 digits).');
            return;
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) {
            setError('Invalid IFSC code. Format: HDFC0001234');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/kyc/verify-bank`, form, { headers });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Bank verification failed.');
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
                    <h3 className="text-xl font-black text-slate-800">Bank Verified!</h3>
                    <p className="text-slate-500 text-sm mt-1">Account verified via penny drop.</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                    {[
                        ['Account Holder', result.accountHolderName],
                        ['Bank Name', result.bankName],
                        ['Account Number', result.accountMasked],
                        ['Account Status', result.accountStatus],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">{label}</span>
                            <span className="font-bold text-slate-800 text-sm">{value}</span>
                        </div>
                    ))}
                    {result.nameMatchStatus === 'matched' && (
                        <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-emerald-600 text-sm font-bold">
                            <CheckCircle2 size={14} /> Name matches PAN record
                        </div>
                    )}
                    {result.nameMatchStatus === 'mismatch' && (
                        <div className="pt-2 border-t border-slate-200 text-amber-600 text-sm font-bold">
                            ⚠ Name mismatch — may require manual review
                        </div>
                    )}
                </div>

                <button
                    onClick={() => onComplete({ bankVerified: true })}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm 
                        uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
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
                    <Building2 size={28} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Bank Account Verification</h3>
                <p className="text-slate-500 text-sm mt-1">
                    We'll verify ownership via a ₹1 penny drop to your account.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                        Account Number
                    </label>
                    <div className="relative">
                        <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            name="accountNumber"
                            type="text"
                            inputMode="numeric"
                            value={form.accountNumber}
                            onChange={handleChange}
                            placeholder="Enter account number"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-slate-800 font-medium text-sm
                                focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                        IFSC Code
                    </label>
                    <div className="relative">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            name="ifsc"
                            type="text"
                            value={form.ifsc}
                            onChange={handleChange}
                            placeholder="HDFC0001234"
                            maxLength={11}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-slate-800 
                                font-mono font-bold text-sm uppercase tracking-wider
                                focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Format: 4 letters + 0 + 6 alphanumeric (e.g. HDFC0001234)</p>
                </div>
            </div>

            {/* Dev hint */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <p className="text-amber-700 text-xs font-bold">🧑‍💻 Dev Mode: Use any valid format</p>
                <p className="text-amber-600 text-xs">e.g. Account: 123456789, IFSC: HDFC0001234</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm font-medium">{error}</div>
            )}

            <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm 
                    uppercase tracking-widest flex items-center justify-center gap-2 
                    disabled:opacity-60 shadow-lg shadow-teal-500/20"
            >
                {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                ) : (
                    <><ShieldCheck size={16} /> Verify Account</>
                )}
            </button>
        </div>
    );
}
