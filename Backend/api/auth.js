const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../lib/db');
const { signToken } = require('../lib/auth');
const router = express.Router();

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await db.users.findByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const tenant = await db.tenants.find(user.tenantId);
    const payload = {
        userId: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: tenant._id,
    };
    const token = signToken(payload);
    const userForClient = { ...payload, userId: payload.userId.toString() };
    res.status(200).json({ token, user: userForClient });
});

module.exports = router;