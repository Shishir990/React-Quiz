// Error reporting: must load before Express (does nothing without SENTRY_DSN)
require('./instrument');
const reportError = require('./Utils/reportError');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrfGuard = require('./Middleware/csrf');
const dotenv = require('dotenv');
const connectDB = require('./Config/db');
const { checkDB } = require('./Config/db');

dotenv.config();

const isServerless = !!process.env.VERCEL;
const isProduction = process.env.NODE_ENV === 'production' || isServerless;

// Start connecting right away; requests below wait for it
(async () => {
  try {
    await connectDB();
  } catch {
    // Already logged; each request then gets a 503 from the database gate below
  }
})();

const app = express();

// Vercel sits in front of the app as one proxy: trust its X-Forwarded-For so
// rate limiting sees each visitor's IP instead of Vercel's
if (isServerless) app.set('trust proxy', 1);

// API documentation (Swagger UI). Mounted first: it sets its own security headers
// and doesn't need the database. API_DOCS=off hides it.
// A mistake in the docs file must never take the API down, so failures only disable the page.
if (process.env.API_DOCS !== 'off') {
  try {
    app.use('/api/docs', require('./Docs').router);
  } catch (err) {
    console.error('[docs] API docs disabled, could not load Docs/openapi.yaml:', err.message);
  }
}

// Security headers (the API only serves JSON, so helmet's defaults are safe)
app.use(helmet());

// The site calls the API on its own domain (Vercel rewrites /api), so no other
// website needs CORS access. CORS_ORIGINS (comma separated) can allow extra origins;
// local dev also allows any localhost port.
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, done) => done(null,
    !origin || allowedOrigins.includes(origin) || (!isProduction && /^http:\/\/localhost:\d+$/.test(origin))),
  credentials: true, // sign-in lives in cookies
}));

// 1mb leaves room for bulk question imports (up to 500 rows)
app.use(express.json({ limit: '1mb' }));
// Sign-in cookies, and the CSRF check every data-changing request must pass
app.use(cookieParser());
app.use('/api', csrfGuard);

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
  res.json({ message: 'Quizora API is running ✅' });
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

// API answers are per user (they depend on the sign-in cookies) and change all the time,
// so no cache may keep them: not the browser, not Vercel's edge, not a proxy. Without this
// Vercel labels them "public, max-age=0, must-revalidate", which lets caches store them
// keyed only by URL, so a reload could show data from before a deploy or an earlier session.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.vary('Cookie'); // added to CORS's "Vary: Origin", not replacing it
  next();
});

// Make sure the database is connected before any API route runs
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error(`[db] 503 ${req.method} ${req.originalUrl}: ${err.message}`);
    // During an outage every request fails the same way; Sentry groups them into one issue
    reportError(err, req);
    res.status(503).json({ message: 'Database unavailable, please try again shortly.' });
  }
});

app.use('/api/auth',       require('./Routes/authRoutes'));
app.use('/api/categories', require('./Routes/categoryRoutes'));
app.use('/api/questions',  require('./Routes/questionRoutes'));
app.use('/api/quizzes',    require('./Routes/quizRoutes'));
app.use('/api/results',    require('./Routes/resultRoutes'));
app.use('/api/admin',      require('./Routes/adminRoutes'));
app.use('/api/progress',   require('./Routes/progressRoutes'));
app.use('/api/live',       require('./Routes/liveRoutes'));
app.use('/api/user-quizzes', require('./Routes/userQuizRoutes'));
app.use('/api/users',      require('./Routes/userRoutes'));
app.use('/api/friends',    require('./Routes/friendRoutes'));
app.use('/api/notifications', require('./Routes/notificationRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND', status: 404 });
});

// Global error handler (Express needs all 4 params to treat it as one)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Bad requests caught by Express itself, e.g. malformed JSON or a body over the size limit
  if (err.status >= 400 && err.status < 500) {
    const message = err.type === 'entity.too.large' ? 'Request is too large.'
      : err.type === 'entity.parse.failed' ? 'Request body is not valid JSON.'
      : 'Bad request.';
    return res.status(err.status).json({ message });
  }
  console.error(`[error] 500 ${req.method} ${req.originalUrl}:`, err.stack || err);
  reportError(err, req);
  res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
});

// Vercel runs the exported app as a function; locally we start a server
if (!isServerless) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} ✅`);
  });
}

module.exports = app;
