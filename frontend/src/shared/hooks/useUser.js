/**
 * shared/hooks/useUser.js
 * 
 * Provides the current logged-in user from localStorage
 * and exposes a refreshProfile() function.
 * Re-exports useAuth for convenience.
 */
export { useAuth, getStoredUser, getStoredWallet } from '../../features/auth/hooks/useAuth';
