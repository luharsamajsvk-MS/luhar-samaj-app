require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// ✅ Route imports
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const zoneRoutes = require('./routes/zones');
const dashboardRoute = require('./routes/dashboard');
const zoneStickersRouter = require('./routes/zoneStickers');
const adminRoutes = require('./routes/admin');
const requestRoutes = require('./routes/requests');
const auditRoutes = require("./routes/audit");
const exportRoutes = require('./routes/exports'); // ✅ 1. Add this line

const app = express();

// ✅ CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://10.76.175.76:3000',
    'https://luhar-samaj-app.vercel.app'
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ✅ Middleware
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ✅ CRITICAL FIX: Import models in correct order (AuditLog FIRST!)
require('./models/AuditLog');
require('./models/Member');
require('./models/Zone');
require('./models/User');

mongoose.connection.on('connecting', () => console.log('Connecting to MongoDB...'));
mongoose.connection.on('connected', () => console.log('MongoDB connected!'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));

// ✅ Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed. Server shutting down...");
  process.exit(0);
});

// ✅ Health check route
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend is working fine ✅' });
});

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/zones/stickers', zoneStickersRouter);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/audit', auditRoutes); // Corrected path to /api/audit
app.use('/api/export', exportRoutes); // ✅ 2. Add this line


// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({ error: err.message, stack: err.stack });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});