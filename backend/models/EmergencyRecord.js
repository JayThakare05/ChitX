const mongoose = require('mongoose');

const EmergencyRecordSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    poolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pool',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    documentUrl: {
        type: String, // Relative path to the file
        required: true
    },
    aiResult: {
        approved: { type: Boolean, default: false },
        reason: String,
        category: String,
        confidence: Number
    },
    status: {
        type: String,
        enum: ['APPROVED', 'REJECTED', 'PENDING', 'PENDING_VOTE'],
        default: 'PENDING'
    },
    votes: [{
        walletAddress: { type: String, required: true },
        vote: { type: String, enum: ['YES', 'NO'], required: true },
        votedAt: { type: Date, default: Date.now }
    }],
    resolvedAt: {
        type: Date
    },
    priorityScoreAtRequest: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('EmergencyRecord', EmergencyRecordSchema);
