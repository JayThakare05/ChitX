/**
 * features/emergency/services/emergencyApi.js
 * Emergency fund HTTP calls.
 */
import apiClient from '../../../shared/services/apiClient';

/**
 * Request an emergency payout from a pool.
 * Uploads a supporting document for AI verification.
 *
 * @param {string} poolId
 * @param {string} walletAddress
 * @param {string} reason
 * @param {File} documentFile - PDF, image, or text file
 */
export async function requestEmergencyPayout(poolId, walletAddress, reason, documentFile) {
  const formData = new FormData();
  formData.append('walletAddress', walletAddress);
  formData.append('reason', reason);
  formData.append('document', documentFile);

  const res = await apiClient.post(`/api/pools/${poolId}/emergency`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 45000, // AI verification can take a moment
  });
  return res.data;
}

/**
 * Get history of emergency requests for a user.
 * @param {string} walletAddress
 */
export async function getEmergencyHistory(walletAddress) {
  const res = await apiClient.get(`/api/pools/emergency-history/${walletAddress}`);
  return res.data;
}
