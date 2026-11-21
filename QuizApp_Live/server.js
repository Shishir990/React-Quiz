// QuizApp live games: a long-running Socket.IO server, separate from the Vercel API
// (serverless functions can't hold WebSocket connections open).
//
// Sign-in: the browser asks the main API for a one-minute ticket (POST /api/live/ticket)
// and sends it when connecting. Tickets are signed with LIVE_TICKET_SECRET, which only
// the two servers know, so this server never needs the API's JWT_SECRET.
require('dotenv').config();
const dns = require('dns');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { User } = require('./models');
const { actions, roomCount } = require('./rooms');

const PORT = Number(process.env.PORT) || 8090;
const isProduction = process.env.NODE_ENV === 'production';
const TICKET_AUDIENCE = 'quizapp-live';

for (const name of ['MONGO_URI', 'LIVE_TICKET_SECRET']) {
  if (!process.env[name]) {
    console.error(`[live] ${name} is not set (see .env.example)`);
    process.exit(1);
  }
}

// Same workaround as QuizApp_Backend/Config/dns.js: some ISP DNS servers refuse
// the SRV lookups that mongodb+srv:// needs, so locally fall back to public DNS
if (!isProduction && process.env.MONGO_URI.startsWith('mongodb+srv://')) {
  dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);
}

const allowedOrigins = (process.env.LIVE_CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
const originAllowed = (origin) =>
  !!origin && (allowedOrigins.includes(origin) || (!isProduction && /^http:\/\/localhost:\d+$/.test(origin)));

const app = express();
app.get('/', (req, res) => res.json({ message: 'QuizApp live server is running ✅' }));
// For the host's health checks (Render, Railway, Fly all poll a URL like this)
app.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'error', rooms: roomCount(), uptimeSeconds: Math.round(process.uptime()) });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: (origin, done) => done(null, originAllowed(origin)) },
  // Small messages only; anything bigger is not from our client
  maxHttpBufferSize: 10_000,
  // A heartbeat every 20s; a connection is only given up after 30s more of silence.
  // Phones and busy Wi-Fi often go quiet for a few seconds, and dropping a player
  // for that (Socket.IO's default is 20s) shows up as random disconnects.
  pingInterval: 20_000,
  pingTimeout: 30_000,
});

// Rooms live in memory, so a crash ends every game at once. Log unexpected errors
// instead of exiting (Railway would restart the process and wipe all rooms).
process.on('unhandledRejection', (err) => console.error('[live] unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('[live] uncaught exception:', err));

// Every connection must carry a valid ticket for an active account
const requireTicket = async (socket, next) => {
  try {
    const ticket = socket.handshake.auth?.ticket;
    if (typeof ticket !== 'string') throw new Error('no ticket');
    const claims = jwt.verify(ticket, process.env.LIVE_TICKET_SECRET, { audience: TICKET_AUDIENCE });
    const user = await User.findById(claims.id).select('name isActive tokenVersion').lean();
    // Deactivated, or signed out everywhere since the ticket was issued
    if (!user || user.isActive === false || (user.tokenVersion || 0) !== (claims.tv || 0)) throw new Error('account not allowed');
    socket.data.user = { id: String(user._id), name: user.name };
    socket.data.code = null;
    next();
  } catch (err) {
    console.warn(`[live] refused a connection: ${err.message}`);
    next(new Error('unauthorized'));
  }
};
io.use(requireTicket);

// ── Notifications ──
// The app keeps one connection to /notify open on every signed-in page; each player
// is in a private channel, `user:<id>`. Clients only listen here: no events are accepted.
const notifyNs = io.of('/notify');
notifyNs.use(requireTicket);
notifyNs.on('connection', (socket) => {
  socket.join(`user:${socket.data.user.id}`);
  // Anything a client sends here is ignored
  socket.onAny(() => {});
});

// The main API calls this when it saves notifications (QuizApp_Backend/Utils/notify.js).
// It signs a 30-second token with LIVE_TICKET_SECRET for an audience browsers' tickets
// never have, so only the API can push.
const MAX_PUSH_ITEMS = 100;
app.post('/internal/notify', express.json({ limit: '100kb' }), (req, res) => {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
    jwt.verify(bearer, process.env.LIVE_TICKET_SECRET, { audience: 'quizapp-live-internal' });
  } catch {
    return res.status(401).json({ message: 'unauthorized' });
  }
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, MAX_PUSH_ITEMS) : [];
  let sent = 0;
  for (const { userId, notification } of items) {
    if (typeof userId !== 'string' || !/^[a-f0-9]{24}$/i.test(userId) || !notification || typeof notification !== 'object') continue;
    notifyNs.to(`user:${userId}`).emit('notification', notification);
    sent += 1;
  }
  res.json({ sent });
});

// At most this many events per second per connection (far more than a person can
// click); extra ones are refused without running
const EVENTS_PER_SECOND = 10;

io.on('connection', (socket) => {
  let windowStart = Date.now();
  let count = 0;
  socket.use((packet, next) => {
    const now = Date.now();
    if (now - windowStart > 1000) { windowStart = now; count = 0; }
    count += 1;
    if (count <= EVENTS_PER_SECOND) return next();
    // Answer at once, so the client shows a message instead of waiting for a reply
    const ack = packet[packet.length - 1];
    if (typeof ack === 'function') ack({ ok: false, message: 'Too many actions at once. Please slow down.' });
  });

  // Each client event runs one action and answers through the acknowledgement
  // callback: { ok: true, ... } or { ok: false, message }
  const handle = (event, action) => {
    socket.on(event, async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const result = await action(io, socket, payload && typeof payload === 'object' ? payload : {});
        reply({ ok: true, ...result });
      } catch (err) {
        if (!err.expose) console.error(`[live] ${event} failed:`, err);
        reply({ ok: false, message: err.expose ? err.message : 'Something went wrong. Please try again.' });
      }
    });
  };

  handle('room:create', actions.create);
  handle('room:join', actions.join);
  handle('room:sync', actions.sync);
  handle('room:leave', (ioRef, s) => actions.leave(ioRef, s, { explicit: true }));
  handle('game:start', actions.start);
  handle('game:next', actions.next);
  handle('game:answer', actions.answer);
  handle('exam:answer', actions.examAnswer);
  handle('exam:submit', actions.examSubmit);

  const { user } = socket.data;
  console.log(`[live] connect user ${user.id} via ${socket.conn.transport.name}`);
  socket.on('disconnect', (reason) => {
    // The reason tells a network problem ("ping timeout", "transport close") from the
    // player leaving the page ("client namespace disconnect")
    console.log(`[live] disconnect user ${user.id} room ${socket.data.code || '-'}: ${reason}`);
    try {
      actions.leave(io, socket, { explicit: false });
    } catch (err) {
      console.error('[live] cleanup after disconnect failed:', err);
    }
  });
});

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then((conn) => {
    console.log(`[live] MongoDB connected: ${conn.connection.host}`);
    server.listen(PORT, () => console.log(`[live] Live server on http://localhost:${PORT} ✅`));
  })
  .catch((err) => {
    console.error('[live] MongoDB connection error:', err.message);
    process.exit(1);
  });
