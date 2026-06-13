/**
 * features/auth/hooks/useAuth.js
 *
 * Manages wallet-based login state across the app.
 * Reads/writes wallet address to localStorage and
 * provides helpers for login, logout, and profile refresh.
 */
import { useState, useCallback } from 'react';
import { loginWithWallet, getProfile } from '../services/authApi';

const WALLET_KEY = 'chitx_wallet';
const USER_KEY = 'chitx_user';

/**
 * Returns the currently stored wallet address (or null).
 */
export function getStoredWallet() {
  return localStorage.getItem(WALLET_KEY) || null;
}

/**
 * Returns the currently stored user profile (or null).
 */
export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Hook: useAuth
 *
 * Usage:
 *   const { user, wallet, loading, error, login, logout, refreshProfile } = useAuth();
 */
export function useAuth() {
  const [wallet, setWallet] = useState(() => getStoredWallet());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Login with a wallet address.
   * Calls the backend, stores result in localStorage.
   */
  const login = useCallback(async (walletAddress) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginWithWallet(walletAddress);
      const profile = data.user || data;
      localStorage.setItem(WALLET_KEY, walletAddress.toLowerCase());
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
      setWallet(walletAddress.toLowerCase());
      setUser(profile);
      return profile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Re-fetch the user profile from the backend and update localStorage.
   */
  const refreshProfile = useCallback(async () => {
    const storedWallet = getStoredWallet();
    if (!storedWallet) return;
    setLoading(true);
    try {
      const data = await getProfile(storedWallet);
      const profile = data.user || data;
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
      setUser(profile);
      return profile;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear all local auth state.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(WALLET_KEY);
    localStorage.removeItem(USER_KEY);
    setWallet(null);
    setUser(null);
  }, []);

  return { wallet, user, loading, error, login, logout, refreshProfile };
}
