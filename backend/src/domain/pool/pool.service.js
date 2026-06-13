/**
 * domain/pool/pool.service.js
 * 
 * Pure business logic for Pool CRUD and membership operations.
 * No req/res objects here — just functions that receive data and return results.
 * Controllers call these and handle HTTP response formatting.
 */
const Pool = require('../../../models/Pool');
const User = require('../../../models/User');
const Transaction = require('../../../models/Transaction');
const web3Service = require('../../../services/web3Service');

// ──────────────────────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────────────────────
async function createPool({ monthlyPay, members, creatorWallet, status, isCreatorJoining, txHash }) {
  if (!monthlyPay) throw Object.assign(new Error('monthlyPay is required'), { statusCode: 400 });

  const totalAmount = members ? monthlyPay * members : 0;

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
      targetAmount: totalAmount || (monthlyPay * 10),
      hasBeenPaid: false,
      payoutMonth: 0,
    }] : [],
  });

  if (isCreatorJoining) {
    const user = await User.findOne({ walletAddress: creatorWallet.toLowerCase() });
    if (user) {
      const fixedDeposit = monthlyPay * 2;
      user.tokensIssued = Math.max(0, user.tokensIssued - fixedDeposit);
      await user.save();
      await Transaction.create({
        walletAddress: creatorWallet.toLowerCase(),
        type: 'POOL_JOIN',
        amount: fixedDeposit,
        direction: 'DEBIT',
        description: `Fixed Deposit for joining pool with ${monthlyPay} monthly pay`,
        poolId: newPool._id,
        status: 'SUCCESS',
        txHash: txHash || 'pending',
      });
    }
  }

  await newPool.save();
  return newPool;
}

// ──────────────────────────────────────────────────────────────────────────
// READ
// ──────────────────────────────────────────────────────────────────────────
async function getAllPools() {
  return Pool.find().sort({ createdAt: -1 });
}

// ──────────────────────────────────────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────────────────────────────────────
async function deletePool(poolId, walletAddress) {
  if (!walletAddress) throw Object.assign(new Error('Wallet address is required'), { statusCode: 400 });

  const pool = await Pool.findById(poolId);
  if (!pool) throw Object.assign(new Error('Pool not found'), { statusCode: 404 });
  if (pool.creatorWallet !== walletAddress.toLowerCase()) {
    throw Object.assign(new Error('Only the pool creator can delete this pool.'), { statusCode: 403 });
  }

  // Refund fixed deposits before deleting
  if (pool.contributions?.length > 0) {
    for (const contrib of pool.contributions) {
      const member = await User.findOne({ walletAddress: contrib.walletAddress });
      if (member) {
        member.tokensIssued += contrib.fixedDeposit || 0;
        await member.save();
        console.log(`💰 Refunded ${contrib.fixedDeposit} CTX to ${contrib.walletAddress}`);
      }
    }
  }

  await Pool.findByIdAndDelete(poolId);
  return { message: 'Pool deleted successfully. All members refunded.' };
}

// ──────────────────────────────────────────────────────────────────────────
// JOIN
// ──────────────────────────────────────────────────────────────────────────
async function joinPool(poolId, walletAddress, txHash = null) {
  if (!walletAddress) throw Object.assign(new Error('Wallet address required'), { statusCode: 400 });

  const pool = await Pool.findById(poolId);
  if (!pool) throw Object.assign(new Error('Pool not found'), { statusCode: 404 });

  if (pool.joinedMembers?.includes(walletAddress.toLowerCase())) {
    throw Object.assign(new Error('You have already joined this pool'), { statusCode: 400 });
  }

  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (!user) throw Object.assign(new Error('User not found in system. Please register.'), { statusCode: 404 });

  const disposable = user.income - user.expenses;
  const fixedDeposit = pool.monthlyPay * 2;
  const isMicroPool = pool.monthlyPay >= 5 && pool.monthlyPay <= 10;
  const isLowTrust = user.trustScore < 50;

  const balanceResult = await web3Service.getBalance(walletAddress);
  const onChainBalance = parseFloat(balanceResult.balance) || 0;

  const incomeOk = disposable >= pool.monthlyPay;
  const balanceOk = onChainBalance >= fixedDeposit;
  const trustOk = user.trustScore >= 50 || (isMicroPool && balanceOk);

  if (isLowTrust && !isMicroPool) {
    throw Object.assign(
      new Error(`Trust score too low (${user.trustScore}/100). Pools above $10 require a minimum trust score of 50.`),
      { statusCode: 403 }
    );
  }
  if (isLowTrust && !balanceOk) {
    throw Object.assign(
      new Error(`For micro-pools, a sufficient CTX balance (${fixedDeposit} required) is compulsory for low-trust users.`),
      { statusCode: 403 }
    );
  }

  const passedCount = [trustOk, incomeOk, balanceOk].filter(Boolean).length;
  if (passedCount < 2) {
    const reasons = [];
    if (!trustOk) reasons.push(`Trust score too low (${user.trustScore}/100, min 50)`);
    if (!incomeOk) reasons.push(`Disposable income ($${disposable}) is less than monthly pay ($${pool.monthlyPay})`);
    if (!balanceOk) reasons.push(`CTX balance (${onChainBalance.toFixed(1)}) is less than required deposit (${fixedDeposit})`);
    throw Object.assign(
      new Error(`You need at least 2 of 3 eligibility criteria to join. Failed: ${reasons.join('; ')}.`),
      { statusCode: 403 }
    );
  }

  if (pool.members && pool.joinedMembers?.length >= pool.members) {
    throw Object.assign(new Error('Pool is full.'), { statusCode: 400 });
  }

  user.tokensIssued = Math.max(0, (user.tokensIssued || 0) - fixedDeposit);
  await user.save();

  pool.joinedMembers = pool.joinedMembers || [];
  pool.joinedMembers.push(walletAddress.toLowerCase());
  pool.contributions = pool.contributions || [];
  pool.contributions.push({
    walletAddress: walletAddress.toLowerCase(),
    fixedDeposit,
    monthlyContribution: pool.monthlyPay,
    targetAmount: pool.monthlyPay * pool.members,
    priorityScore: 50,
    monthlyPayments: 0,
    hasBeenPaid: false,
    payoutMonth: 0,
    totalContributed: fixedDeposit,
  });
  pool.poolTreasury = (pool.poolTreasury || 0) + fixedDeposit;
  await pool.save();

  try {
    await Transaction.create({
      walletAddress: walletAddress.toLowerCase(),
      type: 'POOL_JOIN',
      direction: 'DEBIT',
      amount: fixedDeposit,
      poolId,
      poolMonthlyPay: pool.monthlyPay,
      description: `Joined pool — ${fixedDeposit} CTX fixed deposit locked`,
      txHash: txHash || null,
      status: 'SUCCESS',
    });
  } catch (txErr) {
    console.error('Transaction record error:', txErr.message);
  }

  const updatedBalance = await web3Service.getBalance(walletAddress);
  const displayBalance = parseFloat(updatedBalance.balance) || (onChainBalance - fixedDeposit);

  return {
    message: `Successfully joined! ${fixedDeposit} CTX fixed deposit deducted.`,
    pool,
    deducted: fixedDeposit,
    remainingBalance: displayBalance.toFixed(1),
    onChainBalance: displayBalance.toFixed(1),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// LEAVE
// ──────────────────────────────────────────────────────────────────────────
async function leavePool(poolId, walletAddress) {
  if (!walletAddress) throw Object.assign(new Error('Wallet address required'), { statusCode: 400 });

  const pool = await Pool.findById(poolId);
  if (!pool) throw Object.assign(new Error('Pool not found'), { statusCode: 404 });

  const wallet = walletAddress.toLowerCase();
  if (!pool.joinedMembers?.includes(wallet)) {
    throw Object.assign(new Error('You are not a member of this pool.'), { statusCode: 400 });
  }

  const contrib = pool.contributions?.find((c) => c.walletAddress === wallet);
  if (!contrib) throw Object.assign(new Error('No contribution record found.'), { statusCode: 400 });
  if (contrib.monthlyPayments > 0) {
    throw Object.assign(
      new Error('You have already made monthly payments. You cannot leave the pool after the first payment.'),
      { statusCode: 403 }
    );
  }

  const refundAmount = contrib.fixedDeposit;
  await web3Service.transferTokens(wallet, refundAmount);

  const user = await User.findOne({ walletAddress: wallet });
  if (user) {
    user.tokensIssued = (user.tokensIssued || 0) + refundAmount;
    await user.save();
  }

  pool.joinedMembers = pool.joinedMembers.filter((m) => m !== wallet);
  pool.contributions = pool.contributions.filter((c) => c.walletAddress !== wallet);
  pool.poolTreasury = Math.max(0, (pool.poolTreasury || 0) - refundAmount);
  await pool.save();

  try {
    await Transaction.create({
      walletAddress: wallet,
      type: 'POOL_LEAVE',
      direction: 'CREDIT',
      amount: refundAmount,
      poolId,
      poolMonthlyPay: pool.monthlyPay,
      description: `Left pool — ${refundAmount} CTX fixed deposit refunded`,
      txHash: null,
      status: 'SUCCESS',
    });
  } catch (txErr) {
    console.error('Transaction record error:', txErr.message);
  }

  const updatedBalance = await web3Service.getBalance(wallet);
  const displayBalance = parseFloat(updatedBalance.balance) || (user ? user.tokensIssued : 0);

  return {
    message: `Successfully left the pool. ${refundAmount} CTX refunded.`,
    refunded: refundAmount,
    newBalance: displayBalance.toFixed(1),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// BALANCE
// ──────────────────────────────────────────────────────────────────────────
async function getUserBalance(walletAddress) {
  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  const onChain = await web3Service.getBalance(walletAddress);
  return {
    walletAddress,
    onChainBalance: parseFloat(onChain.balance) || 0,
    dbBalance: user ? user.tokensIssued : 0,
    trustScore: user ? user.trustScore : 0,
  };
}

module.exports = { createPool, getAllPools, deletePool, joinPool, leavePool, getUserBalance };
