const express = require('express');
const router = express.Router();
const poolController = require('../controllers/poolController');

const queueController = require('../controllers/queueController');

const path = require('path');
const multer = require('multer');

// Configure disk storage for emergency documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/emergency');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const emergencyUpload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

router.post('/', poolController.createPool);
router.get('/', poolController.getAllPools);
router.delete('/:id', poolController.deletePool);
router.post('/:id/join', poolController.joinPool);
router.post('/:id/leave', poolController.leavePool);
router.post('/:id/pay-month', poolController.payMonthlyContribution);
router.get('/balance/:walletAddress', poolController.getUserBalance);
// Debug: inspect pool state + payout history
router.get('/:id/debug', poolController.debugPool);
// Force-activate a pool (for testing when auto-activation didn't fire)
router.post('/:id/force-activate', poolController.forceActivatePool);

// Dynamic Pool Routes
router.post('/bifurcate', queueController.bifurcateQueue);
router.post('/:id/simulate-month', poolController.simulateMonth);
router.post('/init-demo', poolController.initDemoPool);
router.post('/:id/emergency', emergencyUpload.single('document'), poolController.triggerEmergency);
router.post('/:id/emergency/:recordId/vote', poolController.voteOnEmergency);
router.get('/emergency/pending/:walletAddress', poolController.getPendingVotes);
router.get('/emergency-history/:walletAddress', poolController.getEmergencyHistory);

module.exports = router;
