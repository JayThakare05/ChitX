/**
 * features/pools/hooks/usePools.js
 * Handles fetching, joining, leaving, and creating pools.
 */
import { useState, useCallback, useEffect } from 'react';
import { getAllPools, joinPool, leavePool, createPool, deletePool, getUserBalance } from '../services/poolsApi';
import { getStoredWallet } from '../../auth/hooks/useAuth';

export function usePools() {
  const [pools, setPools] = useState([]);
  const [balance, setBalance] = useState({ onChainBalance: 0, dbBalance: 0, trustScore: 0 });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const wallet = getStoredWallet();

  const fetchPools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPools();
      setPools(data.pools || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const data = await getUserBalance(wallet);
      setBalance(data);
    } catch (err) {
      console.warn('Balance fetch failed:', err.message);
    }
  }, [wallet]);

  useEffect(() => {
    fetchPools();
    fetchBalance();
  }, [fetchPools, fetchBalance]);

  const join = useCallback(async (poolId, txHash = null) => {
    if (!wallet) throw new Error('Wallet not connected');
    setActionLoading(true);
    setError(null);
    try {
      const data = await joinPool(poolId, wallet, txHash);
      await fetchPools();
      await fetchBalance();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [wallet, fetchPools, fetchBalance]);

  const leave = useCallback(async (poolId) => {
    if (!wallet) throw new Error('Wallet not connected');
    setActionLoading(true);
    setError(null);
    try {
      const data = await leavePool(poolId, wallet);
      await fetchPools();
      await fetchBalance();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [wallet, fetchPools, fetchBalance]);

  const create = useCallback(async (payload) => {
    setActionLoading(true);
    setError(null);
    try {
      const data = await createPool(payload);
      await fetchPools();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [fetchPools]);

  const remove = useCallback(async (poolId) => {
    if (!wallet) throw new Error('Wallet not connected');
    setActionLoading(true);
    setError(null);
    try {
      const data = await deletePool(poolId, wallet);
      await fetchPools();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [wallet, fetchPools]);

  return {
    pools, balance, loading, actionLoading, error,
    fetchPools, fetchBalance,
    join, leave, create, remove,
  };
}
