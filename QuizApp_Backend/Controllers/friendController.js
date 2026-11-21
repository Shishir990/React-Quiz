const mongoose = require('mongoose');
const User = require('../Models/Users');
const Friendship = require('../Models/Friendship');
const Notification = require('../Models/Notification');
const serverError = require('../Utils/serverError');
const { notify, toClient } = require('../Utils/notify');

const LIMITS = {
  SEARCH_MIN: 2,        // characters before a search runs
  SEARCH_MAX: 60,
  SEARCH_RESULTS: 20,
  FRIENDS: 500,         // per player
  PENDING_OUT: 50,      // requests a player can have waiting at once
  INVITE_AT_ONCE: 20,   // friends invited to a game in one go
  NOTIFICATIONS: 30,    // shown in the bell
};

// Live game room codes (QuizApp_Live/rooms.js): 5 characters, no look-alikes (0/O, 1/I/L)
const ROOM_CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;

const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);
const sameId = (a, b) => String(a) === String(b);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const publicUser = (u) => ({ id: String(u._id), name: u.name, avatar: u.avatar || '' });
const actorOf = (user) => ({ id: user._id, name: user.name });

// Accepted friendship between me and each of `ids`, as a Set of their id strings
async function friendIdsAmong(me, ids) {
  const rows = await Friendship.find({
    status: 'accepted',
    $or: [{ requester: me, recipient: { $in: ids } }, { recipient: me, requester: { $in: ids } }],
  }).select('requester recipient').lean();
  return new Set(rows.map((r) => String(sameId(r.requester, me) ? r.recipient : r.requester)));
}

// ── Search ──

// GET /api/users/search?q=ana → players whose name contains the text, each with how
// they relate to me: none | friends | sent (I asked them) | received (they asked me).
// Only names and avatars: emails are never shown to other players.
exports.searchUsers = async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < LIMITS.SEARCH_MIN) return res.json([]);
    if (q.length > LIMITS.SEARCH_MAX) return res.status(400).json({ message: 'Search for a shorter name.' });

    const users = await User.find({
      _id: { $ne: req.user._id },
      isActive: { $ne: false },
      name: { $regex: escapeRegex(q), $options: 'i' },
    })
      .select('name avatar')
      .sort({ name: 1 })
      .limit(LIMITS.SEARCH_RESULTS)
      .lean();
    if (!users.length) return res.json([]);

    const links = await Friendship.find({
      pairKey: { $in: users.map((u) => Friendship.pairKeyOf(req.user._id, u._id)) },
    }).lean();
    const linkOf = new Map(links.map((l) => [l.pairKey, l]));

    res.json(users.map((u) => {
      const link = linkOf.get(Friendship.pairKeyOf(req.user._id, u._id));
      let relation = 'none';
      if (link?.status === 'accepted') relation = 'friends';
      else if (link) relation = sameId(link.requester, req.user._id) ? 'sent' : 'received';
      return { ...publicUser(u), relation, ...(link && link.status === 'pending' ? { requestId: String(link._id) } : {}) };
    }));
  } catch (err) {
    serverError(req, res, err);
  }
};

// ── Friends and requests ──

// GET /api/friends → { friends, incoming, outgoing }
exports.listFriends = async (req, res) => {
  try {
    const me = req.user._id;
    const rows = await Friendship.find({ $or: [{ requester: me }, { recipient: me }] })
      .populate('requester', 'name avatar isActive')
      .populate('recipient', 'name avatar isActive')
      .sort({ updatedAt: -1 })
      .lean();

    const friends = [];
    const incoming = [];
    const outgoing = [];
    for (const r of rows) {
      const mine = sameId(r.requester?._id, me);
      const other = mine ? r.recipient : r.requester;
      // The other account was deleted or deactivated: leave it out
      if (!other || other.isActive === false) continue;
      if (r.status === 'accepted') friends.push({ ...publicUser(other), since: r.acceptedAt || r.updatedAt });
      else if (mine) outgoing.push({ requestId: String(r._id), user: publicUser(other), sentAt: r.createdAt });
      else incoming.push({ requestId: String(r._id), user: publicUser(other), sentAt: r.createdAt });
    }
    friends.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ friends, incoming, outgoing });
  } catch (err) {
    serverError(req, res, err);
  }
};

// POST /api/friends/requests { userId } → { status: 'pending' | 'accepted', requestId }
// If they had already asked me, this accepts their request instead.
exports.sendRequest = async (req, res) => {
  try {
    const me = req.user;
    const { userId } = req.body || {};
    if (!isId(userId)) return res.status(400).json({ message: 'Choose a player to add.' });
    if (sameId(userId, me._id)) return res.status(400).json({ message: "You can't add yourself." });

    const other = await User.findOne({ _id: userId, isActive: { $ne: false } }).select('name').lean();
    if (!other) return res.status(404).json({ message: 'That player was not found.' });

    const pairKey = Friendship.pairKeyOf(me._id, other._id);
    const existing = await Friendship.findOne({ pairKey });
    if (existing?.status === 'accepted') return res.status(409).json({ message: `You and ${other.name} are already friends.` });
    if (existing && sameId(existing.requester, me._id)) return res.status(409).json({ message: 'Request already sent.' });
    // (await, so a failure lands in the catch below)
    if (existing) return await acceptRequest(req, res, existing);

    const [friendCount, pendingCount] = await Promise.all([
      Friendship.countDocuments({ status: 'accepted', $or: [{ requester: me._id }, { recipient: me._id }] }),
      Friendship.countDocuments({ status: 'pending', requester: me._id }),
    ]);
    if (friendCount >= LIMITS.FRIENDS) return res.status(409).json({ message: `You can have up to ${LIMITS.FRIENDS} friends.` });
    if (pendingCount >= LIMITS.PENDING_OUT) {
      return res.status(409).json({ message: `You have ${LIMITS.PENDING_OUT} requests waiting. Cancel some before sending more.` });
    }

    let request;
    try {
      request = await Friendship.create({ requester: me._id, recipient: other._id, pairKey });
    } catch (err) {
      // Both pressed "Add friend" at the same moment: the other request won
      if (err?.code === 11000) return res.status(409).json({ message: 'A request between you already exists. Refresh to see it.' });
      throw err;
    }
    await notify([{ user: other._id, type: 'friend_request', actor: actorOf(me), data: { requestId: request._id } }]);
    res.status(201).json({ status: 'pending', requestId: String(request._id) });
  } catch (err) {
    serverError(req, res, err);
  }
};

// Turn a request sent to me into a friendship and tell the sender
async function acceptRequest(req, res, request) {
  request.status = 'accepted';
  request.acceptedAt = new Date();
  await request.save();
  // My "X wants to be friends" notification is dealt with
  await Notification.updateMany({ user: req.user._id, type: 'friend_request', 'data.requestId': request._id }, { read: true });
  await notify([{ user: request.requester, type: 'friend_accepted', actor: actorOf(req.user) }]);
  res.json({ status: 'accepted', requestId: String(request._id) });
}

// A pending request by id, where I'm `side` (requester or recipient), or null
const findPending = (req, side) => (isId(req.params.id)
  ? Friendship.findOne({ _id: req.params.id, status: 'pending', [side]: req.user._id })
  : null);

// POST /api/friends/requests/:id/accept
exports.accept = async (req, res) => {
  try {
    const request = await findPending(req, 'recipient');
    if (!request) return res.status(404).json({ message: 'That request is no longer waiting.' });
    await acceptRequest(req, res, request);
  } catch (err) {
    serverError(req, res, err);
  }
};

// POST /api/friends/requests/:id/decline (the sender isn't told)
exports.decline = async (req, res) => {
  try {
    const request = await findPending(req, 'recipient');
    if (!request) return res.status(404).json({ message: 'That request is no longer waiting.' });
    await Promise.all([
      request.deleteOne(),
      Notification.deleteMany({ user: req.user._id, type: 'friend_request', 'data.requestId': request._id }),
    ]);
    res.json({ message: 'Request declined' });
  } catch (err) {
    serverError(req, res, err);
  }
};

// DELETE /api/friends/requests/:id: take back a request I sent
exports.cancel = async (req, res) => {
  try {
    const request = await findPending(req, 'requester');
    if (!request) return res.status(404).json({ message: 'That request is no longer waiting.' });
    await Promise.all([
      request.deleteOne(),
      // Gone from their bell too
      Notification.deleteMany({ user: request.recipient, type: 'friend_request', 'data.requestId': request._id }),
    ]);
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    serverError(req, res, err);
  }
};

// DELETE /api/friends/:userId: unfriend
exports.removeFriend = async (req, res) => {
  try {
    if (!isId(req.params.userId)) return res.status(404).json({ message: 'Not in your friends.' });
    const result = await Friendship.deleteOne({
      pairKey: Friendship.pairKeyOf(req.user._id, req.params.userId),
      status: 'accepted',
    });
    if (!result.deletedCount) return res.status(404).json({ message: 'Not in your friends.' });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    serverError(req, res, err);
  }
};

// POST /api/friends/invite { userIds, code, quizName? } → { invited }
// Invites friends to the live game room `code`. Only friends can be invited, and the
// same friend gets one invite per room per minute at most.
exports.invite = async (req, res) => {
  try {
    const { userIds, code } = req.body || {};
    const room = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (!ROOM_CODE.test(room)) return res.status(400).json({ message: 'That game code is not valid.' });
    const ids = [...new Set(Array.isArray(userIds) ? userIds.filter(isId) : [])];
    if (!ids.length) return res.status(400).json({ message: 'Choose friends to invite.' });
    if (ids.length > LIMITS.INVITE_AT_ONCE) return res.status(400).json({ message: `Invite up to ${LIMITS.INVITE_AT_ONCE} friends at once.` });
    const quizName = typeof req.body.quizName === 'string' ? req.body.quizName.trim().slice(0, 80) : '';

    const friends = await friendIdsAmong(req.user._id, ids);
    const recent = await Notification.find({
      user: { $in: [...friends] }, type: 'game_invite', 'data.code': room, 'actor.id': req.user._id,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    }).select('user').lean();
    const alreadyInvited = new Set(recent.map((n) => String(n.user)));
    const targets = [...friends].filter((id) => !alreadyInvited.has(id));

    await notify(targets.map((id) => ({
      user: id,
      type: 'game_invite',
      actor: actorOf(req.user),
      data: { code: room, ...(quizName ? { quizName } : {}) },
    })));
    // Friends invited a moment ago count as invited
    res.json({ invited: [...friends] });
  } catch (err) {
    serverError(req, res, err);
  }
};

// ── Notifications ──

// GET /api/notifications → { items (newest first), unread }
exports.listNotifications = async (req, res) => {
  try {
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(LIMITS.NOTIFICATIONS).lean(),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.json({ items: items.map(toClient), unread });
  } catch (err) {
    serverError(req, res, err);
  }
};

// POST /api/notifications/read { ids? } → marks those (or, without ids, all) as read
exports.markRead = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(isId) : null;
    const filter = { user: req.user._id, read: false, ...(ids ? { _id: { $in: ids } } : {}) };
    await Notification.updateMany(filter, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    serverError(req, res, err);
  }
};
