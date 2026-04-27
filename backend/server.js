require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// ================= DB =================
connectDB();

// ================= MIDDLEWARE (VERY IMPORTANT ORDER) =================

// ✅ FIX 1: BODY PARSER MUST COME FIRST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ FIX 2: CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000'
  ].filter(Boolean),
  credentials: true,
}));

// ================= DEBUG MIDDLEWARE (OPTIONAL BUT USEFUL) =================
app.use((req, res, next) => {
  console.log("📥 INCOMING REQUEST:", {
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });
  next();
});

// ================= ROUTES =================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/mis', require('./routes/mis'));
app.use('/api/admin', require('./routes/admin'));

// ================= HEALTH CHECK =================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    message: 'Manufacturing Workflow System running',
    timestamp: new Date().toISOString(),
  });
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏭 Manufacturing Workflow System`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Google Sheets integration active\n`);
});