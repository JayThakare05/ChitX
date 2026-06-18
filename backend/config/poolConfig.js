/**
 * Pool Timing Configuration
 * ─────────────────────────────────────────────────────────────────────
 * 🔧 THIS IS THE ONLY FILE YOU NEED TO CHANGE FOR TIMING:
 *
 *  CYCLE_DURATION_MS  — how long between each payout cycle
 *    → Currently: 1 minute  (TESTING MODE)
 *    → Production: 30 * 24 * 60 * 60 * 1000  (30 days / monthly)
 *
 *  JOIN_WINDOW_MS — how long members have to join after pool creation
 *    → Currently: 15 days
 * ─────────────────────────────────────────────────────────────────────
 */

// ── CHANGE THIS to update the payout cycle duration ──────────────────
const CYCLE_DURATION_MS = 1 * 60 * 1000; // 1 minute (TESTING) → 30 * 24 * 60 * 60 * 1000 for monthly

// ── CHANGE THIS to update the joining window ──────────────────────────
const JOIN_WINDOW_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

module.exports = { CYCLE_DURATION_MS, JOIN_WINDOW_MS };
