/**
 * domain/pool/simulation.service.js
 * AI pool simulation logic — initDemoPool, simulateMonth.
 * Extracted from poolController.js.
 */
const Pool = require('../../../models/Pool');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://127.0.0.1:8000';

// ──────────────────────────────────────────────────────────────────────────
// INIT DEMO POOL
// ──────────────────────────────────────────────────────────────────────────
async function initDemoPool(mode = 'CONSTANT') {
  const isDynamic = mode === 'DYNAMIC' || mode === 'EMERGENCY';
  const isEmergencyMode = mode === 'EMERGENCY';
  const MAX_POOL_SIZE = 10;

  const filename = isDynamic ? 'chitx_random_users_test.csv' : 'chitx_test_users.csv';
  const csvPath = path.join(__dirname, '../../../', filename);

  const emergencyIndices = isEmergencyMode
    ? [...new Set([
        Math.floor(Math.random() * MAX_POOL_SIZE),
        Math.floor(Math.random() * MAX_POOL_SIZE),
      ])]
    : [];

  let csvData;
  try {
    csvData = fs.readFileSync(csvPath, 'utf-8');
  } catch (err) {
    throw Object.assign(new Error(`Could not read ${filename} dataset.`), { statusCode: 500 });
  }

  const users = csvData.trim().split('\n').slice(1, MAX_POOL_SIZE + 1);
  let initialCollection = 0;
  const poolContributions = [];
  const joinedMembers = [];

  for (let i = 0; i < users.length; i++) {
    const line = users[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    const rawContribution = parseFloat(cols[13]);
    const userMonthlyPay = isDynamic ? rawContribution : 5;
    const userTargetAmount = userMonthlyPay * MAX_POOL_SIZE;
    const isThisUserEmergency = isEmergencyMode && emergencyIndices.includes(i);

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
      pool_size: MAX_POOL_SIZE,
      ...(isThisUserEmergency && { is_emergency: true }),
    };

    let pScore = 0;
    try {
      const mlRes = await axios.post(`${ML_SERVER_URL}/predict`, payload);
      if (mlRes.data?.priority_pct !== undefined) {
        pScore = mlRes.data.priority_pct;
      } else {
        throw new Error('Invalid response from ML server');
      }
    } catch (mlErr) {
      throw Object.assign(
        new Error(`AI Prediction Server is offline or failed for ${cols[0]}. Please start ai_service on port 8000.`),
        { statusCode: 503 }
      );
    }

    const dummyWallet = cols[0];
    joinedMembers.push(dummyWallet);
    poolContributions.push({
      walletAddress: dummyWallet,
      monthlyContribution: userMonthlyPay,
      targetAmount: userTargetAmount,
      fixedDeposit: 0,
      trustScoreAtJoin: pScore,
      priorityScore: pScore,
      hasBeenPaid: false,
      payoutMonth: 0,
      emergencyFlag: isThisUserEmergency,
    });

    if (isThisUserEmergency) {
      console.log(`🚨 Emergency flag set for ${dummyWallet} (priority: ${pScore})`);
    }

    initialCollection += userMonthlyPay;
  }

  const newPool = new Pool({
    monthlyPay: isDynamic ? 0 : 5,
    totalAmount: poolContributions.reduce((acc, c) => acc + c.targetAmount, 0),
    members: MAX_POOL_SIZE,
    status: 'ACTIVE',
    isDynamic: true,
    currentBalance: 0,
    totalMonthlyCollection: initialCollection,
    simulationMonth: 0,
    cycleLimit: 1,
    joinedMembers,
    contributions: poolContributions,
  });

  await newPool.save();
  return {
    message: `Successfully initialized ${isEmergencyMode ? 'Emergency Fund' : isDynamic ? 'Dynamic' : 'Constant'} demo pool using ML models.${isEmergencyMode ? ` Emergency flagged for ${emergencyIndices.length} members.` : ''}`,
    pool: newPool,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// SIMULATE MONTH
// ──────────────────────────────────────────────────────────────────────────
async function simulateMonth(poolId) {
  const pool = await Pool.findById(poolId);
  if (!pool) throw Object.assign(new Error('Pool not found'), { statusCode: 404 });

  if (!pool.isDynamic) {
    pool.isDynamic = true;
    pool.totalMonthlyCollection = pool.contributions
      ? pool.contributions.reduce((acc, c) => {
          if (!c.monthlyContribution || c.monthlyContribution === 0) c.monthlyContribution = pool.monthlyPay;
          if (!c.targetAmount || c.targetAmount === 0) c.targetAmount = pool.monthlyPay * pool.members;
          return acc + c.monthlyContribution;
        }, 0)
      : 0;
    pool.cycleLimit = 1;
    pool.currentBalance = pool.poolTreasury || 0;
    pool.simulationMonth = 0;
  }

  pool.currentBalance += pool.totalMonthlyCollection;
  pool.simulationMonth += 1;

  const winnersThisMonth = [];
  let balanceRemaining = pool.currentBalance;

  const eligible = pool.contributions
    .filter((c) => !c.hasBeenPaid && c.targetAmount <= balanceRemaining)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const totalEligible = eligible.length;

  if (eligible.length > 0) {
    const emergencyEligible = eligible.filter((c) => c.emergencyFlag && !c.hasBeenPaid);
    const winner = emergencyEligible.length > 0 ? emergencyEligible[0] : eligible[0];
    const isEmergencyPayout = !!winner.emergencyFlag;

    let payoutAmount = winner.targetAmount;
    let penaltyAmount = 0;
    let bonusPerMember = 0;

    if (isEmergencyPayout) {
      penaltyAmount = Math.round(payoutAmount * 0.10 * 100) / 100;
      payoutAmount -= penaltyAmount;
      const remainingUnpaid = pool.contributions.filter(
        (c) => !c.hasBeenPaid && c.walletAddress !== winner.walletAddress
      );
      if (remainingUnpaid.length > 0) {
        bonusPerMember = Math.round((penaltyAmount / remainingUnpaid.length) * 100) / 100;
        remainingUnpaid.forEach((c) => {
          c.targetAmount = Math.round((c.targetAmount + bonusPerMember) * 100) / 100;
        });
      }
    }

    winner.hasBeenPaid = true;
    winner.payoutMonth = pool.simulationMonth;

    const rankStr = `Ranked #1 out of ${totalEligible} eligible members.`;
    const emergencyCtx = isEmergencyPayout
      ? ` ⚠️ EMERGENCY PAYOUT: 10% penalty ($${penaltyAmount}) deducted. Actual disbursement: $${payoutAmount}. Penalty distributed as $${bonusPerMember} bonus to each of the ${pool.contributions.filter((c) => !c.hasBeenPaid).length} remaining members.`
      : '';
    const reasoning = `Winner AI selection logic: Priority Score (${winner.priorityScore}) secured payout. Their requested target ($${winner.targetAmount.toLocaleString()}) safely fit within the current pooled treasury balance ($${balanceRemaining.toLocaleString()}). ${rankStr}${emergencyCtx}`;

    balanceRemaining -= winner.targetAmount;
    winnersThisMonth.push({
      walletAddress: winner.walletAddress,
      targetAmount: winner.targetAmount,
      actualPayout: payoutAmount,
      penaltyAmount,
      bonusPerMember,
      isEmergency: isEmergencyPayout,
      priorityScore: winner.priorityScore,
      aiReasoning: reasoning,
    });
  }

  pool.currentBalance = balanceRemaining;

  const allPaid = pool.contributions.every((c) => c.hasBeenPaid);
  let cycleReset = false;
  if (allPaid) {
    cycleReset = true;
    pool.contributions.forEach((c) => { c.hasBeenPaid = false; });
    pool.cycleLimit -= 1;
    if (pool.cycleLimit <= 0) pool.status = 'CLOSED';
  }

  await pool.save();
  return {
    message: `Simulation for Month ${pool.simulationMonth} complete.`,
    month: pool.simulationMonth,
    collectionAdded: pool.totalMonthlyCollection,
    winners: winnersThisMonth,
    balanceRemaining: pool.currentBalance,
    cycleReset,
    poolStatus: pool.status,
  };
}

module.exports = { initDemoPool, simulateMonth };
