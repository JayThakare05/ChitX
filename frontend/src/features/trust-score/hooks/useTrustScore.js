/**
 * features/trust-score/hooks/useTrustScore.js
 * Fetches and manages trust score and oracle insights state.
 */
import { useState, useCallback } from 'react';
import { getOracleInsights } from '../services/trustApi';
import { getStoredUser } from '../../auth/hooks/useAuth';

export function useTrustScore() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = getStoredUser();

  /**
   * Fetch personalised AI insights based on the stored user profile.
   * Pass optional overrides to use different data than stored.
   */
  const fetchInsights = useCallback(async (overrides = {}) => {
    if (!user) {
      setError('No user profile found. Please log in.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        trustScore: user.trustScore ?? 0,
        income: user.income ?? 0,
        expenses: user.expenses ?? 0,
        employment: user.employment ?? 'Salaried',
        ctxBalance: user.tokensIssued ?? 0,
        poolsJoined: user.poolsJoined ?? 0,
        hasBankStatement: user.hasBankStatement ?? false,
        walletAddress: user.walletAddress ?? '',
        name: user.name ?? 'Member',
        ...overrides,
      };
      const data = await getOracleInsights(payload);
      setInsights(data.insights || []);
      return data.insights;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { insights, loading, error, fetchInsights };
}
