const express = require('express');
const { db } = require('../lib/db');
const { withAuth } = require('../lib/auth');
const router = express.Router();

router.use(withAuth());

router.get('/', async (req, res) => {
    const { tenantId } = req.user;
    const notes = await db.notes.findByTenant(tenantId);
    res.status(200).json(notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.post('/', async (req, res) => {
    const { tenantId } = req.user;
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ message: 'Note content cannot be empty.' });
    }
    const tenant = await db.tenants.find(tenantId);
    if (tenant.plan === 'free') {
        const noteCount = await db.notes.countByTenant(tenantId);
        if (noteCount >= 3) {
            return res.status(403).json({ message: 'Free plan limit of 3 notes reached. Please upgrade.' });
        }
    }
    const newNote = await db.notes.create({ content, userId: req.user.userId, tenantId });
    res.status(201).json(newNote);
});

router.get('/:id', async (req, res) => {
    const { tenantId } = req.user;
    const note = await db.notes.findById(req.params.id);
    if (!note || note.tenantId !== tenantId) {
        return res.status(404).json({ message: 'Note not found.' });
    }
    res.status(200).json(note);
});

router.put('/:id', async (req, res) => {
    const { tenantId } = req.user;
    const { content } = req.body;
    let note = await db.notes.findById(req.params.id);
    if (!note || note.tenantId !== tenantId) {
        return res.status(404).json({ message: 'Note not found.' });
    }
    if (!content) {
        return res.status(400).json({ message: 'Content cannot be empty.' });
    }
    const updatedNote = await db.notes.update(req.params.id, content);
    res.status(200).json(updatedNote);
});

router.delete('/:id', async (req, res) => {
    const { tenantId } = req.user;
    let note = await db.notes.findById(req.params.id);
    if (!note || note.tenantId !== tenantId) {
        return res.status(404).json({ message: 'Note not found.' });
    }
    await db.notes.delete(req.params.id);
    res.status(204).end();
});

module.exports = router;