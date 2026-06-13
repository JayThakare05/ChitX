/**
 * features/trust-score/services/trustApi.js
 * HTTP calls for trust score and oracle insights.
 */
import apiClient from '../../../shared/services/apiClient';

const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

import axios from 'axios';

const aiClient = axios.create({ baseURL: AI_URL, timeout: 60000 });

// ── Trust Score ─────────────────────────────────────────────────────────────

/**
 * Get AI oracle insights for the current user.
 * @param {object} oraclePayload - { trustScore, income, expenses, employment, ctxBalance, poolsJoined, hasBankStatement, walletAddress, name }
 */
export async function getOracleInsights(oraclePayload) {
  const res = await aiClient.post('/ai/oracle-insights', oraclePayload);
  return res.data; // { ok, insights: [...] }
}

/**
 * Quick trust score calculation (no CSV — uses KYC form data).
 * @param {{ income, expenses, employment, hasBankStatement }} kycData
 */
export async function calculateQuickScore(kycData) {
  const res = await aiClient.post('/ai/calculate-score', kycData);
  return res.data; // { trustScore, analysis }
}
