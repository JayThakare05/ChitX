/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         ChitX Pool Lifecycle Service                                 ║
 * ║                                                                      ║
 * ║  This service runs in the background every 30 seconds and handles:   ║
 * ║  1. Joining window expiry  — closes pool + refunds if not full       ║
 * ║  2. Scheduled payouts      — awards winner every CYCLE_DURATION_MS   ║
 * ║                                                                      ║
 * ║  ── TIMING CONSTANTS (change these when going live) ────────────── ║
 * ║                                                                      ║
 * ║  CYCLE_DURATION_MS : how long between each payout cycle              ║
 * ║    → Currently: 1 minute  (for TESTING)                              ║
 * ║    → Production: 30 * 24 * 60 * 60 * 1000  (30 days / monthly)      ║
 * ║                                                                      ║
 * ║  JOIN_WINDOW_MS : how long members have to join after pool creation  ║
 * ║    → Currently: 15 days                                              ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const Pool = require('../models/Pool');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { CYCLE_DURATION_MS, JOIN_WINDOW_MS } = require('../config/poolConfig');

// How often the lifecycle engine polls (should be much shorter than CYCLE_DURATION_MS)
const POLL_INTERVAL_MS = 30 * 1000; // Every 30 seconds

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-refund all members of a pool and mark it EXPIRED.
 * Called when a pool's joining window passes without being filled.
 */
async function autoRefundAndExpirePool(pool) {
    console.log(`⏰ [Lifecycle] Pool ${pool._id} joining window expired. Refunding ${pool.contributions?.length || 0} members...`);

    if (pool.contributions && pool.contributions.length > 0) {
        for (const contrib of pool.contributions) {
            try {
                const member = await User.findOne({ walletAddress: contrib.walletAddress });
                if (member && contrib.fixedDeposit > 0) {
                    member.tokensIssued = (member.tokensIssued || 0) + contrib.fixedDeposit;
                    await member.save();

                    await Transaction.create({
                        walletAddress: contrib.walletAddress,
                        type: 'POOL_REFUND',
                        direction: 'CREDIT',
                        amount: contrib.fixedDeposit,
                        poolId: pool._id,
                        description: `Auto-refund: Pool expired (joining window passed without reaching capacity)`,
                        status: 'SUCCESS'
                    });

                    console.log(`💰 [Lifecycle] Refunded ${contrib.fixedDeposit} CTX to ${contrib.walletAddress}`);
                }
            } catch (err) {
                console.error(`[Lifecycle] Refund error for ${contrib.walletAddress}:`, err.message);
            }
        }
    }

    pool.status = 'EXPIRED';
    pool.contributions = [];
    pool.joinedMembers = [];
    pool.poolTreasury = 0;
    await pool.save();
    console.log(`✅ [Lifecycle] Pool ${pool._id} marked EXPIRED. All members refunded.`);
}

/**
 * Pick a winner from unpaid members based on pool type.
 * RANDOM  → random lottery
 * PRIORITY → highest AI priority score (existing logic)
 */
function pickWinner(pool) {
    const unpaid = pool.contributions.filter(c => !c.hasBeenPaid);
    if (unpaid.length === 0) return null;

    if (pool.poolType === 'RANDOM') {
        const randomIdx = Math.floor(Math.random() * unpaid.length);
        return unpaid[randomIdx];
    } else {
        // PRIORITY — sort by score descending, pick top
        const emergencyFirst = unpaid.filter(c => c.emergencyFlag);
        if (emergencyFirst.length > 0) {
            emergencyFirst.sort((a, b) => b.priorityScore - a.priorityScore);
            return emergencyFirst[0];
        }
        unpaid.sort((a, b) => b.priorityScore - a.priorityScore);
        return unpaid[0];
    }
}

/**
 * Execute a payout cycle for an ACTIVE pool.
 */
async function executePayoutCycle(pool) {
    console.log(`🔔 [Lifecycle] Executing payout cycle for pool ${pool._id} (type: ${pool.poolType})`);

    // Add monthly collection to pool balance
    pool.currentBalance = (pool.currentBalance || 0) + (pool.totalMonthlyCollection || 0);
    pool.simulationMonth = (pool.simulationMonth || 0) + 1;

    const winner = pickWinner(pool);
    if (!winner) {
        console.log(`[Lifecycle] Pool ${pool._id}: No eligible winner found (all paid?).`);
        // Reset cycle
        pool.contributions.forEach(c => { c.hasBeenPaid = false; });
        pool.nextPayoutAt = new Date(Date.now() + CYCLE_DURATION_MS);
        await pool.save();
        return;
    }

    let payoutAmount = winner.targetAmount;
    let penaltyAmount = 0;
    let bonusPerMember = 0;

    if (winner.emergencyFlag) {
        penaltyAmount = Math.round(payoutAmount * 0.10 * 100) / 100;
        payoutAmount = payoutAmount - penaltyAmount;

        const remainingUnpaid = pool.contributions.filter(
            c => !c.hasBeenPaid && c.walletAddress !== winner.walletAddress
        );
        if (remainingUnpaid.length > 0) {
            bonusPerMember = Math.round((penaltyAmount / remainingUnpaid.length) * 100) / 100;
            remainingUnpaid.forEach(c => {
                c.targetAmount = Math.round((c.targetAmount + bonusPerMember) * 100) / 100;
            });
        }
    }

    winner.hasBeenPaid = true;
    winner.payoutMonth = pool.simulationMonth;
    pool.currentBalance = Math.max(0, pool.currentBalance - winner.targetAmount);

    // Attempt to credit winner's DB balance
    try {
        const winnerUser = await User.findOne({ walletAddress: winner.walletAddress });
        if (winnerUser) {
            winnerUser.tokensIssued = (winnerUser.tokensIssued || 0) + payoutAmount;
            await winnerUser.save();
        }

        await Transaction.create({
            walletAddress: winner.walletAddress,
            type: 'POOL_PAYOUT',
            direction: 'CREDIT',
            amount: payoutAmount,
            poolId: pool._id,
            description: `${pool.poolType === 'RANDOM' ? '🎲 Random' : '🤖 AI Priority'} Pool payout — Cycle ${pool.simulationMonth}`,
            status: 'SUCCESS'
        });
    } catch (err) {
        console.error(`[Lifecycle] Error crediting winner ${winner.walletAddress}:`, err.message);
    }

    console.log(`🏆 [Lifecycle] Winner: ${winner.walletAddress} — Payout: ${payoutAmount} CTX (Cycle ${pool.simulationMonth})`);

    // Check if cycle complete
    const allPaid = pool.contributions.every(c => c.hasBeenPaid);
    if (allPaid) {
        pool.contributions.forEach(c => { c.hasBeenPaid = false; });
        pool.cycleLimit -= 1;
        if (pool.cycleLimit <= 0) {
            pool.status = 'CLOSED';
            console.log(`🔒 [Lifecycle] Pool ${pool._id} completed all cycles. Closed.`);
        } else {
            console.log(`🔄 [Lifecycle] Pool ${pool._id} cycle reset. Cycles remaining: ${pool.cycleLimit}`);
        }
    }

    // Schedule next payout
    pool.nextPayoutAt = new Date(Date.now() + CYCLE_DURATION_MS);
    await pool.save();
}

/**
 * Activate a pool — set status to ACTIVE, schedule first payout.
 * Shared helper used by joinPool (inline) and lifecycle fallback.
 */
async function activatePool(pool, now = new Date()) {
    if (pool.status === 'ACTIVE') return; // Already active, skip

    pool.status = 'ACTIVE';
    pool.cycleStartedAt = now;
    pool.nextPayoutAt = new Date(now.getTime() + CYCLE_DURATION_MS);
    pool.totalMonthlyCollection = pool.contributions.reduce(
        (acc, c) => acc + (c.monthlyContribution || 0), 0
    );

    // For DYNAMIC contribution pools — calculate proportional target amounts
    if (pool.contributionStyle === 'DYNAMIC') {
        const totalMonthly = pool.totalMonthlyCollection;
        pool.contributions.forEach(c => {
            const share = totalMonthly > 0 ? c.monthlyContribution / totalMonthly : 1 / pool.contributions.length;
            c.targetAmount = Math.round(totalMonthly * share * pool.contributions.length * 100) / 100;
        });
    }

    await pool.save();
    console.log(`✅ [Lifecycle] Pool ${pool._id} ACTIVATED. ${pool.joinedMembers.length} members. First payout at ${pool.nextPayoutAt.toISOString()}`);
}

/**
 * Main lifecycle check — runs every POLL_INTERVAL_MS.
 */
async function runLifecycleCheck() {
    const now = new Date();

    try {
        // ── 1. Check for expired joining windows ─────────────────────────────
        const expiredPools = await Pool.find({
            status: 'OPEN',
            joinDeadline: { $lte: now }
        });

        for (const pool of expiredPools) {
            const currentCount = pool.joinedMembers?.length || 0;
            const targetCount = pool.membershipType === 'DYNAMIC'
                ? (pool.minMembersForDynamic || 3)
                : (pool.members || Infinity);

            if (currentCount < targetCount) {
                // Not enough members — expire and refund
                await autoRefundAndExpirePool(pool);
            } else {
                // Pool is full but deadline just passed — activate it
                await activatePool(pool, now);
            }
        }

        // ── 2. Fallback: activate OPEN pools that are already full ────────────
        // This catches cases where the joinPool auto-activation may have failed
        const openPools = await Pool.find({ status: 'OPEN' });
        for (const pool of openPools) {
            const currentCount = pool.joinedMembers?.length || 0;
            if (currentCount === 0) continue;

            const targetCount = pool.membershipType === 'DYNAMIC'
                ? (pool.minMembersForDynamic || 3)
                : (pool.members || null);

            // For fixed pools: full when member count reached
            // For dynamic pools: full when min members reached
            if (targetCount && currentCount >= targetCount) {
                console.log(`🔧 [Lifecycle] Fallback activation: Pool ${pool._id} is full (${currentCount}/${targetCount}) but still OPEN. Activating...`);
                await activatePool(pool, now);
            }
        }

        // ── 3. Check for due payouts ─────────────────────────────────────────
        const duePools = await Pool.find({
            status: 'ACTIVE',
            nextPayoutAt: { $lte: now }
        });

        for (const pool of duePools) {
            await executePayoutCycle(pool);
        }

    } catch (err) {
        console.error('[Lifecycle] Error during lifecycle check:', err.message);
    }
}

/**
 * Start the lifecycle engine. Call this once from server.js on boot.
 */
function startLifecycleEngine() {
    console.log(`🚀 [Lifecycle] Pool Lifecycle Engine started.`);
    console.log(`   ⏱  Cycle Duration : ${CYCLE_DURATION_MS / 1000}s (${CYCLE_DURATION_MS === 60000 ? 'TESTING MODE — 1 minute' : 'Production'})`);
    console.log(`   📅 Join Window    : ${JOIN_WINDOW_MS / (1000 * 60 * 60 * 24)} days`);
    console.log(`   🔁 Poll Interval  : every ${POLL_INTERVAL_MS / 1000}s`);

    // Run once immediately, then on interval
    runLifecycleCheck();
    setInterval(runLifecycleCheck, POLL_INTERVAL_MS);
}

module.exports = { startLifecycleEngine, activatePool };
