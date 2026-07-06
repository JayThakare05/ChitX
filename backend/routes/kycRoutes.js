const express = require('express');
const router = express.Router();
const multer = require('multer');
const kycController = require('../controllers/kycController');
const { protect } = require('../src/middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// All KYC routes require authentication
router.use(protect);

// ── Status ────────────────────────────────────────────────────────────────────
// GET /api/kyc/status
router.get('/status', kycController.getKYCStatus);

// ── Step 1: Phone OTP ─────────────────────────────────────────────────────────
// POST /api/kyc/send-otp
router.post('/send-otp', kycController.sendOTP);

// POST /api/kyc/verify-otp
router.post('/verify-otp', kycController.verifyOTP);

// ── Step 2: PAN Verification ──────────────────────────────────────────────────
// POST /api/kyc/verify-pan
router.post('/verify-pan', kycController.verifyPAN);

// ── Step 3: Aadhaar eKYC ─────────────────────────────────────────────────────
// POST /api/kyc/initiate-aadhaar-otp
router.post('/initiate-aadhaar-otp', kycController.initiateAadhaarOTP);

// POST /api/kyc/verify-aadhaar
router.post('/verify-aadhaar', kycController.verifyAadhaar);

// ── Step 4: Face Verification ─────────────────────────────────────────────────
// POST /api/kyc/verify-face
router.post('/verify-face', kycController.verifyFace);

// ── Step 5: Bank Account ──────────────────────────────────────────────────────
// POST /api/kyc/verify-bank
router.post('/verify-bank', kycController.verifyBank);

// ── Step 6: Bank Statement (optional) ────────────────────────────────────────
// POST /api/kyc/upload-statement
router.post('/upload-statement', upload.single('statement'), kycController.uploadStatement);

// POST /api/kyc/skip-statement
router.post('/skip-statement', kycController.skipStatement);

// ── Finalize KYC ─────────────────────────────────────────────────────────────
// POST /api/kyc/finalize
router.post('/finalize', kycController.finalizeKYC);

module.exports = router;
