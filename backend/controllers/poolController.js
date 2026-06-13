const Pool = require('../models/Pool');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const web3Service = require('../services/web3Service');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const EmergencyRecord = require('../models/EmergencyRecord');

// ── Service URLs (configurable via .env) ─────────────────────────────────────
// Flask ML Prediction server (all_models/server.py) — runs separately on 5050
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://127.0.0.1:5050';
// FastAPI AI Oracle (app/main.py via run.py) — runs separately on 8000
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';


// Create a new pool
exports.createPool = async (req, res) => {
    try {
        const { monthlyPay, members, creatorWallet, status, isCreatorJoining, txHash } = req.body;
        if (!monthlyPay) {
            return res.status(400).json({ error: 'monthlyPay is required' });
        }
        
        let totalAmount = 0;
        if (members) {
            totalAmount = monthlyPay * members;
        }

        const newPool = new Pool({
            monthlyPay,
            totalAmount,
            members,
            status: status || 'OPEN',
            creatorWallet: creatorWallet?.toLowerCase(),
            joinedMembers: isCreatorJoining ? [creatorWallet.toLowerCase()] : [],
            contributions: isCreatorJoining ? [{
                walletAddress: creatorWallet.toLowerCase(),
                monthlyContribution: monthlyPay,
                targetAmount: totalAmount || (monthlyPay * 10), // Default to 10 if dynamic
                hasBeenPaid: false,
                payoutMonth: 0
            }] : []
        });
        
        // If creator is joining, deduct their fixed deposit from DB profile to sync with on-chain payment
        if (isCreatorJoining) {
            const user = await User.findOne({ walletAddress: creatorWallet.toLowerCase() });
            if (user) {
                const fixedDeposit = monthlyPay * 2;
                user.tokensIssued = Math.max(0, user.tokensIssued - fixedDeposit);
                await user.save();
                
                // Log transaction
                const txn = new Transaction({
                    walletAddress: creatorWallet.toLowerCase(),
                    type: 'POOL_JOIN',
                    amount: fixedDeposit,
                    direction: 'DEBIT',
                    description: `Fixed Deposit for joining pool with ${monthlyPay} monthly pay`,
                    poolId: newPool._id,
                    status: 'SUCCESS',
                    txHash: txHash || 'pending'
                });
                await txn.save();
            }
        }

        await newPool.save();
        res.status(201).json({ message: 'Pool created successfully', pool: newPool });
    } catch (error) {
        console.error('Error creating pool:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all pools
exports.getAllPools = async (req, res) => {
    try {
        const pools = await Pool.find().sort({ createdAt: -1 });
        res.status(200).json({ pools });
    } catch (error) {
        console.error('Error fetching pools:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete a pool — ONLY the creator can delete
exports.deletePool = async (req, res) => {
    try {
        const poolId = req.params.id;
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        const pool = await Pool.findById(poolId);
        if (!pool) {
            return res.status(404).json({ error: 'Pool not found' });
        }

        // Creator-only check
        if (pool.creatorWallet !== walletAddress.toLowerCase()) {
            return res.status(403).json({ error: 'Only the pool creator can delete this pool.' });
        }

        // Refund all members their fixed deposits before deleting
        if (pool.contributions && pool.contributions.length > 0) {
            for (const contrib of pool.contributions) {
                const member = await User.findOne({ walletAddress: contrib.walletAddress });
                if (member) {
                    member.tokensIssued += contrib.fixedDeposit;
                    await member.save();
                    console.log(`💰 Refunded ${contrib.fixedDeposit} CTX to ${contrib.walletAddress}`);
                }
            }
        }

        await Pool.findByIdAndDelete(poolId);
        res.status(200).json({ message: 'Pool deleted successfully. All members refunded.' });
    } catch (error) {
        console.error('Error deleting pool:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Join a pool — deducts fixed deposit (2x monthlyPay) from user's CTX balance
exports.joinPool = async (req, res) => {
    try {
        const poolId = req.params.id;
        const { walletAddress } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        const pool = await Pool.findById(poolId);
        if (!pool) return res.status(404).json({ error: 'Pool not found' });

        // Check if already joined
        if (pool.joinedMembers && pool.joinedMembers.includes(walletAddress.toLowerCase())) {
            return res.status(400).json({ error: 'You have already joined this pool' });
        }

        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found in system. Please register.' });
        }

        // ── Eligibility Logic (Synchronized with Frontend) ────────────────────────
        const disposable = user.income - user.expenses;
        const fixedDeposit = pool.monthlyPay * 2;
        const isMicroPool  = pool.monthlyPay >= 5 && pool.monthlyPay <= 10;
        const isLowTrust   = user.trustScore < 50;

        // Check on-chain CTX balance
        let onChainBalance = 0;
        const balanceResult = await web3Service.getBalance(walletAddress);
        onChainBalance = parseFloat(balanceResult.balance) || 0;
        console.log(`💰 On-chain CTX balance for ${walletAddress}: ${onChainBalance}`);

        const incomeOk  = disposable >= pool.monthlyPay;
        const balanceOk = onChainBalance >= fixedDeposit;
        
        // Low trust users can join micro-pools IF balance is OK.
        // For larger pools, low trust is a hard fail.
        const trustOk = user.trustScore >= 50 || (isMicroPool && balanceOk);

        // ── Hard Requirements ───────────────────────────────────────────────────
        if (isLowTrust) {
            if (!isMicroPool) {
                return res.status(403).json({ 
                    error: `Trust score too low (${user.trustScore}/100). Pools above $10 require a minimum trust score of 50.` 
                });
            }
            if (!balanceOk) {
                return res.status(403).json({ 
                    error: `For micro-pools, a sufficient CTX balance (${fixedDeposit} required) is compulsory for low-trust users.` 
                });
            }
        }

        const passedCount = [trustOk, incomeOk, balanceOk].filter(Boolean).length;

        if (passedCount < 2) {
            const reasons = [];
            if (!trustOk)   reasons.push(`Trust score too low (${user.trustScore}/100, min 50)`);
            if (!incomeOk)  reasons.push(`Disposable income ($${disposable}) is less than monthly pay ($${pool.monthlyPay})`);
            if (!balanceOk) reasons.push(`CTX balance (${onChainBalance.toFixed(1)}) is less than required deposit (${fixedDeposit})`);
            
            return res.status(403).json({
                error: `You need at least 2 of 3 eligibility criteria to join. Failed: ${reasons.join('; ')}.`
            });
        }

        // Check if pool is full
        if (pool.members && pool.joinedMembers && pool.joinedMembers.length >= pool.members) {
            return res.status(400).json({ error: 'Pool is full.' });
        }

        // === DEDUCT from DB balance ===
        user.tokensIssued = Math.max(0, (user.tokensIssued || 0) - fixedDeposit);
        await user.save();

        // Add to pool
        if (!pool.joinedMembers) pool.joinedMembers = [];
        pool.joinedMembers.push(walletAddress.toLowerCase());

        if (!pool.contributions) pool.contributions = [];
        pool.contributions.push({
            walletAddress: walletAddress.toLowerCase(),
            fixedDeposit: fixedDeposit,
            monthlyContribution: pool.monthlyPay,
            targetAmount: pool.monthlyPay * pool.members,
            priorityScore: 50, // Default for actual metamask joins, boosted if they trigger emergency
            monthlyPayments: 0,
            hasBeenPaid: false,
            payoutMonth: 0,
            totalContributed: fixedDeposit
        });

        pool.poolTreasury = (pool.poolTreasury || 0) + fixedDeposit;
        await pool.save();

        // ── Record transaction ──────────────────────────────────────
        try {
            await Transaction.create({
                walletAddress: walletAddress.toLowerCase(),
                type: 'POOL_JOIN',
                direction: 'DEBIT',
                amount: fixedDeposit,
                poolId: poolId,
                poolMonthlyPay: pool.monthlyPay,
                description: `Joined pool — ${fixedDeposit} CTX fixed deposit locked`,
                txHash: req.body.txHash || null,
                status: 'SUCCESS'
            });
        } catch (txErr) { console.error('Transaction record error:', txErr.message); }

        // Fetch updated on-chain balance for display
        const updatedBalance = await web3Service.getBalance(walletAddress);
        const displayBalance = parseFloat(updatedBalance.balance) || (onChainBalance - fixedDeposit);

        console.log(`✅ ${walletAddress} joined pool ${poolId}. Fixed deposit: ${fixedDeposit} CTX deducted.`);
        res.status(200).json({ 
            message: `Successfully joined! ${fixedDeposit} CTX fixed deposit deducted.`, 
            pool,
            deducted: fixedDeposit,
            remainingBalance: displayBalance.toFixed(1),
            onChainBalance: displayBalance.toFixed(1)
        });

    } catch (error) {
        console.error('Error joining pool:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Leave a pool — refund fixed deposit ONLY if no monthly payments made yet
exports.leavePool = async (req, res) => {
    try {
        const poolId = req.params.id;
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        const pool = await Pool.findById(poolId);
        if (!pool) return res.status(404).json({ error: 'Pool not found' });

        const wallet = walletAddress.toLowerCase();

        // Check if user is actually in the pool
        if (!pool.joinedMembers || !pool.joinedMembers.includes(wallet)) {
            return res.status(400).json({ error: 'You are not a member of this pool.' });
        }

        // Find their contribution record
        const contrib = pool.contributions ? pool.contributions.find(c => c.walletAddress === wallet) : null;

        if (!contrib) {
            return res.status(400).json({ error: 'No contribution record found.' });
        }

        // Only allow leaving if NO monthly payments made
        if (contrib.monthlyPayments > 0) {
            return res.status(403).json({ 
                error: 'You have already made monthly payments. You cannot leave the pool after the first payment.' 
            });
        }

        // === REFUND FIXED DEPOSIT ===
        const refundAmount = contrib.fixedDeposit;
        
        // 1. On-chain refund from Treasury to User
        try {
            await web3Service.transferTokens(wallet, refundAmount);
        } catch (err) {
            return res.status(500).json({ error: 'On-chain refund failed: ' + err.message });
        }

        // 2. Update Database Balance
        const user = await User.findOne({ walletAddress: wallet });
        
        if (user) {
            user.tokensIssued = (user.tokensIssued || 0) + refundAmount;
            await user.save();
        }

        // Remove from pool
        pool.joinedMembers = pool.joinedMembers.filter(m => m !== wallet);
        pool.contributions = pool.contributions.filter(c => c.walletAddress !== wallet);
        pool.poolTreasury = Math.max(0, (pool.poolTreasury || 0) - refundAmount);

        await pool.save();

        // ── Record transaction ──────────────────────────────────────
        try {
            await Transaction.create({
                walletAddress: wallet,
                type: 'POOL_LEAVE',
                direction: 'CREDIT',
                amount: refundAmount,
                poolId: poolId,
                poolMonthlyPay: pool.monthlyPay,
                description: `Left pool — ${refundAmount} CTX fixed deposit refunded`,
                txHash: null,
                status: 'SUCCESS'
            });
        } catch (txErr) { console.error('Transaction record error:', txErr.message); }

        // Get updated balance
        const updatedBalance = await web3Service.getBalance(wallet);
        const displayBalance = parseFloat(updatedBalance.balance) || (user ? user.tokensIssued : 0);

        console.log(`🔙 ${wallet} left pool ${poolId}. Refunded: ${refundAmount} CTX.`);
        res.status(200).json({ 
            message: `Successfully left the pool. ${refundAmount} CTX refunded.`,
            refunded: refundAmount,
            newBalance: displayBalance.toFixed(1)
        });

    } catch (error) {
        console.error('Error leaving pool:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user's CTX balance (on-chain + DB)
exports.getUserBalance = async (req, res) => {
    try {
        const { walletAddress } = req.params;
        if (!walletAddress) return res.status(400).json({ error: 'Wallet address required' });

        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        const onChain = await web3Service.getBalance(walletAddress);

        res.status(200).json({
            walletAddress,
            onChainBalance: parseFloat(onChain.balance) || 0,
            dbBalance: user ? user.tokensIssued : 0,
            trustScore: user ? user.trustScore : 0
        });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ============================================
// AI Dynamic Simulators & Synthetic Data
// ============================================

exports.initDemoPool = async (req, res) => {
    try {
        const { mode } = req.body; // 'CONSTANT', 'DYNAMIC', or 'EMERGENCY'
        const isDynamic = mode === 'DYNAMIC' || mode === 'EMERGENCY';
        const isEmergencyMode = mode === 'EMERGENCY';

        const MAX_POOL_SIZE = 10;
        
        // Read test users depending on mode
        const filename = isDynamic ? 'chitx_random_users_test.csv' : 'chitx_test_users.csv';
        const csvPath = path.join(__dirname, '../', filename);

        // For emergency mode, randomly pick 2 user indices to flag
        const emergencyIndices = isEmergencyMode
            ? [Math.floor(Math.random() * MAX_POOL_SIZE), Math.floor(Math.random() * MAX_POOL_SIZE)]
                .filter((v, i, a) => a.indexOf(v) === i) // dedupe
            : [];
        
        let csvData;
        try {
            csvData = fs.readFileSync(csvPath, 'utf-8');
        } catch (err) {
            console.error(`Could not read ${filename}`, err);
            return res.status(500).json({ error: `Could not read ${filename} dataset.` });
        }

        const lines = csvData.trim().split('\n');
        const users = lines.slice(1, MAX_POOL_SIZE + 1); // Get up to 10 users

        let initialCollection = 0;
        let poolContributions = [];
        let joinedMembers = [];

        for (let i = 0; i < users.length; i++) {
            const line = users[i].trim();
            if (!line) continue;
            
            const cols = line.split(',');
            // Mapping: user_id,income,expenses,employment,credit_score,avg_balance,salary_consistency,spending_stability,payment_timeliness,defaults,participation_count,contribution_consistency,participation_frequency,contribution_amount,pool_size
            
            const rawContribution = parseFloat(cols[13]);
            
            // If Constant, force to 5. If Dynamic, take the CSV value directly.
            const userMonthlyPay = isDynamic ? rawContribution : 5;
            const userTargetAmount = userMonthlyPay * MAX_POOL_SIZE; // e.g. 5*10=50, or DYNAMIC based

            const payload = {
                income: parseFloat(cols[1]),
                expenses: parseFloat(cols[2]),
                employment: cols[3].trim(),
                credit_score: parseFloat(cols[4]),
                avg_balance: parseFloat(cols[5]),
                salary_consistency: parseFloat(cols[6]),
                spending_stability: parseFloat(cols[7]),
                payment_timeliness: parseFloat(cols[8]),
                defaults: parseFloat(cols[9]),
                participation_count: parseFloat(cols[10]),
                contribution_consistency: parseFloat(cols[11]),
                participation_frequency: parseFloat(cols[12]),
                contribution_amount: userMonthlyPay, 
                pool_size: MAX_POOL_SIZE
            };

            // For emergency mode, flag selected users and call ML with is_emergency
            const isThisUserEmergency = isEmergencyMode && emergencyIndices.includes(i);
            if (isThisUserEmergency) {
                payload.is_emergency = true;
            }

            let pScore = 0;
            // Fetch from Flask ML prediction server (all_models/server.py on port 5050)
            try {
                const mlRes = await axios.post(`${ML_SERVER_URL}/predict`, payload);
                if (mlRes.data && mlRes.data.priority_pct !== undefined) {
                    pScore = mlRes.data.priority_pct;
                } else {
                    throw new Error('Invalid response from ML server');
                }
            } catch (mlErr) {
                console.error(`ML Predict error for ${cols[0]}:`, mlErr.message);
                return res.status(503).json({ error: `AI Prediction Server (all_models/server.py) is offline. Start it with: python all_models/server.py  (runs on port 5050)` });
            }

            const dummyWallet = cols[0]; // e.g., USR001
            
            joinedMembers.push(dummyWallet);
            poolContributions.push({
                walletAddress: dummyWallet,
                monthlyContribution: userMonthlyPay,
                targetAmount: userTargetAmount,
                fixedDeposit: 0, // Ignore for demo
                trustScoreAtJoin: pScore, // legacy
                priorityScore: pScore, 
                hasBeenPaid: false,
                payoutMonth: 0,
                emergencyFlag: isThisUserEmergency
            });

            if (isThisUserEmergency) {
                console.log(`🚨 Emergency flag set for ${dummyWallet} (priority: ${pScore})`);
            }

            initialCollection += userMonthlyPay;
        }

        // Create the pool now that we have accurate sums
        const newPool = new Pool({
            monthlyPay: isDynamic ? 0 : 5, // Display purely for UI config
            totalAmount: poolContributions.reduce((acc, c) => acc + c.targetAmount, 0),
            members: MAX_POOL_SIZE,
            status: 'ACTIVE',
            isDynamic: true,
            currentBalance: 0, 
            totalMonthlyCollection: initialCollection,
            simulationMonth: 0,
            cycleLimit: 1,
            joinedMembers: joinedMembers,
            contributions: poolContributions
        });

        await newPool.save();

        res.status(200).json({
            message: `Successfully initialized ${isEmergencyMode ? 'Emergency Fund' : isDynamic ? 'Dynamic' : 'Constant'} demo pool using ML models.${isEmergencyMode ? ` Emergency flagged for ${emergencyIndices.length} members.` : ''}`,
            pool: newPool
        });

    } catch (e) {
        console.error('Demo pool init error:', e);
        res.status(500).json({ error: 'Failed to initialize demo pool.' });
    }
};

exports.simulateMonth = async (req, res) => {
    try {
        const poolId = req.params.id;
        const pool = await Pool.findById(poolId);
        
        if (!pool) return res.status(404).json({ error: 'Pool not found' });
        
        // Remove strictly dynamic requirement and implicitly upgrade pool logic
        if (!pool.isDynamic) {
            pool.isDynamic = true;
            // Map legacy base pools to dynamic config
            pool.totalMonthlyCollection = pool.contributions ? pool.contributions.reduce((acc, c) => {
                if (!c.monthlyContribution || c.monthlyContribution === 0) c.monthlyContribution = pool.monthlyPay;
                if (!c.targetAmount || c.targetAmount === 0) c.targetAmount = pool.monthlyPay * pool.members;
                return acc + c.monthlyContribution;
            }, 0) : 0;
            pool.cycleLimit = 1;
            pool.currentBalance = pool.poolTreasury || 0;
            pool.simulationMonth = 0;
        }

        // Add monthly collection to current balance
        pool.currentBalance += pool.totalMonthlyCollection;
        pool.simulationMonth += 1;

        const winnersThisMonth = [];
        let balanceRemaining = pool.currentBalance;

        // Get members who haven't won in this cycle
        let eligible = pool.contributions.filter(c => !c.hasBeenPaid && c.targetAmount <= balanceRemaining);

        // Sort by AI Priority Score
        const totalEligible = eligible.length;
        eligible.sort((a, b) => b.priorityScore - a.priorityScore);

        if (eligible.length > 0) {
            // Emergency-flagged users get absolute priority over normal priority scores  
            const emergencyEligible = eligible.filter(c => c.emergencyFlag && !c.hasBeenPaid);
            const winner = emergencyEligible.length > 0 ? emergencyEligible[0] : eligible[0];
            const isEmergencyPayout = !!winner.emergencyFlag;
            
            // Calculate payout with emergency penalty
            let payoutAmount = winner.targetAmount;
            let penaltyAmount = 0;
            let bonusPerMember = 0;

            if (isEmergencyPayout) {
                // 10% penalty deduction for emergency payouts
                penaltyAmount = Math.round(payoutAmount * 0.10 * 100) / 100;
                payoutAmount = payoutAmount - penaltyAmount;

                // Distribute penalty equally among remaining unpaid members
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
            
            // Mark as paid
            winner.hasBeenPaid = true;
            winner.payoutMonth = pool.simulationMonth;
            
            // Generate detailed AI Context/Reasoning
            const rankStr = `Ranked #1 out of ${totalEligible} eligible members.`;
            const emergencyCtx = isEmergencyPayout
                ? ` ⚠️ EMERGENCY PAYOUT: 10% penalty ($${penaltyAmount}) deducted. Actual disbursement: $${payoutAmount}. Penalty distributed as $${bonusPerMember} bonus to each of the ${pool.contributions.filter(c => !c.hasBeenPaid).length} remaining members.`
                : '';
            const reasoning = `Winner AI selection logic: Priority Score (${winner.priorityScore}) secured payout. Their requested target ($${winner.targetAmount.toLocaleString()}) safely fit within the current pooled treasury balance ($${balanceRemaining.toLocaleString()}). ${rankStr}${emergencyCtx}`;
            
            // Deduct the FULL target from treasury (penalty stays in pool as bonus)
            balanceRemaining -= winner.targetAmount;
            winnersThisMonth.push({
                walletAddress: winner.walletAddress,
                targetAmount: winner.targetAmount,
                actualPayout: payoutAmount,
                penaltyAmount: penaltyAmount,
                bonusPerMember: bonusPerMember,
                isEmergency: isEmergencyPayout,
                priorityScore: winner.priorityScore,
                aiReasoning: reasoning
            });
        }

        pool.currentBalance = balanceRemaining;

        // Check if cycle is complete (everyone has won once)
        const allPaid = pool.contributions.every(c => c.hasBeenPaid);
        let cycleReset = false;
        if (allPaid) {
            // Reset for next cycle if we haven't hit the cycle limit
            cycleReset = true;
            pool.contributions.forEach(c => {
                c.hasBeenPaid = false;
            });
            pool.cycleLimit -= 1; // Used one cycle
            if (pool.cycleLimit <= 0) {
                pool.status = 'CLOSED';
            }
        }

        await pool.save();

        res.status(200).json({
            message: `Simulation for Month ${pool.simulationMonth} complete.`,
            month: pool.simulationMonth,
            collectionAdded: pool.totalMonthlyCollection,
            winners: winnersThisMonth,
            balanceRemaining: pool.currentBalance,
            cycleReset,
            poolStatus: pool.status
        });

    } catch (error) {
        console.error('Simulation error:', error);
        res.status(500).json({ error: 'Server simulation failed' });
    }
};

exports.triggerEmergency = async (req, res) => {
    try {
        const poolId = req.params.id;
        const { walletAddress } = req.body;
        const pool = await Pool.findById(poolId);
        if (!pool) return res.status(404).json({ error: 'Pool not found' });

        const contribIndex = pool.contributions.findIndex(c => c.walletAddress === walletAddress);
        if (contribIndex === -1) return res.status(404).json({ error: 'User not in pool' });

        // One-time only: block duplicate emergency requests
        if (pool.contributions[contribIndex].emergencyFlag) {
            return res.status(400).json({ error: 'Emergency has already been flagged for this user in this pool.' });
        }

        // ──────────────────────────────────────────────────
        // STEP 1: Verify the uploaded document via Groq
        // ──────────────────────────────────────────────────
        const reason = req.body.reason || 'Emergency payout request';
        if (!req.file) {
            return res.status(400).json({ error: 'You must upload a supporting document (text, PDF, or image) to request emergency payout.' });
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));

        let groqApproved = false;
        let groqResult = {};
        try {
            // FastAPI AI Oracle (run.py → app/routes/emergency.py on port 8000)
            const verifyRes = await axios.post(`${AI_SERVICE_URL}/ai/verify-emergency`, formData, {
                headers: { ...formData.getHeaders() },
                timeout: 30000
            });
            groqResult = verifyRes.data;
            groqApproved = groqResult.approved === true;
            console.log(`🧠 Groq emergency verification: approved=${groqApproved}, reason=${groqResult.reason}`);
        } catch (groqErr) {
            console.error('Groq verification error:', groqErr.message);
            return res.status(503).json({ error: 'AI Emergency Verification Service is offline. Start it with: venv\\Scripts\\python run.py  (port 8000)' });
        }

        // ──────────────────────────────────────────────────
        // NEW: Always create a record for history, even if rejected
        // ──────────────────────────────────────────────────
        const emergencyRecord = new EmergencyRecord({
            walletAddress: walletAddress.toLowerCase(),
            poolId: poolId,
            reason: reason,
            documentUrl: `/uploads/emergency/${path.basename(req.file.path)}`,
            aiResult: {
                approved: groqApproved,
                reason: groqResult.reason || (groqApproved ? 'Approved' : 'Unknown rejection'),
                category: groqResult.category || 'Unknown',
                confidence: groqResult.confidence || 0
            },
            status: groqApproved ? 'APPROVED' : 'REJECTED'
        });

        if (!groqApproved) {
            await emergencyRecord.save(); // Save the rejection
            return res.status(403).json({
                error: 'Emergency request denied by AI verification.',
                reason: groqResult.reason || 'Document does not represent a valid emergency.',
                category: groqResult.category || 'unknown',
                confidence: groqResult.confidence || 0
            });
        }

        // ──────────────────────────────────────────────────
        // STEP 2: Document approved → run ML priority recalc
        // ──────────────────────────────────────────────────

        // ... (CSV and payload logic remains same)
        // Try to find user in CSVs first (demo/simulation users)
        const dynamicCsv = fs.readFileSync(path.join(__dirname, '../../chitx_random_users_test.csv'), 'utf-8').trim().split('\n');
        const constantCsv = fs.readFileSync(path.join(__dirname, '../../chitx_test_users.csv'), 'utf-8').trim().split('\n');

        let userLine = dynamicCsv.find(line => line.startsWith(walletAddress + ','));
        let isDynamic = true;
        if (!userLine) {
            userLine = constantCsv.find(line => line.startsWith(walletAddress + ','));
            isDynamic = false;
        }

        let payload;
        if (userLine) {
            const cols = userLine.split(',');
            const userMonthlyPay = isDynamic ? parseFloat(cols[13]) : 5;
            payload = {
                income: parseFloat(cols[1]),
                expenses: parseFloat(cols[2]),
                employment: cols[3].trim(),
                credit_score: parseFloat(cols[4]),
                avg_balance: parseFloat(cols[5]),
                salary_consistency: parseFloat(cols[6]),
                spending_stability: parseFloat(cols[7]),
                payment_timeliness: parseFloat(cols[8]),
                defaults: parseFloat(cols[9]),
                participation_count: parseFloat(cols[10]),
                contribution_consistency: parseFloat(cols[11]),
                participation_frequency: parseFloat(cols[12]),
                contribution_amount: userMonthlyPay,
                pool_size: pool.members || 10,
                is_emergency: true
            };
        } else {
            const dbUser = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
            if (!dbUser) return res.status(404).json({ error: 'User profile not found.' });

            payload = {
                income: Number(dbUser.income) || 30000,
                expenses: Number(dbUser.expenses) || 15000,
                employment: dbUser.employment === 'Business' ? 'Business Owner' : (dbUser.employment || 'Salaried'),
                credit_score: Math.min(900, Math.max(300, (Number(dbUser.trustScore) || 50) * 9)),
                avg_balance: Math.max(0, (Number(dbUser.income) - Number(dbUser.expenses)) || 0) * 3,
                salary_consistency: 0.7,
                spending_stability: 0.6,
                payment_timeliness: 0.8,
                defaults: 0,
                participation_count: 1,
                contribution_consistency: 0.8,
                participation_frequency: 5,
                contribution_amount: pool.contributions[contribIndex].monthlyContribution || pool.monthlyPay || 5,
                pool_size: pool.members || 10,
                is_emergency: true
            };
        }

        // Flask ML server (all_models/server.py on port 5050) — reprioritise after emergency approval
        let newScore = pool.contributions[contribIndex].priorityScore;
        try {
            const mlRes = await axios.post(`${ML_SERVER_URL}/predict`, payload);
            if (mlRes.data && mlRes.data.priority_pct !== undefined) {
                newScore = mlRes.data.priority_pct;
            }
        } catch (mlErr) {
            console.error('ML Emergency repriority error:', mlErr.message);
            // ML is non-blocking for emergency: if offline, boost score by 10 pts
            newScore = Math.min(100, newScore + 10);
        }

        pool.contributions[contribIndex].priorityScore = newScore;
        pool.contributions[contribIndex].emergencyFlag = true;
        await pool.save();

        // Update the record with final score and save
        emergencyRecord.priorityScoreAtRequest = newScore;
        await emergencyRecord.save();

        res.status(200).json({
            message: 'Emergency ML Priority recalculation complete.',
            newScore: newScore,
            verification: {
                category: groqResult.category,
                severity: groqResult.severity,
                confidence: groqResult.confidence,
                reason: groqResult.reason
            },
            pool: pool,
            recordId: emergencyRecord._id
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to trigger emergency check' });
    }
};

// GET Emergency History for a user
exports.getEmergencyHistory = async (req, res) => {
    try {
        const { walletAddress } = req.params;
        if (!walletAddress) return res.status(400).json({ error: 'Wallet address required' });

        const history = await EmergencyRecord.find({ 
            walletAddress: walletAddress.toLowerCase() 
        }).sort({ createdAt: -1 });

        res.status(200).json({ history });
    } catch (err) {
        console.error('History fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch emergency history' });
    }
};
