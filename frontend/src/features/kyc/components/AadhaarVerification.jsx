import React, { useState } from 'react';
import { Fingerprint, MessageSquare, CheckCircle2, Loader2, ShieldCheck, MapPin } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function AadhaarVerification({ onComplete }) {
    const [aadhaar, setAadhaar] = useState('');
    const [otp, setOtp] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [devHint] = useState('Use OTP: 123456');

    const token = localStorage.getItem('chitx_token');
    const headers = { Authorization: `Bearer ${token}` };

    const formatAadhaar = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 12);
        return digits.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3').trim();
    };

    const handleSendOTP = async () => {
        const clean = aadhaar.replace(/\s/g, '');
        if (clean.length !== 12) {
            setError('Enter a valid 12-digit Aadhaar number.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/kyc/initiate-aadhaar-otp`, { aadhaarNumber: clean }, { headers });
            setTransactionId(res.data.transactionId);
            setOtpSent(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send Aadhaar OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setError('Enter the 6-digit OTP.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/kyc/verify-aadhaar`, {
                aadhaarNumber: aadhaar.replace(/\s/g, ''),
                otp,
                transactionId,
            }, { headers });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Aadhaar verification failed.');
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
                    <h3 className="text-xl font-black text-slate-800">Aadhaar Verified!</h3>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-5">
                    {result.aadhaarPhoto ? (
                        <img src={result.aadhaarPhoto} alt="Aadhaar" className="w-16 h-16 rounded-xl object-cover border-2 border-teal-100" />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-teal-100 flex items-center justify-center">
                            <Fingerprint size={28} className="text-teal-600" />
                        </div>
                    )}
                    <div>
                        <p className="font-black text-slate-800">{result.aadhaarName}</p>
                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                            <MapPin size={10} /> {result.aadhaarAddress?.slice(0, 60)}...
                        </p>
                        {result.nameMatchStatus === 'matched' && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold mt-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={10} /> Name matches PAN
                            </span>
                        )}
                        {result.nameMatchStatus === 'mismatch' && (
                            <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                                ⚠ Name mismatch — Manual review
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => onComplete({ aadhaarVerified: true, aadhaarName: result.aadhaarName })}
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
                <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Fingerprint size={28} className="text-violet-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Aadhaar eKYC</h3>
                <p className="text-slate-500 text-sm mt-1">
                    OTP-based verification using your Aadhaar-linked mobile number.
                </p>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Aadhaar Number
                </label>
                <div className="relative">
                    <Fingerprint size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={aadhaar}
                        onChange={e => { setAadhaar(formatAadhaar(e.target.value)); setError(''); }}
                        placeholder="XXXX XXXX XXXX"
                        disabled={otpSent}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 
                            text-slate-800 font-mono font-bold text-base tracking-widest
                            focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:opacity-60"
                    />
                </div>
            </div>

            {!otpSent ? (
                <button
                    onClick={handleSendOTP}
                    disabled={loading || aadhaar.replace(/\s/g, '').length !== 12}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3.5 rounded-xl font-black text-sm 
                        uppercase tracking-widest flex items-center justify-center gap-2 
                        disabled:opacity-60 transition-all"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send Aadhaar OTP'}
                </button>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                            Enter OTP (sent to Aadhaar-linked number)
                        </label>
                        <div className="relative">
                            <MessageSquare size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otp}
                                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                                placeholder="123456"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 
                                    text-slate-800 font-mono font-bold text-xl tracking-[0.4em]
                                    focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                            />
                        </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-amber-700 text-xs font-bold">🧑‍💻 Dev Mode: {devHint}</p>
                    </div>
                    <button
                        onClick={handleVerify}
                        disabled={loading || otp.length !== 6}
                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm 
                            uppercase tracking-widest flex items-center justify-center gap-2 
                            disabled:opacity-60 shadow-lg shadow-teal-500/20"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Verify Aadhaar</>}
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm font-medium">{error}</div>
            )}
        </div>
    );
}
