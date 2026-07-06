/**
 * Aadhaar eKYC Service — Mock Implementation
 * 
 * Interface designed for easy swap to real providers:
 * - UIDAI (official): Requires licensed ASA/KUA
 * - Digio: https://digio.in/aadhaar-esign
 * - Karza Aadhaar: https://karza.in/aadhaar-verification
 * 
 * ⚠️  NEVER use real Aadhaar numbers without UIDAI authorization.
 */

/**
 * Initiate Aadhaar OTP (sends OTP to registered mobile)
 * @param {string} aadhaarNumber - 12-digit Aadhaar number
 * @returns {{ success: boolean, transactionId?: string, error?: string }}
 */
async function initiateAadhaarOTP(aadhaarNumber) {
    const cleaned = aadhaarNumber.replace(/\s+/g, '');
    
    if (!/^\d{12}$/.test(cleaned)) {
        return { success: false, error: 'Invalid Aadhaar number. Must be 12 digits.' };
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    console.log(`🆔 [AADHAAR SERVICE MOCK] Sending OTP for Aadhaar: XXXX XXXX ${cleaned.slice(-4)}`);

    // In production, this triggers the UIDAI OTP flow
    const transactionId = `TXN${Date.now()}`;
    return { success: true, transactionId, message: 'OTP sent to Aadhaar-registered mobile number' };
}

/**
 * Verify Aadhaar with OTP
 * @param {string} aadhaarNumber
 * @param {string} otp
 * @param {string} transactionId
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function verifyAadhaar(aadhaarNumber, otp, transactionId) {
    const cleaned = aadhaarNumber.replace(/\s+/g, '');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // MOCK bypass: accept "123456"
    if (process.env.NODE_ENV !== 'production' && otp === '123456') {
        console.log(`✅ [AADHAAR SERVICE MOCK] Verified Aadhaar XXXX XXXX ${cleaned.slice(-4)}`);
        return {
            success: true,
            data: {
                aadhaarNumber: cleaned,
                name: 'Rajesh Kumar Sharma',        // matches PAN name in mock
                dateOfBirth: '1990-05-15',
                gender: 'M',
                address: '123, MG Road, Bengaluru, Karnataka - 560001',
                // Mock base64 Aadhaar photo (placeholder URL)
                photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chitx-kyc-user',
                pincode: '560001',
                state: 'Karnataka'
            }
        };
    }

    return { success: false, error: 'Invalid OTP. Please try again.' };
}

module.exports = { initiateAadhaarOTP, verifyAadhaar };
