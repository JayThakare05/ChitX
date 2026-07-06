const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'chitx_jwt_dev_secret_change_in_production';

/**
 * Protect routes — verifies JWT from Authorization header.
 * Attaches req.user (full document) and req.userId.
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;

        // Attach full user (without password)
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ error: 'User not found. Token invalid.' });
        }

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token invalid or expired.' });
    }
};

/**
 * Generate a signed JWT
 * @param {string} userId - MongoDB ObjectId
 * @param {string} [expiresIn='7d']
 */
function generateToken(userId, expiresIn = '7d') {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn });
}

module.exports = { protect, generateToken };
