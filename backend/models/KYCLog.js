const mongoose = require('mongoose');

/**
 * KYCLog — immutable audit trail for every KYC verification event.
 * Each step writes one record; records are never mutated.
 */
const KYCLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    step: {
        type: String,
        enum: ['phone_otp', 'pan', 'aadhaar', 'face', 'bank', 'bank_statement', 'finalize'],
        required: true
    },
    status: {
        type: String,
        enum: ['initiated', 'success', 'failed', 'skipped'],
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress:  { type: String, default: null },
    userAgent:  { type: String, default: null },
    createdAt:  { type: Date,   default: Date.now }
});

// Prevent modification after creation
KYCLogSchema.set('strict', true);

module.exports = mongoose.model('KYCLog', KYCLogSchema);
