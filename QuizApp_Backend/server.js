const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./Config/db');
const { checkDB } = require('./Config/db');

dotenv.config();

const isServerless = !!process.env.VERCEL;
const isProduction = process.env.NODE_ENV === 'production' || isServerless;

// Start connecting right away; requests below wait for it
connectDB().catch(() => {});

const app = express();
app.use(cors());
app.use(express.json());

// Debug logger (local only — it would print tokens and user data to production logs)
if (!isProduction) {
  app.use((req, res, next) => {
    console.log(`\n📥 ${req.method} ${req.url}`);
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      console.log(`📤 Response:`, JSON.stringify(body));
      return originalJson(body);
    };
    next();
  });
}

app.get('/', (req, res) => {
  res.json({ message: 'QuizApp API is running ✅' });
});

// Readiness check: 200 when MongoDB answers a ping, 503 otherwise
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
  } catch {
    // reported by checkDB below
  }
  const db = await checkDB();
  res.status(db.ok ? 200 : 503).json({
    status: db.ok ? 'ok' : 'error',
    db,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Make sure the database is connected before any API route runs
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: 'Database unavailable, please try again shortly.' });
  }
});

app.use('/api/auth',       require('./Routes/authRoutes'));
app.use('/api/categories', require('./Routes/categoryRoutes'));
app.use('/api/questions',  require('./Routes/questionRoutes'));
app.use('/api/quizzes',    require('./Routes/quizRoutes'));
app.use('/api/results',    require('./Routes/resultRoutes'));
app.use('/api/admin',      require('./Routes/adminRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND', status: 404 });
});

// 🔴 Global error handler — must have 4 params
app.use((err, req, res, next) => {
  console.error('🔴 Global error:', err.stack);
  res.status(500).json({ message: err.message });
});

// Vercel runs the exported app as a function; locally we start a server
if (!isServerless) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} ✅`);
  });
}

module.exports = app;
