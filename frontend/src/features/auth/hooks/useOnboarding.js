/**
 * features/auth/hooks/useOnboarding.js
 *
 * Manages the multi-step onboarding flow state:
 *   Step 1: Upload bank statement OR manually enter KYC
 *   Step 2: Create wallet / retrieve key
 *   Step 3: Done — redirect to dashboard
 */
import { useState, useCallback } from 'react';
import { uploadStatement, createWallet, retrieveKey } from '../services/authApi';

export const ONBOARDING_STEPS = {
  CHOOSE_METHOD: 'CHOOSE_METHOD',  // choose CSV or manual
  UPLOAD_CSV: 'UPLOAD_CSV',
  MANUAL_KYC: 'MANUAL_KYC',
  CREATING_WALLET: 'CREATING_WALLET',
  DONE: 'DONE',
};

/**
 * Hook: useOnboarding
 *
 * Usage:
 *   const {
 *     step, parsedData, walletResult,
 *     loading, error,
 *     submitStatement, submitManualKYC,
 *     submitCreateWallet, submitRetrieveKey,
 *     goToStep,
 *   } = useOnboarding();
 */
export function useOnboarding() {
  const [step, setStep] = useState(ONBOARDING_STEPS.CHOOSE_METHOD);
  const [parsedData, setParsedData] = useState(null);   // from CSV parse
  const [walletResult, setWalletResult] = useState(null); // from createWallet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const goToStep = useCallback((s) => setStep(s), []);

  /**
   * Upload bank statement CSV → get AI-parsed income/expenses/trustScore
   */
  const submitStatement = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const data = await uploadStatement(file);
      setParsedData(data);
      setStep(ONBOARDING_STEPS.CREATING_WALLET);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Submit manually entered KYC data (no CSV)
   */
  const submitManualKYC = useCallback((kyc) => {
    // Manual KYC is handled by the AI /calculate-score endpoint,
    // called directly in the AuthFlow page. Here we just store the data.
    setParsedData(kyc);
    setStep(ONBOARDING_STEPS.CREATING_WALLET);
  }, []);

  /**
   * Create a new wallet with the parsed financial data + user identity
   */
  const submitCreateWallet = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createWallet(payload);
      setWalletResult(result);
      setStep(ONBOARDING_STEPS.DONE);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Retrieve existing wallet key using name + phone
   */
  const submitRetrieveKey = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const result = await retrieveKey(credentials);
      setWalletResult(result);
      setStep(ONBOARDING_STEPS.DONE);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    step,
    parsedData,
    walletResult,
    loading,
    error,
    goToStep,
    submitStatement,
    submitManualKYC,
    submitCreateWallet,
    submitRetrieveKey,
  };
}
