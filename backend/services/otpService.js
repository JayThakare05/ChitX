/**
 * OTP Service — Mock Implementation
 * 
 * Interface designed for easy swap to real providers:
 * - Twilio Verify: change sendOTP/verifyOTP to use Twilio SDK
 * - MSG91: replace with MSG91 OTP API
 * - AWS SNS: replace with SNS publish
 * 
 * For development: any 6-digit code "123456" is accepted.
 */

// In-memory OTP store (replace with Redis in production)
const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to phone number
 * @param {string} phone - Phone number (with or without country code)
 * @returns {{ success: boolean, message: string, otp?: string }}
 */
async function sendOTP(phone) {
    const normalizedPhone = phone.replace(/\s+/g, '').replace(/^0/, '+91');
    const otp = generateOTP();
    
    // Store with expiry timestamp
    otpStore.set(normalizedPhone, {
        otp,
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0
    });

    // ── MOCK: Log OTP to console (remove in production) ──
    console.log(`📱 [OTP SERVICE MOCK] Phone: ${normalizedPhone} | OTP: ${otp}`);
    
    // ── PRODUCTION: Uncomment and configure Twilio ──
    // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
    // await twilio.messages.create({
    //     body: `Your ChitX OTP is ${otp}. Valid for 10 minutes. Do not share.`,
    //     from: process.env.TWILIO_PHONE,
    //     to: normalizedPhone
    // });

    return {
        success: true,
        message: `OTP sent to ${normalizedPhone.slice(0, 4)}****${normalizedPhone.slice(-2)}`,
        // Only expose OTP in development mode
        ...(process.env.NODE_ENV !== 'production' && { devOtp: otp })
    };
}

/**
 * Verify OTP
 * @param {string} phone
 * @param {string} code - 6-digit code provided by user
 * @returns {{ success: boolean, message: string }}
 */
function verifyOTP(phone, code) {
    const normalizedPhone = phone.replace(/\s+/g, '').replace(/^0/, '+91');
    const stored = otpStore.get(normalizedPhone);

    // MOCK bypass: accept "123456" always in dev
    if (process.env.NODE_ENV !== 'production' && code === '123456') {
        otpStore.delete(normalizedPhone);
        return { success: true, message: 'OTP verified (dev bypass)' };
    }

    if (!stored) {
        return { success: false, message: 'No OTP found. Please request a new one.' };
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(normalizedPhone);
        return { success: false, message: 'OTP expired. Please request a new one.' };
    }

    stored.attempts += 1;
    if (stored.attempts > 5) {
        otpStore.delete(normalizedPhone);
        return { success: false, message: 'Too many attempts. Please request a new OTP.' };
    }

    if (stored.otp !== code) {
        return { success: false, message: `Incorrect OTP. ${5 - stored.attempts} attempts remaining.` };
    }

    otpStore.delete(normalizedPhone);
    return { success: true, message: 'OTP verified successfully.' };
}

module.exports = { sendOTP, verifyOTP };
