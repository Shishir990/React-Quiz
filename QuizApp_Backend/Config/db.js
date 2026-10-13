const mongoose = require('mongoose');
const usePublicDnsForAtlas = require('./dns');

const isServerless = !!process.env.VERCEL;

// Reuse one connection across requests (and across warm serverless invocations)
let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set');
  }
  usePublicDnsForAtlas();

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
    .then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn.connection;
    })
    .catch((err) => {
      connectionPromise = null; // allow a retry on the next request
      console.error('MongoDB connection error:', err.message);
      // Locally a dead DB means the server is useless; on Vercel let the
      // request fail with a 503 instead of killing the function
      if (!isServerless) process.exit(1);
      throw err;
    });

  return connectionPromise;
};

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// Readiness check: connection state + a real round-trip ping
const checkDB = async () => {
  const state = DB_STATES[mongoose.connection.readyState] || 'unknown';
  if (state !== 'connected') {
    return { ok: false, state, message: `MongoDB is ${state}` };
  }
  try {
    const started = Date.now();
    await mongoose.connection.db.admin().ping();
    return { ok: true, state, latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, state, message: err.message };
  }
};

module.exports = connectDB;
module.exports.checkDB = checkDB;
