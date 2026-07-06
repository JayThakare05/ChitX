const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const { protect } = require('../src/middleware/authMiddleware');

// Multer setup for memory storage (we will forward the buffer to Python)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ══════════════════════════════════════════════════════════════════════════════
//  NEW — Web3 Native Auth (MetaMask)
// ══════════════════════════════════════════════════════════════════════════════

// @route   POST /api/auth/metamask
// @desc    Login or register via MetaMask signature (returns JWT)
// @access  Public
router.post('/metamask', authController.metamaskLogin);

// @route   GET /api/auth/me
// @desc    Get current user from JWT
// @access  Protected
router.get('/me', protect, authController.getMe);

// ══════════════════════════════════════════════════════════════════════════════
//  LEGACY — Wallet-based auth (backward compatibility, kept intact)
// ══════════════════════════════════════════════════════════════════════════════

// @route   POST /api/auth/upload-statement
// @desc    Upload Bank Statement (CSV) to get AI-parsed Income/Expenses
// @access  Public
router.post('/upload-statement', upload.single('statement'), authController.uploadStatement);

// @route   POST /api/auth/create-wallet
// @desc    Create a new wallet with parsed data, encrypt via Name+Phone
// @access  Public
router.post('/create-wallet', authController.createWallet);

// @route   POST /api/auth/retrieve-key
// @desc    Retrieve unencrypted private key using Name+Phone
// @access  Public
router.post('/retrieve-key', authController.retrieveKey);

// @route   POST /api/auth/onboarding
// @desc    Legacy onboarding (backward compatibility)
// @access  Public
router.post('/onboarding', authController.onboarding);

// @route   POST /api/auth/login-wallet
// @desc    Login with MetaMask wallet address (legacy)
// @access  Public
router.post('/login-wallet', authController.loginWithWallet);

// @route   GET /api/auth/profile/:walletAddress
// @desc    Get user profile by wallet
// @access  Public
router.get('/profile/:walletAddress', authController.getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Public
router.put('/profile', authController.updateProfile);

module.exports = router;
