const axios = require('axios');
const FormData = require('form-data');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * HTTP client for the Python FastAPI AI Oracle service.
 * All backend → AI Service calls must go through here.
 */
const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 60000, // 60s — ML + Groq can be slow
});

// ──────────────────────────────────────────────────────────────────────────
// Statement parsing (CSV → income, expenses, trust score)
// ──────────────────────────────────────────────────────────────────────────
async function parseStatement(fileBuffer, originalname) {
  const form = new FormData();
  form.append('file', fileBuffer, { filename: originalname || 'statement.csv' });
  const res = await aiClient.post('/ai/parse-statement', form, {
    headers: form.getHeaders(),
  });
  return res.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Quick score (manual KYC — no CSV)
// ──────────────────────────────────────────────────────────────────────────
async function calculateScore(kycData) {
  const res = await aiClient.post('/ai/calculate-score', kycData);
  return res.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Oracle insights (personalised AI advice)
// ──────────────────────────────────────────────────────────────────────────
async function getOracleInsights(oraclePayload) {
  const res = await aiClient.post('/ai/oracle-insights', oraclePayload);
  return res.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Emergency document verification
// ──────────────────────────────────────────────────────────────────────────
async function verifyEmergencyDoc(fileStream) {
  const form = new FormData();
  form.append('file', fileStream);
  const res = await aiClient.post('/ai/verify-emergency', form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });
  return res.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Global chatbot
// ──────────────────────────────────────────────────────────────────────────
async function chat(message, history = [], context = {}) {
  const res = await aiClient.post('/ai/global-chat', { message, history, context });
  return res.data;
}

module.exports = { parseStatement, calculateScore, getOracleInsights, verifyEmergencyDoc, chat };
