require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectDB } = require('./src/config/database');
const { errorHandler } = require('./src/middleware/errorHandler');
const web3Service = require('./services/web3Service');
const { startLifecycleEngine } = require('./services/poolLifecycleService');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/kyc',          require('./routes/kycRoutes'));
app.use('/api/pools',        require('./routes/poolRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const treasuryInfo = await web3Service.getTreasuryInfo();
  res.status(200).json({
    status: 'running',
    service: 'ChitX Backend',
    blockchain: treasuryInfo,
    timestamp: new Date().toISOString(),
  });
});

// ── Trigger test ─────────────────────────────────────────────────────────────
app.post('/api/trigger', (req, res) => {
  console.log('Backend: Trigger Test');
  res.status(200).json({ message: 'Bridge working' });
});

// ── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();

  web3Service.init()
    .then(() => console.log('🔗 Web3Service initialization complete'))
    .catch((err) => console.error('⚠️  Web3Service init error (non-fatal):', err.message));

  // Start the Pool Lifecycle Engine (handles expiry + auto payouts)
  startLifecycleEngine();

  app.listen(PORT, () => {
    console.log(`🚀 ChitX Backend running on http://localhost:${PORT}`);
  });
}

start();
