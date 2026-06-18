const mongoose = require('mongoose');

const memberContributionSchema = new mongoose.Schema({
    walletAddress: { type: String, required: true },
    monthlyContribution: { type: Number, default: 0 }, // Individual contribution
    targetAmount: { type: Number, default: 0 }, // Target jackpot amount for this member
    fixedDeposit: { type: Number, default: 0 },
    monthlyPayments: { type: Number, default: 0 }, // count of payments made
    totalContributed: { type: Number, default: 0 },
    trustScoreAtJoin: { type: Number, default: 0 },
    priorityScore: { type: Number, default: 0 }, // Filled via AI simulation
    hasBeenPaid: { type: Boolean, default: false }, // Cycle flag
    payoutMonth: { type: Number, default: 0 }, // Which simulation month they won
    emergencyFlag: { type: Boolean, default: false }, // Emergency payout flag
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const poolSchema = new mongoose.Schema({
    monthlyPay: { type: Number, required: true }, // Base config metric (0 for fully dynamic)
    totalAmount: { type: Number, required: false },
    members: { type: Number, required: false }, // Null/undefined = dynamic membership
    status: { type: String, default: 'OPEN' }, // OPEN, BIFURCATING, ACTIVE, CLOSED, EXPIRED

    creatorWallet: { type: String, required: false },

    // ── Pool Type Configuration ───────────────────────────────────────────────
    // RANDOM  → winner each cycle picked by random lottery
    // PRIORITY → winner picked by AI priority score (max 2 such pools per user)
    poolType: { type: String, enum: ['RANDOM', 'PRIORITY'], default: 'PRIORITY' },

    // FIXED   → all members pay the same monthlyPay
    // DYNAMIC → each member sets their own contribution at join time
    contributionStyle: { type: String, enum: ['FIXED', 'DYNAMIC'], default: 'FIXED' },

    // FIXED   → set member cap; closes when full or joinDeadline passes
    // DYNAMIC → no hard cap; needs minMembersForDynamic to start
    membershipType: { type: String, enum: ['FIXED', 'DYNAMIC'], default: 'FIXED' },

    // Minimum members required to auto-start a DYNAMIC membership pool
    minMembersForDynamic: { type: Number, default: 3 },

    // ── Lifecycle Timestamps ──────────────────────────────────────────────────
    // Deadline for members to join (15 days from creation)
    joinDeadline: { type: Date },
    // When the pool became fully active (cycle clock starts)
    cycleStartedAt: { type: Date },
    // When the next scheduled payout should fire
    nextPayoutAt: { type: Date },

    // ── Dynamic / Simulation fields ───────────────────────────────────────────
    isDynamic: { type: Boolean, default: false },
    currentBalance: { type: Number, default: 0 },
    totalMonthlyCollection: { type: Number, default: 0 },
    simulationMonth: { type: Number, default: 0 }, // Counter
    cycleLimit: { type: Number, default: 1 }, // E.g. runs twice if split was 16 / 8

    joinedMembers: [{ type: String }],
    contributions: [memberContributionSchema],
    poolTreasury: { type: Number, default: 0 }, // total CTX held by this pool
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pool', poolSchema);
