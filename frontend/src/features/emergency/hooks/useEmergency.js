/**
 * features/emergency/hooks/useEmergency.js
 * Manages emergency fund request state.
 */
import { useState, useCallback } from 'react';
import { requestEmergencyPayout, getEmergencyHistory } from '../services/emergencyApi';
import { getStoredWallet } from '../../auth/hooks/useAuth';

export function useEmergency() {
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const wallet = getStoredWallet();

  const fetchHistory = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const data = await getEmergencyHistory(wallet);
      setHistory(data.records || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  const submitRequest = useCallback(async (poolId, reason, documentFile) => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await requestEmergencyPayout(poolId, wallet, reason, documentFile);
      setResult(data);
      await fetchHistory();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet, fetchHistory]);

  return { history, result, loading, error, fetchHistory, submitRequest };
}
