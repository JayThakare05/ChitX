/**
 * features/auth/services/authApi.js
 * 
 * All HTTP calls related to user authentication, onboarding,
 * wallet management, and profile. Components/hooks must use
 * these functions instead of calling apiClient directly.
 */
import apiClient from '../../../shared/services/apiClient';

// ──────────────────────────────────────────────────────────────────────────
// Statement Upload (Step 1 of onboarding — bank CSV → AI trust score)
// ──────────────────────────────────────────────────────────────────────────
/**
 * Upload a bank statement CSV to the backend.
 * Backend forwards it to the AI service for parsing.
 * @param {File} file - CSV file from the user's input
 * @returns {{ income, expenses, trustScore, cibilScore, analysis }}
 */
export async function uploadStatement(file) {
  const formData = new FormData();
  formData.append('statement', file);

  const res = await apiClient.post('/api/auth/upload-statement', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Wallet Creation (Step 2 — register user with parsed financial data)
// ──────────────────────────────────────────────────────────────────────────
/**
 * Create a new on-chain wallet and store user profile in DB.
 * @param {{ name, phone, income, expenses, employment, trustScore, hasBankStatement }} payload
 * @returns {{ walletAddress, privateKey, user }}
 */
export async function createWallet(payload) {
  const res = await apiClient.post('/api/auth/create-wallet', payload);
  return res.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Key Retrieval (wallet recovery via name + phone)
// ──────────────────────────────────────────────────────────────────────────
/**
 * Retrieve encrypted private key using name and phone.
 * @param {{ name, phone }} credentials
 * @returns {{ privateKey, walletAddress }}
 */
export async function retrieveKey(credentials) {
  const res = await apiClient.post('/api/auth/retrieve-key', credentials);
  return res.data;
}

// ──────────────────────────────────────────────────────────────────────────
// MetaMask Login (check if wallet address is registered)
// ──────────────────────────────────────────────────────────────────────────
/**
 * Login using MetaMask wallet address.
 * @param {string} walletAddress
 * @returns {{ user, message }}
 */
export async function loginWithWallet(walletAddress) {
  const res = await apiClient.post('/api/auth/login', { walletAddress });
  return res.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Profile
// ──────────────────────────────────────────────────────────────────────────
/**
 * Get user profile by wallet address.
 * @param {string} walletAddress
 */
export async function getProfile(walletAddress) {
  const res = await apiClient.get(`/api/auth/profile/${walletAddress}`);
  return res.data;
}

/**
 * Update user profile fields.
 * @param {object} updates - Partial user fields to update
 */
export async function updateProfile(updates) {
  const res = await apiClient.put('/api/auth/profile', updates);
  return res.data;
}
