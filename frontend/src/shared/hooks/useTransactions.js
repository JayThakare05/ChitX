/**
 * shared/hooks/useTransactions.js
 * Fetches transaction history for the current user.
 */
import { useState, useCallback, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { getStoredWallet } from '../../features/auth/hooks/useAuth';

export function useTransactions(limit = 50) {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalTransactions: 0, totalDebits: 0, totalCredits: 0, netFlow: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const wallet = getStoredWallet();

  const fetchTransactions = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/transactions/${wallet}?limit=${limit}`);
      setTransactions(res.data.transactions || []);
      setStats(res.data.stats || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  /**
   * Manually record a transaction (airdrop, jackpot, etc.)
   */
  const recordTransaction = useCallback(async (payload) => {
    try {
      const res = await apiClient.post('/api/transactions', payload);
      await fetchTransactions();
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchTransactions]);

  return { transactions, stats, loading, error, fetchTransactions, recordTransaction };
}
