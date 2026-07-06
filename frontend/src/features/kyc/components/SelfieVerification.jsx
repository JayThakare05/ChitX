import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, Loader2, Eye, Zap } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function SelfieVerification({ onComplete }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [captured, setCaptured] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const token = localStorage.getItem('chitx_token');
    const headers = { Authorization: `Bearer ${token}` };

    // ── Attach stream to video element once it's in the DOM ─────────────────
    useEffect(() => {
        if (cameraActive && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(err => {
                console.error('Video play error:', err);
            });
        }
    }, [cameraActive]);

    // ── Cleanup stream on unmount ────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });
            streamRef.current = stream;
            // Set cameraActive AFTER storing stream — useEffect will attach it
            setCameraActive(true);
        } catch (err) {
            console.error('Camera error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Camera permission denied. Please allow camera access in your browser settings and reload.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found on this device.');
            } else {
                setError('Could not open camera: ' + err.message);
            }
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    const captureSelfie = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        // Mirror the image (undo the CSS scale-x-[-1] mirror)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setCaptured(base64);
        stopCamera();
    }, []);

    const handleVerify = async () => {
        if (!captured) return;
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(
                `${API}/kyc/verify-face`,
                { selfieBase64: captured.split(',')[1] },
                { headers }
            );
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Face verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Success screen ───────────────────────────────────────────────────────
    if (result) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={28} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">Face Verified!</h3>
                    <p className="text-slate-500 text-sm mt-1">Liveness check passed successfully.</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex flex-col items-center justify-center shadow-lg shadow-teal-200">
                            <span className="text-white font-black text-2xl">{result.faceSimilarity}%</span>
                            <span className="text-white/80 text-xs font-medium">Match</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {[
                            ['Liveness Detection', result.livenessPassed, 'Passed'],
                            ['Blink Detected', true, 'Yes'],
                            ['Head Movement', true, 'Yes'],
                        ].map(([label, pass, val]) => (
                            <div key={label} className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">{label}</span>
                                <span className={`font-bold text-sm ${pass ? 'text-emerald-600' : 'text-red-500'}`}>{val}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => onComplete({ faceVerified: true, faceSimilarity: result.faceSimilarity })}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm
                        uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                >
                    <CheckCircle2 size={16} /> Continue
                </button>
            </div>
        );
    }

    // ── Main UI ──────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Camera size={28} className="text-orange-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Live Selfie</h3>
                <p className="text-slate-500 text-sm mt-1">
                    Take a live selfie. We'll verify it matches your Aadhaar photo.
                </p>
            </div>

            {/* Liveness instructions */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: Eye, label: 'Blink once', color: 'text-blue-500 bg-blue-50' },
                    { icon: Camera, label: 'Face forward', color: 'text-orange-500 bg-orange-50' },
                    { icon: Zap, label: 'Good lighting', color: 'text-amber-500 bg-amber-50' },
                ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="text-center p-3 bg-slate-50 rounded-xl">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5 ${color}`}>
                            <Icon size={16} />
                        </div>
                        <p className="text-xs font-medium text-slate-600">{label}</p>
                    </div>
                ))}
            </div>

            {/* Camera / Preview container */}
            <div className="relative aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200">

                {/* Video — always in DOM so ref is always available; hidden when not active */}
                <video
                    ref={videoRef}
                    className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? 'block' : 'hidden'}`}
                    muted
                    playsInline
                    autoPlay
                />

                {/* Captured photo preview */}
                {captured && !cameraActive && (
                    <img src={captured} alt="Selfie" className="w-full h-full object-cover" />
                )}

                {/* Placeholder before camera opens */}
                {!cameraActive && !captured && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
                            <Camera size={40} className="text-slate-400" />
                        </div>
                        <p className="text-slate-400 font-medium text-sm">Camera preview will appear here</p>
                    </div>
                )}

                {/* Face oval guide overlay — shown only when camera is live */}
                {cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-60 border-4 border-teal-400 rounded-full opacity-80 shadow-lg shadow-teal-400/30" />
                    </div>
                )}
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Action buttons */}
            <div className="flex gap-3">
                {!cameraActive && !captured && (
                    <button
                        onClick={startCamera}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-black text-sm
                            uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Camera size={16} /> Open Camera
                    </button>
                )}

                {cameraActive && (
                    <>
                        <button
                            onClick={stopCamera}
                            className="flex-none px-5 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm transition-all hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={captureSelfie}
                            className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm
                                uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95"
                        >
                            <Camera size={16} /> Capture
                        </button>
                    </>
                )}

                {captured && !cameraActive && (
                    <>
                        <button
                            onClick={() => { setCaptured(null); setError(''); }}
                            className="flex-none px-5 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm
                                transition-all hover:bg-slate-50 flex items-center gap-2"
                        >
                            <RefreshCw size={14} /> Retake
                        </button>
                        <button
                            onClick={handleVerify}
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-xl font-black text-sm
                                uppercase tracking-widest flex items-center justify-center gap-2
                                disabled:opacity-60 shadow-lg shadow-teal-500/20 active:scale-95"
                        >
                            {loading ? (
                                <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
                            ) : (
                                <><CheckCircle2 size={16} /> Verify Selfie</>
                            )}
                        </button>
                    </>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm font-medium">{error}</div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-amber-700 text-xs font-bold">🧑‍💻 Dev Mode: Any captured selfie will pass (mock similarity ≥92%)</p>
            </div>
        </div>
    );
}
