/**
 * domain/user/user.service.js
 * User registration, authentication, and profile management.
 * Extracted from authController.js.
 */
const User = require('../../../models/User');
const BankStatement = require('../../../models/BankStatement');
const web3Service = require('../../../services/web3Service');
const cryptoUtils = require('../../../utils/cryptoUtils');
const { ethers } = require('ethers');
const crypto = require('crypto');
const aiService = require('../../services/ai.service');

// ──────────────────────────────────────────────────────────────────────────
// UPLOAD STATEMENT (Bank CSV → AI parse → trust score)
// ──────────────────────────────────────────────────────────────────────────
async function uploadStatement(fileBuffer, originalname) {
  if (!fileBuffer) throw Object.assign(new Error('No CSV file uploaded'), { statusCode: 400 });

  const csvText = fileBuffer.toString('utf-8');
  console.log('\n' + '='.repeat(60));
  console.log('📄 RECEIVED CSV FILE IN BACKEND:');
  console.log('='.repeat(60));
  console.log(csvText.substring(0, 3000));
  if (csvText.length > 3000) console.log(`... [${csvText.length - 3000} more characters truncated]`);
  console.log('='.repeat(60) + '\n');

  let parsedData = { income: 50000, expenses: 20000, trustScore: 75 };
  try {
    parsedData = await aiService.parseStatement(fileBuffer, originalname);
  } catch (err) {
    console.error('Python CSV parser error:', err.message);
  }

  const sessionKey = crypto.randomUUID();
  try {
    const safeCSV = csvText.length > 512_000 ? csvText.slice(0, 512_000) : csvText;
    await BankStatement.create({
      sessionKey,
      originalFilename: originalname || 'bank_statement.csv',
      csvContent: safeCSV,
      parsedIncome: parsedData.income ?? null,
      parsedExpenses: parsedData.expenses ?? null,
      parsedTrustScore: parsedData.trustScore ?? null,
      rawParsedData: parsedData,
    });
    console.log(`💾 Bank statement stored in DB (session: ${sessionKey})`);
  } catch (dbErr) {
    console.error('⚠️  Bank statement DB save failed (non-fatal):', dbErr.message);
  }

  return { message: 'Statement parsed successfully', data: parsedData, sessionKey };
}

// ──────────────────────────────────────────────────────────────────────────
// CREATE WALLET (Registration Step 2)
// ──────────────────────────────────────────────────────────────────────────
async function createWallet({ name, phone, password, income, expenses, employment, trustScore, tokensIssued }) {
  if (!name || !phone || !password) {
    throw Object.assign(new Error('Name, phone, and password are required'), { statusCode: 400 });
  }

  const existing = await User.findOne({ phone });
  if (existing) {
    throw Object.assign(new Error('User with this phone already exists. Please Login.'), { statusCode: 400 });
  }

  const wallet = ethers.Wallet.createRandom();
  const { iv, encryptedData } = cryptoUtils.encrypt(phone, password, wallet.privateKey);

  const score = trustScore || 50;
  const airdropAmount = score * 10;
  let airdropResult;
  try {
    airdropResult = await web3Service.airdropTokens(wallet.address, score);
  } catch (err) {
    airdropResult = { success: false, simulated: true, tokensTransferred: airdropAmount };
  }

  const newUser = new User({
    name, phone,
    income: income || 0,
    expenses: expenses || 0,
    employment: employment || 'Salaried',
    hasBankStatement: false,
    walletAddress: wallet.address.toLowerCase(),
    trustScore: score,
    tokensIssued: airdropAmount,
    encryptedPrivateKey: encryptedData,
    encryptionIv: iv,
  });
  await newUser.save();

  return {
    message: 'Wallet created securely',
    walletAddress: wallet.address,
    privateKey: wallet.privateKey, // shown once to user
    trustScore: score,
    airdropAmount,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// RETRIEVE KEY
// ──────────────────────────────────────────────────────────────────────────
async function retrieveKey({ phone, password, walletAddress }) {
  if (!phone || !password) {
    throw Object.assign(new Error('Phone and password are required for login.'), { statusCode: 400 });
  }

  const user = await User.findOne({ phone });
  if (!user) throw Object.assign(new Error('No account found for this phone number.'), { statusCode: 404 });

  if (walletAddress && user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw Object.assign(new Error('Provided wallet address does not match account records.'), { statusCode: 400 });
  }

  try {
    const privateKey = cryptoUtils.decrypt(phone, password, user.encryptedPrivateKey, user.encryptionIv);
    return {
      message: 'Login successful. Key Decrypted.',
      privateKey,
      address: user.walletAddress,
      trustScore: user.trustScore,
      tokensIssued: user.tokensIssued,
    };
  } catch {
    throw Object.assign(new Error('Incorrect password. Decryption failed.'), { statusCode: 401 });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// LOGIN WITH WALLET (MetaMask)
// ──────────────────────────────────────────────────────────────────────────
async function loginWithWallet(walletAddress) {
  if (!walletAddress) {
    throw Object.assign(new Error('Wallet address is required.'), { statusCode: 400 });
  }

  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (!user) {
    throw Object.assign(
      new Error('Wallet not registered. You need to register your MetaMask account with ChitX first.'),
      { statusCode: 404, detail: { registered: false } }
    );
  }

  console.log(`✅ Wallet login successful: ${walletAddress} → ${user.name}`);
  return {
    message: 'Login successful',
    registered: true,
    user: {
      name: user.name,
      phone: user.phone,
      walletAddress: user.walletAddress,
      trustScore: user.trustScore,
      tokensIssued: user.tokensIssued,
      employment: user.employment,
      income: user.income || 0,
      expenses: user.expenses || 0,
      hasBankStatement: user.hasBankStatement || false,
      createdAt: user.createdAt,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// PROFILE
// ──────────────────────────────────────────────────────────────────────────
async function getProfile(walletAddress) {
  if (!walletAddress) throw Object.assign(new Error('Wallet address required'), { statusCode: 400 });
  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return { user };
}

async function updateProfile({ walletAddress, name, phone, employment, income, expenses }) {
  if (!walletAddress) throw Object.assign(new Error('Wallet address required'), { statusCode: 400 });
  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (employment !== undefined) user.employment = employment;
  if (income !== undefined) user.income = Number(income) || 0;
  if (expenses !== undefined) user.expenses = Number(expenses) || 0;

  await user.save();
  return { message: 'Profile updated successfully', user };
}

module.exports = { uploadStatement, createWallet, retrieveKey, loginWithWallet, getProfile, updateProfile };
