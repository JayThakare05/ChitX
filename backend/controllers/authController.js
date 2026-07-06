const User = require('../models/User');
const BankStatement = require('../models/BankStatement');
const axios = require('axios');
const web3Service = require('../services/web3Service');
const cryptoUtils = require('../utils/cryptoUtils');
const { ethers } = require('ethers');
const FormData = require('form-data');
const crypto = require('crypto');
const { generateToken } = require('../src/middleware/authMiddleware');

// ================================================
// METAMASK LOGIN — Web3 native authentication
// ================================================
exports.metamaskLogin = async (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;

        if (!walletAddress || !signature || !message) {
            return res.status(400).json({ error: 'Wallet address, signature, and message are required.' });
        }

        // 1. Verify the signature
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(401).json({ error: 'Signature verification failed. Invalid wallet address.' });
        }

        // 2. Find or create user
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        let isNewUser = false;
        if (!user) {
            user = await User.create({
                walletAddress: walletAddress.toLowerCase(),
                loginType: 'METAMASK',
                kycStatus: 'pending',
                kycStep: 0,
                walletCreated: true // Since MetaMask IS their wallet
            });
            isNewUser = true;
        }

        // 3. Generate JWT
        const token = generateToken(user._id);

        res.status(isNewUser ? 201 : 200).json({
            message: isNewUser ? 'Account created successfully.' : 'Login successful.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                trustScore: user.trustScore,
                tokensIssued: user.tokensIssued,
                walletAddress: user.walletAddress,
                walletCreated: user.walletCreated,
                kycStatus: user.kycStatus,
                kycStep: user.kycStep,
                kycConfidence: user.kycConfidence,
                phoneVerified: user.phoneVerified,
                employment: user.employment,
                income: user.income,
                expenses: user.expenses,
                hasBankStatement: user.hasBankStatement,
                loginType: user.loginType
            }
        });
    } catch (err) {
        console.error('MetaMask login error:', err.message);
        res.status(500).json({ error: 'Authentication failed: ' + err.message });
    }
};

// ================================================
// GET ME — Return current authenticated user
// ================================================
exports.getMe = async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                trustScore: user.trustScore,
                tokensIssued: user.tokensIssued,
                walletAddress: user.walletAddress,
                walletCreated: user.walletCreated,
                kycStatus: user.kycStatus,
                kycStep: user.kycStep,
                kycConfidence: user.kycConfidence,
                phoneVerified: user.phoneVerified,
                panVerified: user.panVerified,
                aadhaarVerified: user.aadhaarVerified,
                faceVerified: user.faceVerified,
                bankVerified: user.bankVerified,
                bankStatementUploaded: user.bankStatementUploaded,
                employment: user.employment,
                income: user.income,
                expenses: user.expenses,
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

// Legacy route for direct onboarding
exports.onboarding = async (req, res) => {
    try {
        const bodyObj = req.body || {};
        let { name, phone, income, expenses, employment, hasBankStatement, walletAddress, bankStatementSessionKey } = bodyObj;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required (or body is undefined)' });
        }

        // Trust Score: Use ML model score if already provided by frontend, otherwise fallback to formula
        let trustScore = bodyObj.trustScore || 0;
        let aiAnalysis = '';
        
        if (!trustScore || trustScore <= 0) {
            // Fallback: call the old formula-based endpoint
            try {
                const aiResponse = await axios.post('http://localhost:8000/ai/calculate-score', {
                    income: parseFloat(income) || 0,
                    expenses: parseFloat(expenses) || 0,
                    employment: employment || 'Salaried',
                    hasBankStatement: Boolean(hasBankStatement)
                });
                trustScore = aiResponse.data.trustScore;
                aiAnalysis = aiResponse.data.analysis || '';
            } catch (aiErr) {
                trustScore = 50;
                aiAnalysis = 'Fallback scoring used';
            }
        } else {
            aiAnalysis = 'Trust score provided by ML model pipeline.';
            console.log(`📊 Using ML model trust score: ${trustScore}`);
        }

        const airdropAmount = trustScore * 10;
        let airdropResult;
        try {
            airdropResult = await web3Service.airdropTokens(walletAddress, trustScore);
        } catch (web3Err) {
            airdropResult = { success: false, simulated: true, txHash: null, tokensTransferred: airdropAmount };
        }

        // Save user
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (user) {
            user.name = name; user.phone = phone; user.income = income; user.expenses = expenses; user.trustScore = trustScore;
            await user.save();
        } else {
            user = new User({ name, phone, income, expenses, employment, hasBankStatement, walletAddress: walletAddress.toLowerCase(), trustScore, tokensIssued: airdropResult.tokensTransferred });
            await user.save();
        }

        // Link the bank statement record to this wallet (non-blocking)
        if (bankStatementSessionKey) {
            BankStatement.findOneAndUpdate(
                { sessionKey: bankStatementSessionKey },
                { walletAddress: walletAddress.toLowerCase() }
            ).catch(err => console.error('⚠️  Bank statement link failed (non-fatal):', err.message));
            console.log(`🔗 Bank statement session ${bankStatementSessionKey} linked to wallet ${walletAddress}`);
        }

        res.status(200).json({ message: 'Onboarding successful', trustScore, user });
    } catch (err) {
        res.status(500).json({ error: 'Server error ' + err.message });
    }
};

// MULTI-STEP 1: Upload Statement
exports.uploadStatement = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded' });
        }

        // 🖨️ Print CSV content to backend terminal
        const csvText = req.file.buffer.toString('utf-8');
        console.log('\n' + '='.repeat(60));
        console.log('📄 RECEIVED CSV FILE IN BACKEND:');
        console.log('='.repeat(60));
        console.log(csvText.substring(0, 3000));
        if (csvText.length > 3000) {
            console.log(`... [${csvText.length - 3000} more characters truncated]`);
        }
        console.log('='.repeat(60) + '\n');

        // 1. Forward the raw CSV buffer to the Python AI service
        const formData = new FormData();
        formData.append('file', req.file.buffer, { filename: req.file.originalname, contentType: 'text/csv' });

        let parsedData = { income: 50000, expenses: 20000, trustScore: 75 }; // Default fallback
        try {
            const aiResponse = await axios.post('http://localhost:8000/ai/parse-statement', formData, {
                headers: { ...formData.getHeaders() }
            });
            parsedData = aiResponse.data;
        } catch (err) {
            console.error('Python CSV parser error:', err.message);
        }

        // 2. Persist the bank statement + parsed data to MongoDB
        //    Non-blocking: a storage failure must NOT break the registration flow.
        const sessionKey = crypto.randomUUID();
        try {
            // Trim CSV to 500KB max before storing
            const safeCSV = csvText.length > 512_000 ? csvText.slice(0, 512_000) : csvText;
            await BankStatement.create({
                sessionKey,
                originalFilename: req.file.originalname || 'bank_statement.csv',
                csvContent:        safeCSV,
                parsedIncome:      parsedData.income    ?? null,
                parsedExpenses:    parsedData.expenses  ?? null,
                parsedTrustScore:  parsedData.trustScore ?? null,
                rawParsedData:     parsedData,
            });
            console.log(`💾 Bank statement stored in DB (session: ${sessionKey})`);
        } catch (dbErr) {
            // Log but DON'T fail the request — registration must continue
            console.error('⚠️  Bank statement DB save failed (non-fatal):', dbErr.message);
        }

        res.status(200).json({
            message: 'Statement parsed successfully',
            data: parsedData,
            sessionKey   // returned so frontend can link it during final KYC submission
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
};

// MULTI-STEP 2: Create Wallet
exports.createWallet = async (req, res) => {
    try {
        const { name, phone, password, income, expenses, employment, trustScore, tokensIssued } = req.body;

        if (!name || !phone || !password) {
            return res.status(400).json({ error: 'Name, phone, and password are required' });
        }

        // Check if user already exists
        let user = await User.findOne({ phone });
        if (user) {
            return res.status(400).json({ error: 'User with this phone already exists. Please Login.' });
        }

        // Generate Ethers.js Wallet
        const wallet = ethers.Wallet.createRandom();
        const privateKey = wallet.privateKey;
        const walletAddress = wallet.address;

        // Encrypt the private key securely for storage using phone and password
        const { iv, encryptedData } = cryptoUtils.encrypt(phone, password, privateKey);

        // 3. Airdrop tokens using new wallet address
        const score = trustScore || 50;
        const airdropAmount = score * 10;
        let airdropResult;
        try {
            airdropResult = await web3Service.airdropTokens(walletAddress, score);
        } catch (err) {
            airdropResult = { success: false, simulated: true, tokensTransferred: airdropAmount };
        }

        // 4. Save to User DB
        const newUser = new User({
            name,
            phone,
            income: income || 0,
            expenses: expenses || 0,
            employment: employment || 'Salaried',
            hasBankStatement: false,
            walletAddress: walletAddress.toLowerCase(),
            trustScore: score,
            tokensIssued: airdropAmount,
            encryptedPrivateKey: encryptedData,
            encryptionIv: iv
        });
        await newUser.save();

        // 5. Return UNENCRYPTED key ONE TIME to frontend
        res.status(200).json({
            message: 'Wallet created securely',
            walletAddress: walletAddress,
            privateKey: privateKey,
            trustScore: score,
            airdropAmount
        });

    } catch (err) {
        console.error('Wallet Creator Error:', err);
        res.status(500).json({ error: 'Failed to create wallet: ' + err.message });
    }
};

// RETRIEVE KEY
exports.retrieveKey = async (req, res) => {
    try {
        const { phone, password, walletAddress } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone and password are required for login.' });
        }

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ error: 'No account found for this phone number.' });
        }

        // If wallet address is provided, verify it matches
        if (walletAddress && user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(400).json({ error: 'Provided wallet address does not match account records.' });
        }

        // Decrypt the private key using phone and password
        try {
            const privateKey = cryptoUtils.decrypt(phone, password, user.encryptedPrivateKey, user.encryptionIv);
            res.status(200).json({
                message: 'Login successful. Key Decrypted.',
                privateKey: privateKey,
                address: user.walletAddress,
                trustScore: user.trustScore,
                tokensIssued: user.tokensIssued
            });
        } catch (decryptErr) {
            return res.status(401).json({ error: 'Incorrect password. Decryption failed.' });
        }
        
    } catch (error) {
        console.error('Error retrieving key:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ================================================
// LOGIN WITH WALLET — Check if MetaMask address exists in DB
// ================================================
exports.loginWithWallet = async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required.' });
        }

        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

        if (!user) {
            return res.status(404).json({ 
                error: 'Wallet not registered. You need to register your MetaMask account with ChitX first.',
                registered: false
            });
        }

        console.log(`✅ Wallet login successful: ${walletAddress} → ${user.name}`);

        res.status(200).json({
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
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ================================================
// UPDATE PROFILE
// ================================================
exports.updateProfile = async (req, res) => {
    try {
        const { walletAddress, name, phone, employment, income, expenses } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (employment !== undefined) user.employment = employment;
        if (income !== undefined) user.income = Number(income) || 0;
        if (expenses !== undefined) user.expenses = Number(expenses) || 0;

        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: 'Server error ' + err.message });
    }
};
// ================================================
// GET PROFILE BY WALLET
// ================================================
exports.getProfile = async (req, res) => {
    try {
        const walletAddress = req.params.walletAddress;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Server error ' + err.message });
    }
};
