require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const zoneRoutes = require('./routes/zones');
const pdfRoutes = require('./routes/pdf');
const dashboardRoute = require('./routes/dashboard'); // Make sure this file exists
const zoneStickersRouter = require('./routes/zoneStickers');
const adminRoutes = require('./routes/admin'); 

const app = express();

// ✅ CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',                 // local dev
    'http://10.76.175.76:3000',              // your local IP
    'https://luhar-samaj-app.vercel.app'     // deployed frontend (Vercel)
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/zones', zoneStickersRouter);
app.use('/api', adminRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

mongoose.connection.on('connecting', () => console.log('Connecting to MongoDB...'));
mongoose.connection.on('connected', () => console.log('MongoDB connected!'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend is working fine ✅' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/dashboard', dashboardRoute);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
