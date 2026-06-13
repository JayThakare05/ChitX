/**
 * features/pools/hooks/useSimulation.js
 * Manages the AI pool simulation state machine.
 */
import { useState, useCallback } from 'react';
import { initDemoPool, simulateMonth } from '../services/poolsApi';

export function useSimulation() {
  const [pool, setPool] = useState(null);
  const [monthLog, setMonthLog] = useState([]); // array of monthly results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Initialise a fresh demo pool.
   * @param {'CONSTANT' | 'DYNAMIC' | 'EMERGENCY'} mode
   */
  const initPool = useCallback(async (mode = 'CONSTANT') => {
    setLoading(true);
    setError(null);
    setMonthLog([]);
    try {
      const data = await initDemoPool(mode);
      setPool(data.pool);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Run one simulation month on the current pool.
   */
  const runMonth = useCallback(async () => {
    if (!pool?._id) throw new Error('No pool initialised. Run initPool first.');
    setLoading(true);
    setError(null);
    try {
      const result = await simulateMonth(pool._id);
      setMonthLog((prev) => [...prev, result]);
      // Sync pool state (status, contributions, etc.)
      setPool((prev) => ({ ...prev, ...result.pool }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [pool]);

  const resetSimulation = useCallback(() => {
    setPool(null);
    setMonthLog([]);
    setError(null);
  }, []);

  return { pool, monthLog, loading, error, initPool, runMonth, resetSimulation };
}
