const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'POOL_JOIN',       // User joined a pool (fixed deposit deducted)
            'POOL_LEAVE',      // User left a pool (fixed deposit refunded)
            'POOL_PAYOUT',     // User received their chit fund payout (lifecycle engine)
            'POOL_REFUND',     // Auto-refund when pool expires without filling
            'MONTHLY_PAYMENT', // User made a monthly contribution to their pool
            'CHIT_JACKPOT',    // User won a pool and received the pot
            'REFUND',          // General refund (pool deleted etc.)
            'AIRDROP'          // Initial CTX airdrop on registration
        ]
    },
    amount: {
        type: Number,
        required: true
    },
    direction: {
        type: String,
        enum: ['DEBIT', 'CREDIT'],     // DEBIT = money out, CREDIT = money in
        required: true
    },
    poolId: {
        type: String,
        default: null
    },
    poolMonthlyPay: {
        type: Number,
        default: null
    },
    description: {
        type: String,
        required: true
    },
    txHash: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'PENDING', 'FAILED'],
        default: 'SUCCESS'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
