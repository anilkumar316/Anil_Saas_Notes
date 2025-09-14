const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('Please add JWT_SECRET to your .env file');
}

function signToken(payload) {
    const newPayload = { ...payload, userId: payload.userId.toString() };
    return jwt.sign(newPayload, JWT_SECRET, { expiresIn: '1d' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

function withAuth(requiredRole) {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication required: No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
        }
        
        req.user = decoded;

        if (requiredRole && req.user.role !== requiredRole) {
            return res.status(403).json({ message: `Forbidden: This action requires the '${requiredRole}' role.` });
        }

        next();
    };
}

module.exports = {
    signToken,
    verifyToken,
    withAuth
};