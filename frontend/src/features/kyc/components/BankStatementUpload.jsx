import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Loader2, TrendingUp, SkipForward, X } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function BankStatementUpload({ onComplete, onSkip }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const token = localStorage.getItem('chitx_token');
    const headers = { Authorization: `Bearer ${token}` };

    const handleFile = (f) => {
        if (!f) return;
        if (!['text/csv', 'application/pdf'].includes(f.type) && !f.name.endsWith('.csv')) {
            setError('Only CSV or PDF files are supported.');
            return;
        }
        setFile(f);
        setError('');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('statement', file);
            const res = await axios.post(`${API}/kyc/upload-statement`, formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        try {
            await axios.post(`${API}/kyc/skip-statement`, {}, { headers });
        } catch (err) { /* non-fatal */ }
        onSkip();
    };

    if (result) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <TrendingUp size={28} className="text-violet-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">Statement Analyzed!</h3>
                    <p className="text-slate-500 text-sm mt-1">AI Trust Score will include bank statement data.</p>
                </div>

                <div className="bg-gradient-to-br from-violet-50 to-teal-50 rounded-2xl p-5 space-y-3 border border-violet-100">
                    {[
                        ['Monthly Income', `₹${(result.income || 0).toLocaleString('en-IN')}`],
                        ['Monthly Expenses', `₹${(result.expenses || 0).toLocaleString('en-IN')}`],
                        ['Preliminary Score', `${result.trustScore || '—'}`],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">{label}</span>
                            <span className="font-black text-slate-800">{value}</span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => onComplete({ bankStatementUploaded: true })}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm 
                        uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                >
                    <CheckCircle2 size={16} /> Continue to Finalization
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UploadCloud size={28} className="text-violet-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Bank Statement</h3>
                <p className="text-slate-500 text-sm mt-1">
                    Upload your last 3-month statement to get an <span className="text-violet-600 font-bold">Advanced AI Trust Score</span>.
                    This step is optional.
                </p>
            </div>

            {/* Upload area */}
            <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
                    dragOver
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/50'
                }`}
            >
                {file ? (
                    <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-3">
                            <FileText size={24} className="text-violet-500" />
                            <div className="text-left">
                                <p className="font-bold text-slate-800 text-sm">{file.name}</p>
                                <p className="text-slate-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <>
                        <UploadCloud size={40} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium text-sm mb-1">Drag & drop or click to upload</p>
                        <p className="text-slate-400 text-xs">Supports CSV, PDF • Max 5MB</p>
                        <input
                            type="file"
                            accept=".csv,.pdf"
                            onChange={e => handleFile(e.target.files[0])}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </>
                )}
            </div>

            {/* What we extract */}
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-2">
                <p className="text-xs font-bold text-slate-500 col-span-2 mb-1 uppercase tracking-widest">What we analyze:</p>
                {['Income patterns', 'Spending stability', 'Savings ratio', 'Payment timeliness', 'Avg. balance', 'Salary consistency'].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-teal-500" />
                        <span className="text-xs text-slate-600">{item}</span>
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm font-medium">{error}</div>
            )}

            <div className="flex gap-3">
                <button
                    onClick={handleSkip}
                    className="flex-1 border-2 border-slate-200 text-slate-500 hover:border-slate-300 py-3.5 rounded-xl font-bold text-sm 
                        uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                    <SkipForward size={16} /> Skip for Now
                </button>
                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3.5 rounded-xl font-black text-sm 
                        uppercase tracking-widest flex items-center justify-center gap-2 
                        disabled:opacity-60 shadow-lg shadow-violet-500/20"
                >
                    {loading ? (
                        <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
                    ) : (
                        <><UploadCloud size={16} /> Upload & Analyze</>
                    )}
                </button>
            </div>
        </div>
    );
}
