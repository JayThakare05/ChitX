/**
 * Bank Account Verification Service — Mock Implementation
 * 
 * Interface designed for easy swap to real providers:
 * - RazorpayX Fund Account Validation
 * - Cashfree: https://cashfree.com/bank-account-verification
 * - Digio Bank Verification
 * - NPCI Penny Drop (₹1 credit/debit verification)
 * 
 * Real providers do a ₹1 penny drop to verify account is active.
 */

/**
 * Verify bank account via penny drop
 * @param {string} accountNumber - Bank account number
 * @param {string} ifsc - IFSC code (11 chars, e.g. HDFC0001234)
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function verifyBankAccount(accountNumber, ifsc) {
    // Input validation
    if (!accountNumber || accountNumber.length < 9 || accountNumber.length > 18) {
        return { success: false, error: 'Invalid account number. Must be 9-18 digits.' };
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc.toUpperCase())) {
        return { success: false, error: 'Invalid IFSC code format. Example: HDFC0001234' };
    }

    // Simulate penny drop delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log(`🏦 [BANK SERVICE MOCK] Verifying account: XXXXXXXX${accountNumber.slice(-4)}, IFSC: ${ifsc}`);

    // Extract bank name from IFSC prefix (first 4 chars)
    const bankMap = {
        'HDFC': 'HDFC Bank',
        'ICIC': 'ICICI Bank',
        'SBIN': 'State Bank of India',
        'AXIS': 'Axis Bank',
        'KKBK': 'Kotak Mahindra Bank',
        'PUNB': 'Punjab National Bank',
        'UTIB': 'Axis Bank',
        'BARB': 'Bank of Baroda',
        'CNRB': 'Canara Bank',
        'UBIN': 'Union Bank of India',
    };
    const bankPrefix = ifsc.slice(0, 4).toUpperCase();
    const bankName = bankMap[bankPrefix] || 'IndusInd Bank';

    // ── MOCK: Return realistic data ──
    return {
        success: true,
        data: {
            accountNumber,
            accountMasked: `XXXXXXXX${accountNumber.slice(-4)}`,
            ifsc: ifsc.toUpperCase(),
            bankName,
            branchName: 'Main Branch',
            accountHolderName: 'Rajesh Kumar Sharma', // matches PAN + Aadhaar in mock
            accountStatus: 'ACTIVE',
            accountType: 'SAVINGS',
            pennyDropVerified: true
        }
    };

    // ── PRODUCTION: RazorpayX example ──
    // const response = await axios.post(
    //     'https://api.razorpay.com/v1/fund_accounts/validations',
    //     {
    //         account_number: process.env.RAZORPAY_ACCOUNT,
    //         fund_account: {
    //             account_type: 'bank_account',
    //             bank_account: { name: 'Account Holder', ifsc, account_number: accountNumber }
    //         },
    //         amount: 100,  // paise = ₹1
    //         currency: 'INR',
    //         notes: {}
    //     },
    //     { auth: { username: process.env.RAZORPAY_KEY, password: process.env.RAZORPAY_SECRET } }
    // );
}

module.exports = { verifyBankAccount };
