const express = require('express');
const { db } = require('../lib/db');
const { withAuth } = require('../lib/auth');
const router = express.Router();

// This route allows an authenticated Admin user to upgrade their tenant's plan.
// POST /api/tenants/:slug/upgrade
router.post('/:slug/upgrade', withAuth('Admin'), async (req, res) => {
    // Get the tenant's unique identifier from the URL
    const { slug } = req.params;
    
    // Get the logged-in user's tenant identifier from their token
    const { tenantSlug } = req.user;

    // --- Security Check ---
    // Ensure an Admin can only upgrade their OWN tenant.
    if (slug !== tenantSlug) {
        return res.status(403).json({ message: "Forbidden: You cannot upgrade another tenant." });
    }
    
    // Call the database function to update the plan to 'pro'
    const tenant = await db.tenants.upgrade(slug);

    // If the tenant wasn't found or the update failed, send a 404 error
    if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found or upgrade failed.' });
    }

    // If successful, send back a confirmation message
    return res.status(200).json({ message: `Tenant ${tenant.name} successfully upgraded to Pro plan.` });
});

module.exports = router;