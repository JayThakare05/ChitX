import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

import KYCProgress from '../features/kyc/components/KYCProgress';
import PhoneVerification from '../features/kyc/components/PhoneVerification';
import PanVerification from '../features/kyc/components/PanVerification';
import AadhaarVerification from '../features/kyc/components/AadhaarVerification';
import SelfieVerification from '../features/kyc/components/SelfieVerification';
import BankVerification from '../features/kyc/components/BankVerification';
import BankStatementUpload from '../features/kyc/components/BankStatementUpload';
import WalletCreatedSuccess from '../features/kyc/components/WalletCreatedSuccess';

const API = 'http://localhost:5000/api';

const STEP_LABELS = [
    'Phone OTP',
    'PAN Verification',
    'Aadhaar eKYC',
    'Live Selfie',
    'Bank Account',
    'Bank Statement',
    'Complete',
];

export default function KYCWizard() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1); // 1-6 KYC, 7 = success
    const [completedStep, setCompletedStep] = useState(0);
    const [finalizeData, setFinalizeData] = useState(null);
    const [finalizing, setFinalizing] = useState(false);
    const [finalizeError, setFinalizeError] = useState('');
    const [direction, setDirection] = useState(1);

    const token = localStorage.getItem('chitx_token');
    const headers = { Authorization: `Bearer ${token}` };
    const userData = JSON.parse(localStorage.getItem('chitx_user') || '{}');

    // If already KYC verified, go to dashboard
    useEffect(() => {
        if (userData.kycStatus === 'verified') {
            navigate('/dashboard');
            return;
        }
        // Resume from last saved step
        if (userData.kycStep && userData.kycStep > 0) {
            const resumeStep = userData.kycStep + 1;
            if (resumeStep <= 6) {
                setCurrentStep(resumeStep);
                setCompletedStep(userData.kycStep);
            }
        }
    }, []);

    const handleStepComplete = async (stepData = {}) => {
        const newCompleted = currentStep;
        setCompletedStep(newCompleted);

        // If all 6 KYC steps done, finalize
        if (currentStep === 6 || (stepData.skip && currentStep === 6)) {
            await finalizeKYC();
        } else {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleSkipStatement = async () => {
        setCompletedStep(6);
        await finalizeKYC();
    };

    const finalizeKYC = async () => {
        setFinalizing(true);
        setFinalizeError('');
        try {
            const res = await axios.post(`${API}/kyc/finalize`, {}, { headers });
            const { walletAddress, trustScore, tokensIssued, kycStatus, kycConfidence } = res.data;

            // Update localStorage
            const updatedUser = {
                ...userData,
                walletAddress,
                walletCreated: true,
                trustScore,
                airdropAmount: tokensIssued,
                tokensIssued,
                kycStatus,
                kycConfidence,
                kycStep: 6,
            };
            localStorage.setItem('chitx_user', JSON.stringify(updatedUser));

            setFinalizeData({ walletAddress, trustScore, tokensIssued, kycStatus, kycConfidence });
            setCurrentStep(7); // success step
        } catch (err) {
            setFinalizeError(err.response?.data?.error || 'KYC finalization failed. Please try again.');
        } finally {
            setFinalizing(false);
        }
    };

    const handleGoToDashboard = () => navigate('/dashboard');

    const slideVariants = {
        enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0, scale: 0.97 }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0, scale: 0.97 }),
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <PhoneVerification user={userData} onComplete={handleStepComplete} />;
            case 2: return <PanVerification onComplete={handleStepComplete} />;
            case 3: return <AadhaarVerification onComplete={handleStepComplete} />;
            case 4: return <SelfieVerification onComplete={handleStepComplete} />;
            case 5: return <BankVerification onComplete={handleStepComplete} />;
            case 6: return <BankStatementUpload onComplete={handleStepComplete} onSkip={handleSkipStatement} />;
            case 7: return <WalletCreatedSuccess data={finalizeData} onGoToDashboard={handleGoToDashboard} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
                >
                    <ChevronLeft size={18} /> Back to Dashboard
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                        <span className="text-white font-black text-xs">C</span>
                    </div>
                    <span className="font-black text-slate-800 text-lg">Chit<span className="text-teal-600">X</span> KYC</span>
                </div>
                <div className="text-xs font-bold text-slate-400">
                    {currentStep < 7 ? `Step ${currentStep} of 6` : 'Complete'}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-start justify-center p-6 pt-8">
                <div className="w-full max-w-lg space-y-6">
                    {/* Progress bar */}
                    {currentStep < 7 && (
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <KYCProgress currentStep={currentStep} completedStep={completedStep} />
                        </div>
                    )}

                    {/* Step title */}
                    {currentStep < 7 && (
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">
                                {STEP_LABELS[currentStep - 1]}
                            </h2>
                            <p className="text-slate-500 text-sm mt-0.5">
                                Complete each step to unlock your ChitX wallet and full access.
                            </p>
                        </div>
                    )}

                    {/* Finalizing overlay */}
                    {finalizing && (
                        <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center space-y-4">
                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
                                <Loader2 size={32} className="text-teal-600 animate-spin" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800">Creating Your Wallet...</h3>
                            <p className="text-slate-500 text-sm">
                                Generating your Ethereum wallet, calculating trust score, and allocating CTX tokens.
                            </p>
                            <div className="space-y-2 text-left max-w-xs mx-auto">
                                {['Calculating KYC confidence score...', 'Generating AI Trust Score...', 'Creating Ethereum wallet...', 'Allocating CTX tokens...'].map((msg, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                                        {msg}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Finalize error */}
                    {finalizeError && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-700 font-bold text-sm">Finalization Failed</p>
                                <p className="text-red-600 text-sm mt-0.5">{finalizeError}</p>
                                <button
                                    onClick={finalizeKYC}
                                    className="mt-2 text-red-600 font-bold text-xs underline hover:no-underline"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step content */}
                    {!finalizing && (
                        <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
                            <AnimatePresence custom={direction} mode="wait">
                                <motion.div
                                    key={currentStep}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                >
                                    {renderStep()}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Security badge */}
                    {currentStep < 7 && (
                        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                            <span>🔒</span>
                            <span>Your data is encrypted with AES-256. Sensitive fields are never stored in plaintext.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
