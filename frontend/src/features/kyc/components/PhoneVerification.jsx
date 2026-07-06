import React, { useState } from 'react';
import { Phone, MessageSquare, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function PhoneVerification({ user, onComplete }) {
    const [phone, setPhone] = useState(user?.phone || '');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [devOtp, setDevOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem('chitx_token');
    const headers = { Authorization: `Bearer ${token}` };

    const handleSendOTP = async () => {
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            setError('Enter a valid 10-digit mobile number.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/kyc/send-otp`, { phone }, { headers });
            setOtpSent(true);
            setSuccess(res.data.message);
            if (res.data.devOtp) setDevOtp(res.data.devOtp);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            setError('Enter the 6-digit OTP.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await axios.post(`${API}/kyc/verify-otp`, { phone, otp }, { headers });
            onComplete({ phoneVerified: true, phone });
        } catch (err) {
            setError(err.response?.data?.error || 'OTP verification failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Phone size={28} className="text-teal-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Verify Your Phone</h3>
                <p className="text-slate-500 text-sm mt-1">
                    We'll send a 6-digit OTP to confirm your mobile number.
                </p>
            </div>

            {/* Phone input */}
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Mobile Number
                </label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">+91</span>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => { setPhone(e.target.value); setError(''); }}
                            placeholder="9876543210"
                            disabled={otpSent}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-14 pr-4 text-slate-800 font-medium text-sm 
                                focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:opacity-60"
                        />
                    </div>
                    {!otpSent ? (
                        <button
                            onClick={handleSendOTP}
                            disabled={loading}
                            className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-3.5 rounded-xl font-bold text-sm 
                                transition-all flex items-center gap-2 disabled:opacity-60 whitespace-nowrap"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send OTP'}
                        </button>
                    ) : (
                        <button
                            onClick={() => { setOtpSent(false); setOtp(''); setSuccess(''); }}
                            className="text-slate-500 hover:text-teal-600 px-4 py-3.5 rounded-xl border border-slate-200 font-bold text-sm 
                                transition-all flex items-center gap-1"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* OTP input */}
            {otpSent && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                            Enter OTP
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-slate-800 font-mono font-bold text-lg 
                                    tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                            />
                        </div>
                    </div>
                    {/* Dev hint */}
                    {devOtp && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                            <span className="text-amber-600 text-xs font-bold">🧑‍💻 DEV OTP:</span>
                            <button
                                onClick={() => setOtp(devOtp)}
                                className="text-amber-700 font-mono font-black text-sm hover:underline"
                            >
                                {devOtp}
                            </button>
                            <span className="text-amber-500 text-xs">(click to fill)</span>
                        </div>
                    )}
                    <button
                        onClick={handleVerifyOTP}
                        disabled={loading || otp.length !== 6}
                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm 
                            uppercase tracking-widest transition-all flex items-center justify-center gap-2 
                            disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
                    >
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <><CheckCircle2 size={16} /> Verify OTP</>
                        )}
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm font-medium">{error}</div>
            )}
            {success && !otpSent && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl p-3 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 size={16} />{success}
                </div>
            )}
        </div>
    );
}
