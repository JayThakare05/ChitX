import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LandingPage from '../pages/LandingPage';
import AuthFlow from '../pages/AuthFlow';
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

// Shared layout (still in original location until Phase 3 moves it)
import Layout from '../components/layout/Layout';

export function AppRouter() {
  return (
    <Routes>
      {/* ── Public / Onboarding ─────────────────────────── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/onboarding" element={<AuthFlow />} />

      {/* ── Authenticated App (wrapped in Layout) ──────── */}
      <Route path="/dashboard"      element={<Layout><Dashboard /></Layout>} />
      <Route path="/my-pools"       element={<Layout><MyPools /></Layout>} />
      <Route path="/joint-pool"     element={<Layout><JointPool /></Layout>} />
      <Route path="/payments"       element={<Layout><Payments /></Layout>} />
      <Route path="/trust-score"    element={<Layout><TrustScoreDetails /></Layout>} />
      <Route path="/emergency-fund" element={<Layout><EmergencyFund /></Layout>} />
      <Route path="/ai-insights"    element={<Layout><AIInsightsPage /></Layout>} />
      <Route path="/transactions"   element={<Layout><TransactionsLog /></Layout>} />
      <Route path="/notifications"  element={<Layout><NotificationsPage /></Layout>} />
      <Route path="/settings"       element={<Layout><Settings /></Layout>} />
      <Route path="/pool-simulator" element={<Layout><SimulationPanel /></Layout>} />
      <Route path="/massive-pooling" element={<Layout><AISimulation /></Layout>} />

      {/* ── Fallback ──────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
