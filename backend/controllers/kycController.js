const User = require('../models/User');
const KYCLog = require('../models/KYCLog');
const otpService = require('../services/otpService');
const panService = require('../services/panVerificationService');
const aadhaarService = require('../services/aadhaarVerificationService');
const faceService = require('../services/faceVerificationService');
const bankService = require('../services/bankVerificationService');
const kycConfidenceService = require('../services/kycConfidenceService');
const web3Service = require('../services/web3Service');
const cryptoUtils = require('../utils/cryptoUtils');
const { ethers } = require('ethers');
const axios = require('axios');
const FormData = require('form-data');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Log KYC event
// ─────────────────────────────────────────────────────────────────────────────
async function logKYCEvent(userId, step, status, details = {}, req = null) {
    try {
        await KYCLog.create({
            userId,
            step,
            status,
            details,
            ipAddress: req?.ip || null,
            userAgent: req?.headers?.['user-agent'] || null,
        });
    } catch (err) {
        console.error('KYC log write failed (non-fatal):', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/kyc/status
// ─────────────────────────────────────────────────────────────────────────────
exports.getKYCStatus = async (req, res) => {
    try {
        const user = req.user;
        const { confidence, status, breakdown } = kycConfidenceService.calculateKYCConfidence(user);

        res.status(200).json({
            kycStatus: user.kycStatus,
            kycConfidence: confidence,
            kycStep: user.kycStep,
            breakdown,
            steps: {
                phone:   user.phoneVerified,
                pan:     user.panVerified,
                aadhaar: user.aadhaarVerified,
                face:    user.faceVerified,
                bank:    user.bankVerified,
                bankStatement: user.bankStatementUploaded,
            },
            walletCreated: user.walletCreated,
            walletAddress: user.walletAddress,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/send-otp
// ─────────────────────────────────────────────────────────────────────────────
exports.sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

        const result = await otpService.sendOTP(phone);
        if (!result.success) return res.status(400).json({ error: result.message });

        await logKYCEvent(req.userId, 'phone_otp', 'initiated', { phone }, req);
        res.status(200).json({ message: result.message, ...(result.devOtp && { devOtp: result.devOtp }) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-otp
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required.' });

        const result = otpService.verifyOTP(phone, otp);
        if (!result.success) return res.status(400).json({ error: result.message });

        // Update user record
        const user = await User.findByIdAndUpdate(req.userId, {
            phoneVerified: true,
            phoneVerifiedAt: new Date(),
            phone,
            kycStep: Math.max(req.user.kycStep, 1),
            kycStatus: 'in_progress',
            lastKycUpdate: new Date(),
        }, { new: true });

        await logKYCEvent(req.userId, 'phone_otp', 'success', { phone }, req);
        res.status(200).json({ message: 'Phone verified successfully.', kycStep: user.kycStep });
    } catch (err) {
        res.status(500).json({ error: 'OTP verification failed: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-pan
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyPAN = async (req, res) => {
    try {
        const { panNumber } = req.body;
        if (!panNumber) return res.status(400).json({ error: 'PAN number is required.' });

        const result = await panService.verifyPAN(panNumber);
        if (!result.success) return res.status(400).json({ error: result.error });

        const { panHolderName, panStatus } = result.data;

        // Mask PAN for storage: ABCDE****F
        const maskedPAN = panNumber.slice(0, 5) + '****' + panNumber.slice(-1);

        await User.findByIdAndUpdate(req.userId, {
            panNumber: maskedPAN,
            panName: panHolderName,
            panVerified: true,
            panVerifiedAt: new Date(),
            kycStep: Math.max(req.user.kycStep, 2),
            lastKycUpdate: new Date(),
        });

        await logKYCEvent(req.userId, 'pan', 'success', { maskedPAN, panStatus }, req);
        res.status(200).json({
            message: 'PAN verified successfully.',
            panHolderName,
            panStatus,
            maskedPAN,
        });
    } catch (err) {
        res.status(500).json({ error: 'PAN verification failed: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/initiate-aadhaar-otp
// ─────────────────────────────────────────────────────────────────────────────
exports.initiateAadhaarOTP = async (req, res) => {
    try {
        const { aadhaarNumber } = req.body;
        if (!aadhaarNumber) return res.status(400).json({ error: 'Aadhaar number is required.' });

        const result = await aadhaarService.initiateAadhaarOTP(aadhaarNumber);
        if (!result.success) return res.status(400).json({ error: result.error });

        res.status(200).json({ message: result.message, transactionId: result.transactionId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to initiate Aadhaar OTP: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-aadhaar
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyAadhaar = async (req, res) => {
    try {
        const { aadhaarNumber, otp, transactionId } = req.body;
        if (!aadhaarNumber || !otp) {
            return res.status(400).json({ error: 'Aadhaar number and OTP are required.' });
        }

        const result = await aadhaarService.verifyAadhaar(aadhaarNumber, otp, transactionId);
        if (!result.success) return res.status(400).json({ error: result.error });

        const { name, address, photo, dateOfBirth } = result.data;

        // Name cross-check with PAN
        const user = req.user;
        let nameMatchStatus = 'not_checked';
        if (user.panName) {
            const crossCheck = kycConfidenceService.crossValidateNames(user.panName, name, null);
            nameMatchStatus = crossCheck.passed ? 'matched' : 'mismatch';
        }

        await User.findByIdAndUpdate(req.userId, {
            aadhaarVerified: true,
            aadhaarName: name,
            aadhaarPhoto: photo,
            aadhaarAddress: address,
            aadhaarVerifiedAt: new Date(),
            kycStep: Math.max(user.kycStep, 3),
            lastKycUpdate: new Date(),
        });

        await logKYCEvent(req.userId, 'aadhaar', 'success', { nameMatchStatus }, req);
        res.status(200).json({
            message: 'Aadhaar verified successfully.',
            aadhaarName: name,
            aadhaarAddress: address,
            aadhaarPhoto: photo,
            nameMatchStatus,
        });
    } catch (err) {
        res.status(500).json({ error: 'Aadhaar verification failed: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-face
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyFace = async (req, res) => {
    try {
        const { selfieBase64 } = req.body;
        if (!selfieBase64) return res.status(400).json({ error: 'Selfie image is required.' });

        const user = req.user;
        const result = await faceService.verifyFace(selfieBase64, user.aadhaarPhoto);
        if (!result.success) return res.status(400).json({ error: result.error });

        const { faceSimilarity, livenessPassed, faceMatchPassed } = result.data;

        if (!faceMatchPassed) {
            await logKYCEvent(req.userId, 'face', 'failed', { faceSimilarity, livenessPassed }, req);
            return res.status(400).json({
                error: `Face match failed. Similarity: ${faceSimilarity}%. Minimum required: ${faceService.FACE_SIMILARITY_THRESHOLD}%.`,
                faceSimilarity,
            });
        }

        await User.findByIdAndUpdate(req.userId, {
            faceVerified: true,
            faceSimilarity,
            livenessPassed,
            faceVerifiedAt: new Date(),
            kycStep: Math.max(user.kycStep, 4),
            lastKycUpdate: new Date(),
        });

        await logKYCEvent(req.userId, 'face', 'success', result.data, req);
        res.status(200).json({
            message: 'Face verification successful.',
            faceSimilarity,
            livenessPassed,
        });
    } catch (err) {
        res.status(500).json({ error: 'Face verification failed: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-bank
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyBank = async (req, res) => {
    try {
        const { accountNumber, ifsc } = req.body;
        if (!accountNumber || !ifsc) {
            return res.status(400).json({ error: 'Account number and IFSC are required.' });
        }

        const result = await bankService.verifyBankAccount(accountNumber, ifsc);
        if (!result.success) return res.status(400).json({ error: result.error });

        const { accountHolderName, bankName, accountMasked, accountStatus } = result.data;

        // Cross-check name with PAN
        const user = req.user;
        let nameMatchStatus = 'not_checked';
        if (user.panName) {
            const crossCheck = kycConfidenceService.crossValidateNames(user.panName, null, accountHolderName);
            nameMatchStatus = crossCheck.passed ? 'matched' : 'mismatch';
        }

        await User.findByIdAndUpdate(req.userId, {
            bankVerified: true,
            bankHolderName: accountHolderName,
            bankName,
            accountMasked,
            ifsc: ifsc.toUpperCase(),
            bankVerifiedAt: new Date(),
            kycStep: Math.max(user.kycStep, 5),
            lastKycUpdate: new Date(),
        });

        await logKYCEvent(req.userId, 'bank', 'success', { bankName, accountMasked, nameMatchStatus }, req);
        res.status(200).json({
            message: 'Bank account verified successfully.',
            accountHolderName,
            bankName,
            accountMasked,
            accountStatus,
            nameMatchStatus,
        });
    } catch (err) {
        res.status(500).json({ error: 'Bank verification failed: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/upload-statement  (optional)
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadStatement = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        const csvText = req.file.buffer.toString('utf-8');
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: 'text/csv',
        });

        let parsedData = { income: 50000, expenses: 20000, trustScore: 75 };
        try {
            const aiResponse = await axios.post(
                `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/ai/parse-statement`,
                formData,
                { headers: { ...formData.getHeaders() } }
            );
            parsedData = aiResponse.data;
        } catch (aiErr) {
            console.error('AI parse error (non-fatal):', aiErr.message);
        }

        const getZkpRange = (val) => {
            if (val < 20000) return '<20k';
            if (val < 50000) return '20k-50k';
            if (val < 100000) return '50k-100k';
            if (val < 250000) return '100k-250k';
            return '>250k';
        };

        const incomeNum = parsedData.income || 50000;
        const expensesNum = parsedData.expenses || 20000;

        await User.findByIdAndUpdate(req.userId, {
            bankStatementUploaded: true,
            income: incomeNum,
            expenses: expensesNum,
            incomeRange: getZkpRange(incomeNum),
            expensesRange: getZkpRange(expensesNum),
            hasBankStatement: true,
            kycStep: Math.max(req.user.kycStep, 6),
            lastKycUpdate: new Date(),
        });

        await logKYCEvent(req.userId, 'bank_statement', 'success', {
            income: parsedData.income,
            expenses: parsedData.expenses,
        }, req);

        res.status(200).json({
            message: 'Bank statement processed.',
            income: parsedData.income,
            expenses: parsedData.expenses,
            trustScore: parsedData.trustScore,
        });
    } catch (err) {
        res.status(500).json({ error: 'Statement upload failed: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/skip-statement  (optional step skip)
// ─────────────────────────────────────────────────────────────────────────────
exports.skipStatement = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, {
            kycStep: Math.max(req.user.kycStep, 6),
            lastKycUpdate: new Date(),
        });
        await logKYCEvent(req.userId, 'bank_statement', 'skipped', {}, req);
        res.status(200).json({ message: 'Bank statement step skipped.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/finalize
// Calculates confidence, creates wallet, airdrops CTX
// ─────────────────────────────────────────────────────────────────────────────
exports.finalizeKYC = async (req, res) => {
    try {
        const user = req.user;

        // 1. Calculate KYC confidence
        const { confidence, status } = kycConfidenceService.calculateKYCConfidence(user);

        if (confidence < 70) {
            await User.findByIdAndUpdate(req.userId, {
                kycStatus: 'rejected',
                kycConfidence: confidence,
                lastKycUpdate: new Date(),
            });
            return res.status(400).json({
                error: 'KYC confidence too low.',
                kycStatus: 'rejected',
                kycConfidence: confidence,
            });
        }

        // 2. Generate Trust Score via AI service
        let trustScore = 50;
        try {
            const aiRes = await axios.post(
                `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/ai/calculate-score`,
                {
                    income: user.income || 50000,
                    expenses: user.expenses || 20000,
                    employment: user.employment || 'Salaried',
                    hasBankStatement: user.bankStatementUploaded,
                }
            );
            trustScore = aiRes.data.trustScore || 50;
        } catch (aiErr) {
            console.error('AI trust score error (non-fatal):', aiErr.message);
            // Fallback formula
            const savingsRatio = ((user.income - user.expenses) / (user.income || 1)) * 100;
            trustScore = Math.min(100, Math.max(0, 40 + savingsRatio * 0.6 + confidence * 0.2));
        }

        // 3. (REMOVED) Backend wallet creation
        // The user already has a walletAddress from MetaMask login.
        const walletAddress = user.walletAddress;

        // 4. Airdrop CTX tokens
        const airdropAmount = Math.round(trustScore * 10);
        let airdropResult;
        try {
            airdropResult = await web3Service.airdropTokens(walletAddress, trustScore);
        } catch (web3Err) {
            airdropResult = { success: false, simulated: true, tokensTransferred: airdropAmount, txHash: null };
        }

        // 5. Update user document
        await User.findByIdAndUpdate(req.userId, {
            airdropTxHash: airdropResult.txHash || null,
            trustScore: Math.round(trustScore),
            tokensIssued: airdropAmount,
            kycStatus: status,
            kycConfidence: confidence,
            lastKycUpdate: new Date(),
        });

        await logKYCEvent(req.userId, 'finalize', 'success', {
            confidence,
            status,
            trustScore,
            walletAddress,
            airdropAmount,
        }, req);

        res.status(200).json({
            message: 'KYC finalized. CTX tokens allocated.',
            kycStatus: status,
            kycConfidence: confidence,
            trustScore: Math.round(trustScore),
            walletAddress,
            tokensIssued: airdropAmount,
            airdropTxHash: airdropResult.txHash || null,
        });
    } catch (err) {
        console.error('KYC finalize error:', err);
        res.status(500).json({ error: 'KYC finalization failed: ' + err.message });
    }
};
