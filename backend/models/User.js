const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // ── Traditional Auth ─────────────────────────────────────────
    email: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
        sparse: true
    },
    password: {
        type: String,
        default: null
    },
    loginType: {
        type: String,
        enum: ['METAMASK', 'TRADITIONAL'],
        default: 'METAMASK'
    },
    name: {
        type: String,
        default: null
    },
    phone: {
        type: String,
        default: null,
        sparse: true
    },

    // ── Verification Flags ───────────────────────────────────────
    phoneVerified:      { type: Boolean, default: false },
    phoneVerifiedAt:    { type: Date,    default: null  },
    emailVerified:      { type: Boolean, default: false },
    emailVerifiedAt:    { type: Date,    default: null  },

    // ── KYC: PAN ─────────────────────────────────────────────────
    panNumber:          { type: String,  default: null  }, // stored masked
    panName:            { type: String,  default: null  },
    panVerified:        { type: Boolean, default: false },
    panVerifiedAt:      { type: Date,    default: null  },

    // ── KYC: Aadhaar ─────────────────────────────────────────────
    aadhaarVerified:    { type: Boolean, default: false },
    aadhaarName:        { type: String,  default: null  },
    aadhaarPhoto:       { type: String,  default: null  }, // URL or base64
    aadhaarAddress:     { type: String,  default: null  },
    aadhaarVerifiedAt:  { type: Date,    default: null  },

    // ── KYC: Face Verification ───────────────────────────────────
    faceVerified:       { type: Boolean, default: false },
    faceSimilarity:     { type: Number,  default: 0     },
    livenessPassed:     { type: Boolean, default: false },
    faceVerifiedAt:     { type: Date,    default: null  },

    // ── KYC: Bank ────────────────────────────────────────────────
    bankVerified:       { type: Boolean, default: false },
    bankHolderName:     { type: String,  default: null  },
    bankName:           { type: String,  default: null  },
    accountMasked:      { type: String,  default: null  }, // last 4 digits
    ifsc:               { type: String,  default: null  },
    bankVerifiedAt:     { type: Date,    default: null  },

    // ── KYC: Bank Statement ──────────────────────────────────────
    bankStatementUploaded: { type: Boolean, default: false },

    // ── KYC Confidence & Status ──────────────────────────────────
    kycStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'verified', 'manual_review', 'rejected'],
        default: 'pending'
    },
    kycConfidence:  { type: Number, default: 0 },
    kycStep:        { type: Number, default: 0 }, // for resume support
    lastKycUpdate:  { type: Date,   default: null },

    // ── Risk & AML ───────────────────────────────────────────────
    riskLevel:  { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    amlScore:   { type: Number, default: 0 },

    // ── Blockchain / Wallet ──────────────────────────────────────
    walletAddress: {
        type: String,
        default: null,
        lowercase: true,
        sparse: true
    },
    walletCreated:      { type: Boolean, default: false },
    encryptedPrivateKey:{ type: String,  default: null  },
    encryptionIv:       { type: String,  default: null  },
    airdropTxHash:      { type: String,  default: null  },

    // ── Legacy / Financial ───────────────────────────────────────
    income:     { type: Number, default: 0 }, // For internal backend math
    expenses:   { type: Number, default: 0 },
    incomeRange:    { type: String, default: null }, // ZKP friendly (e.g. ">20k", "50k-100k")
    expensesRange:  { type: String, default: null }, // ZKP friendly
    employment: {
        type: String,
        enum: ['Student', 'Salaried', 'Business'],
        default: 'Salaried'
    },
    hasBankStatement: { type: Boolean, default: false },
    trustScore:       { type: Number,  default: 0      },
    tokensIssued:     { type: Number,  default: 0      },

    // ── Optional: Linked External Wallet (MetaMask) ──────────────
    externalWalletAddress: { type: String, default: null, lowercase: true },

    createdAt: { type: Date, default: Date.now }
});

// Hash password before save
UserSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Password comparison helper
UserSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
