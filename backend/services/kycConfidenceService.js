/**
 * KYC Confidence Score Service
 * 
 * Calculates a composite confidence score based on completed verification steps.
 * 
 * Scoring Breakdown:
 *   Phone OTP     → 10 points
 *   PAN           → 20 points
 *   Aadhaar       → 25 points
 *   Face Match    → 25 points
 *   Bank Account  → 20 points
 *   ─────────────────────────
 *   Total         = 100 points
 * 
 * Classification:
 *   90-100 → VERIFIED
 *   70-89  → MANUAL_REVIEW
 *   <70    → REJECTED
 */

const SCORE_WEIGHTS = {
    phone:   10,
    pan:     20,
    aadhaar: 25,
    face:    25,
    bank:    20,
};

const KYC_STATUS = {
    VERIFIED:       'verified',
    MANUAL_REVIEW:  'manual_review',
    REJECTED:       'rejected',
    IN_PROGRESS:    'in_progress',
    PENDING:        'pending',
};

/**
 * Calculate KYC confidence score
 * @param {object} user - User mongoose document
 * @returns {{ confidence: number, status: string, breakdown: object }}
 */
function calculateKYCConfidence(user) {
    let score = 0;
    const breakdown = {};

    if (user.phoneVerified) {
        score += SCORE_WEIGHTS.phone;
        breakdown.phone = SCORE_WEIGHTS.phone;
    }
    if (user.panVerified) {
        score += SCORE_WEIGHTS.pan;
        breakdown.pan = SCORE_WEIGHTS.pan;
    }
    if (user.aadhaarVerified) {
        score += SCORE_WEIGHTS.aadhaar;
        breakdown.aadhaar = SCORE_WEIGHTS.aadhaar;
    }
    if (user.faceVerified && user.livenessPassed) {
        score += SCORE_WEIGHTS.face;
        breakdown.face = SCORE_WEIGHTS.face;
    }
    if (user.bankVerified) {
        score += SCORE_WEIGHTS.bank;
        breakdown.bank = SCORE_WEIGHTS.bank;
    }

    let status;
    if (score >= 90) {
        status = KYC_STATUS.VERIFIED;
    } else if (score >= 70) {
        status = KYC_STATUS.MANUAL_REVIEW;
    } else {
        status = KYC_STATUS.REJECTED;
    }

    return { confidence: score, status, breakdown, maxScore: 100 };
}

/**
 * Check whether name cross-validation passes
 * PAN Name ↔ Aadhaar Name ↔ Bank Holder Name
 * If any mismatch, flag for manual review.
 * 
 * @param {string} panName
 * @param {string} aadhaarName
 * @param {string} bankHolderName
 * @returns {{ passed: boolean, mismatches: string[] }}
 */
function crossValidateNames(panName, aadhaarName, bankHolderName) {
    const normalize = (name) =>
        (name || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

    const pan = normalize(panName);
    const aadhaar = normalize(aadhaarName);
    const bank = normalize(bankHolderName);

    const mismatches = [];

    // Allow partial matches (first word must match)
    const firstWordMatch = (a, b) => a.split(' ')[0] === b.split(' ')[0];

    if (pan && aadhaar && !firstWordMatch(pan, aadhaar)) {
        mismatches.push('PAN name does not match Aadhaar name');
    }
    if (pan && bank && !firstWordMatch(pan, bank)) {
        mismatches.push('PAN name does not match Bank account holder name');
    }

    return { passed: mismatches.length === 0, mismatches };
}

module.exports = {
    calculateKYCConfidence,
    crossValidateNames,
    KYC_STATUS,
    SCORE_WEIGHTS
};
