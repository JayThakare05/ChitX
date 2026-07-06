import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LandingPage from '../pages/LandingPage';
import AuthFlow from '../pages/AuthFlow';
import KYCWizard from '../pages/KYCWizard';
import Dashboard from '../pages/Dashboard';
import MyPools from '../pages/MyPools';
import JointPool from '../pages/JointPool';
import Payments from '../pages/Payments';
import TrustScoreDetails from '../pages/TrustScoreDetails';
import Settings from '../pages/Settings';
import SimulationPanel from '../pages/SimulationPanel';
import AISimulation from '../pages/AISimulation';
import EmergencyFund from '../pages/EmergencyFund';
import { AIInsightsPage, TransactionsLog, NotificationsPage } from '../pages/Placeholders';

// Shared layout
import Layout from '../components/layout/Layout';

// Auth guards
import ProtectedRoute from '../components/auth/ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />
      {/* Legacy /onboarding route redirects to /auth for backward compat */}
      <Route path="/onboarding" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthFlow />} />

      {/* ── KYC (requires login) ─────────────────────────── */}
      <Route
        path="/kyc"
        element={
          <ProtectedRoute>
            <KYCWizard />
          </ProtectedRoute>
        }
      />

      {/* ── Authenticated App (wrapped in Layout) ──────── */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/my-pools" element={
        <ProtectedRoute><Layout><MyPools /></Layout></ProtectedRoute>
      } />
      <Route path="/joint-pool" element={
        <ProtectedRoute><Layout><JointPool /></Layout></ProtectedRoute>
      } />
      <Route path="/payments" element={
        <ProtectedRoute><Layout><Payments /></Layout></ProtectedRoute>
      } />
      <Route path="/trust-score" element={
        <ProtectedRoute><Layout><TrustScoreDetails /></Layout></ProtectedRoute>
      } />
      <Route path="/emergency-fund" element={
        <ProtectedRoute><Layout><EmergencyFund /></Layout></ProtectedRoute>
      } />
      <Route path="/ai-insights" element={
        <ProtectedRoute><Layout><AIInsightsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute><Layout><TransactionsLog /></Layout></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>
      } />
      <Route path="/pool-simulator" element={
        <ProtectedRoute><Layout><SimulationPanel /></Layout></ProtectedRoute>
      } />
      <Route path="/massive-pooling" element={
        <ProtectedRoute><Layout><AISimulation /></Layout></ProtectedRoute>
      } />

      {/* ── Fallback ──────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
