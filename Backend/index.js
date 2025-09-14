require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./api/auth');
const notesRoutes = require('./api/notes');
const tenantRoutes = require('./api/tenants');

const app = express();

// --- Middlewares ---
// Enable CORS for all routes and origins
app.use(cors());
// Parse JSON bodies
app.use(express.json());


// --- API Routes ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/tenants', tenantRoutes);


// --- Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});

// Export the app for Vercel
module.exports = app;