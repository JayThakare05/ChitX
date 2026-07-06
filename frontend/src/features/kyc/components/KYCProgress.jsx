import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const STEPS = [
    { id: 1, label: 'Phone' },
    { id: 2, label: 'PAN' },
    { id: 3, label: 'Aadhaar' },
    { id: 4, label: 'Face' },
    { id: 5, label: 'Bank' },
    { id: 6, label: 'Statement' },
];

/**
 * KYCProgress — Animated progress bar with step indicators
 * @param {number} currentStep - Active step (1-6)
 * @param {number} completedStep - Last fully completed step
 */
export default function KYCProgress({ currentStep, completedStep }) {
    const progressPercent = Math.min(100, ((completedStep) / STEPS.length) * 100);

    return (
        <div className="space-y-4">
            {/* Progress bar */}
            <div className="relative">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400 font-medium">KYC Progress</span>
                    <span className="text-xs text-teal-600 font-bold">{Math.round(progressPercent)}%</span>
                </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-1">
                {STEPS.map((step, idx) => {
                    const isDone = completedStep >= step.id;
                    const isActive = currentStep === step.id;
                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                        isDone
                                            ? 'bg-teal-500 text-white shadow-md shadow-teal-200'
                                            : isActive
                                            ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-500 ring-offset-1'
                                            : 'bg-slate-100 text-slate-400'
                                    }`}
                                >
                                    {isDone ? <CheckCircle2 size={14} /> : step.id}
                                </div>
                                <span className={`text-[10px] font-semibold hidden sm:block ${
                                    isDone ? 'text-teal-600' : isActive ? 'text-slate-700' : 'text-slate-400'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={`h-0.5 flex-1 rounded transition-all duration-500 ${
                                    completedStep > step.id ? 'bg-teal-400' : 'bg-slate-200'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
