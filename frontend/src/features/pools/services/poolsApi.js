/**
 * features/pools/services/poolsApi.js
 * All HTTP calls related to pools, simulation, and queue bifurcation.
 */
import apiClient from '../../../shared/services/apiClient';

// ── Pool CRUD ───────────────────────────────────────────────────────────────

export async function getAllPools() {
  const res = await apiClient.get('/api/pools');
  return res.data; // { pools: [...] }
}

export async function createPool(payload) {
  const res = await apiClient.post('/api/pools', payload);
  return res.data;
}

export async function deletePool(poolId, walletAddress) {
  const res = await apiClient.delete(`/api/pools/${poolId}`, {
    data: { walletAddress },
  });
  return res.data;
}

// ── Membership ──────────────────────────────────────────────────────────────

export async function joinPool(poolId, walletAddress, txHash = null) {
  const res = await apiClient.post(`/api/pools/${poolId}/join`, {
    walletAddress,
    txHash,
  });
  return res.data;
}

export async function leavePool(poolId, walletAddress) {
  const res = await apiClient.post(`/api/pools/${poolId}/leave`, { walletAddress });
  return res.data;
}

// ── Balance ─────────────────────────────────────────────────────────────────

export async function getUserBalance(walletAddress) {
  const res = await apiClient.get(`/api/pools/balance/${walletAddress}`);
  return res.data;
}

// ── AI Simulation ────────────────────────────────────────────────────────────

/**
 * Initialise a demo simulation pool (uses CSV test data + ML models).
 * @param {'CONSTANT' | 'DYNAMIC' | 'EMERGENCY'} mode
 */
export async function initDemoPool(mode = 'CONSTANT') {
  const res = await apiClient.post('/api/pools/init-demo', { mode });
  return res.data;
}

/**
 * Simulate one month in a pool.
 * @param {string} poolId
 */
export async function simulateMonth(poolId) {
  const res = await apiClient.post(`/api/pools/${poolId}/simulate-month`);
  return res.data;
}

/**
 * Bifurcate the pool queue based on AI priority scores.
 * @param {object} payload
 */
export async function bifurcateQueue(payload) {
  const res = await apiClient.post('/api/pools/bifurcate', payload);
  return res.data;
}

// ── Emergency ───────────────────────────────────────────────────────────────

/**
 * Trigger emergency payout request for a pool member.
 * @param {string} poolId
 * @param {string} walletAddress
 * @param {string} reason
 * @param {File} documentFile
 */
export async function triggerEmergency(poolId, walletAddress, reason, documentFile) {
  const formData = new FormData();
  formData.append('walletAddress', walletAddress);
  formData.append('reason', reason);
  formData.append('document', documentFile);

  const res = await apiClient.post(`/api/pools/${poolId}/emergency`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getEmergencyHistory(walletAddress) {
  const res = await apiClient.get(`/api/pools/emergency-history/${walletAddress}`);
  return res.data;
}
