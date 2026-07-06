/**
 * PAN Verification Service — Mock Implementation
 * 
 * Interface designed for easy swap to real providers:
 * - Karza: https://karza.in/pan-verification
 * - IDfy: https://idfy.com/pan-verification
 * - Digio: https://digio.in
 * 
 * Real providers require API key + webhook setup in .env
 */

/**
 * Verify PAN Number
 * @param {string} panNumber - 10-char PAN (ABCDE1234F)
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function verifyPAN(panNumber) {
    const normalized = panNumber.toUpperCase().trim();

    // PAN format validation: 5 letters + 4 digits + 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(normalized)) {
        return { success: false, error: 'Invalid PAN format. Expected: ABCDE1234F' };
    }

    // ── MOCK: Simulate API delay ──
    await new Promise(resolve => setTimeout(resolve, 800));

    // ── MOCK: Return realistic test data ──
    // In production, replace this block with actual API call
    console.log(`🪪 [PAN SERVICE MOCK] Verifying PAN: ${normalized}`);

    const mockResponse = {
        panNumber: normalized,
        panHolderName: 'Rajesh Kumar Sharma',       // matches Aadhaar in mock
        dateOfBirth: '1990-05-15',
        panStatus: 'VALID',
        panType: 'Individual',
        aadhaarLinked: true
    };

    // ── PRODUCTION: Uncomment and configure Karza ──
    // const response = await axios.post('https://api.karza.in/v2/pan/verify', {
    //     pan: normalized
    // }, {
    //     headers: { 'x-karza-key': process.env.KARZA_API_KEY }
    // });
    // return { success: true, data: response.data };

    return { success: true, data: mockResponse };
}

module.exports = { verifyPAN };
