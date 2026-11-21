// Notifications: save them (the bell lists them later) and push them to anyone online.
//
// This API runs as serverless functions and can't hold sockets open, so the push goes
// through the live server (QuizApp_Live): we POST the new notifications to its
// /internal/notify with a short token signed with LIVE_TICKET_SECRET, and it forwards
// each one to that player's open tabs. If the live server is down, nothing is lost: the
// app also polls GET /api/notifications.
const jwt = require('jsonwebtoken');
const { waitUntil } = require('@vercel/functions');
const Notification = require('../Models/Notification');

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const PUSH_TIMEOUT_MS = 3000;

// What the app receives, from the API and from the live push alike
const toClient = (n) => ({
  id: String(n._id),
  type: n.type,
  actor: { id: String(n.actor.id), name: n.actor.name },
  data: {
    ...(n.data?.requestId ? { requestId: String(n.data.requestId) } : {}),
    ...(n.data?.code ? { code: n.data.code } : {}),
    ...(n.data?.quizName ? { quizName: n.data.quizName } : {}),
  },
  read: !!n.read,
  createdAt: n.createdAt,
});

async function push(items) {
  const secret = process.env.LIVE_TICKET_SECRET;
  const url = process.env.LIVE_SERVER_URL || (isProduction ? '' : 'http://localhost:8090');
  if (!secret || !url || !items.length) return;
  const token = jwt.sign({ purpose: 'notify' }, secret, { expiresIn: '30s', audience: 'quizapp-live-internal' });
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/internal/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items }),
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
    });
    if (!res.ok) console.warn(`[notify] live push answered ${res.status}`);
  } catch (err) {
    // Asleep or unreachable: the notifications are saved, the app picks them up when it polls
    console.warn(`[notify] live push failed: ${err.message}`);
  }
}

// notify([{ user, type, actor: { id, name }, data }]) → the saved notifications.
// The live push runs in the background (waitUntil keeps a Vercel function alive for it),
// so the request that caused it doesn't wait on the live server.
async function notify(list) {
  if (!list.length) return [];
  const saved = await Notification.insertMany(list);
  const items = saved.map((n) => ({ userId: String(n.user), notification: toClient(n) }));
  waitUntil(push(items));
  return saved;
}

module.exports = { notify, toClient };
