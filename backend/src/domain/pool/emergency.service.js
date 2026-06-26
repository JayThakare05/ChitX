/**
 * domain/pool/emergency.service.js
 * Emergency payout verification and history logic.
 * Extracted from poolController.js.
 */
const Pool = require('../../../models/Pool');
const User = require('../../../models/User');
const EmergencyRecord = require('../../../models/EmergencyRecord');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://127.0.0.1:8000';

// ──────────────────────────────────────────────────────────────────────────
// TRIGGER EMERGENCY
// ──────────────────────────────────────────────────────────────────────────
async function triggerEmergency({ poolId, walletAddress, reason, filePath }) {
  const pool = await Pool.findById(poolId);
  if (!pool) throw Object.assign(new Error('Pool not found'), { statusCode: 404 });

  const contribIndex = pool.contributions.findIndex((c) => c.walletAddress === walletAddress);
  if (contribIndex === -1) throw Object.assign(new Error('User not in pool'), { statusCode: 404 });

  if (pool.contributions[contribIndex].emergencyFlag) {
    throw Object.assign(new Error('Emergency has already been flagged for this user in this pool.'), { statusCode: 400 });
  }

  if (!filePath) {
    throw Object.assign(
      new Error('You must upload a supporting document (text, PDF, or image) to request emergency payout.'),
      { statusCode: 400 }
    );
  }

  // Step 1: AI document verification via Groq
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  let groqApproved = false;
  let groqResult = {};
  try {
    const verifyRes = await axios.post(`${AI_SERVICE_URL}/ai/verify-emergency`, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 30000,
    });
    groqResult = verifyRes.data;
    groqApproved = groqResult.approved === true;
    console.log(`🧠 Groq emergency verification: approved=${groqApproved}, reason=${groqResult.reason}`);
  } catch (groqErr) {
    throw Object.assign(
      new Error('AI Emergency Verification Service (app.py:8000) is offline.'),
      { statusCode: 503 }
    );
  }

  // Always create a record (even if rejected)
  const emergencyRecord = new EmergencyRecord({
    walletAddress: walletAddress.toLowerCase(),
    poolId,
    reason,
    documentUrl: `/uploads/emergency/${path.basename(filePath)}`,
    aiResult: {
      approved: groqApproved,
      reason: groqResult.reason || (groqApproved ? 'Approved' : 'Unknown rejection'),
      category: groqResult.category || 'Unknown',
      confidence: groqResult.confidence || 0,
    },
    status: groqApproved ? 'APPROVED' : 'REJECTED',
  });

  if (!groqApproved) {
    await emergencyRecord.save();
    const err = Object.assign(
      new Error('Emergency request denied by AI verification.'),
      { statusCode: 403, detail: groqResult }
    );
    throw err;
  }

  // Step 2: ML priority recalculation
  const dynamicCsv = fs.readFileSync(path.join(__dirname, '../../../chitx_random_users_test.csv'), 'utf-8').trim().split('\n');
  const constantCsv = fs.readFileSync(path.join(__dirname, '../../../chitx_test_users.csv'), 'utf-8').trim().split('\n');

  let userLine = dynamicCsv.find((line) => line.startsWith(walletAddress + ','));
  let isDynamic = true;
  if (!userLine) {
    userLine = constantCsv.find((line) => line.startsWith(walletAddress + ','));
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
      is_emergency: true,
    };
  } else {
    const dbUser = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!dbUser) throw Object.assign(new Error('User profile not found.'), { statusCode: 404 });
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
      is_emergency: true,
    };
  }

  let newScore = pool.contributions[contribIndex].priorityScore;
  try {
    const mlRes = await axios.post(`${ML_SERVER_URL}/predict`, payload);
    if (mlRes.data?.priority_pct !== undefined) {
      newScore = mlRes.data.priority_pct;
    }
  } catch (mlErr) {
    console.error('ML Emergency Error:', mlErr.message);
    newScore = Math.min(100, newScore + 10);
  }

  pool.contributions[contribIndex].priorityScore = newScore;
  pool.contributions[contribIndex].emergencyFlag = true;
  await pool.save();

  emergencyRecord.priorityScoreAtRequest = newScore;
  await emergencyRecord.save();

  return {
    message: 'Emergency ML Priority recalculation complete.',
    newScore,
    verification: {
      category: groqResult.category,
      severity: groqResult.severity,
      confidence: groqResult.confidence,
      reason: groqResult.reason,
    },
    pool,
    recordId: emergencyRecord._id,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// HISTORY
// ──────────────────────────────────────────────────────────────────────────
async function getEmergencyHistory(walletAddress) {
  if (!walletAddress) throw Object.assign(new Error('Wallet address required'), { statusCode: 400 });
  return EmergencyRecord.find({ walletAddress: walletAddress.toLowerCase() }).sort({ createdAt: -1 });
}

module.exports = { triggerEmergency, getEmergencyHistory };
