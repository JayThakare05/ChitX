import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute — Redirects to /auth if no JWT token is found in localStorage.
 * Wraps authenticated pages.
 */
export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem('chitx_token');
    const userData = JSON.parse(localStorage.getItem('chitx_user') || '{}');

    // Support legacy wallet-based sessions (backward compat)
    const hasLegacySession = userData.walletAddress && !userData.id;

    if (!token && !hasLegacySession) {
        return <Navigate to="/auth" replace />;
    }

    return children;
}
