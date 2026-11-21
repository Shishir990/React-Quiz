const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { friendRequestLimiter, inviteLimiter } = require('../Middleware/rateLimit');
const {
  listFriends, sendRequest, accept, decline, cancel, removeFriend, invite,
} = require('../Controllers/friendController');

// Friends of the signed-in player, requests between players, and game invites
router.get('/', protect, listFriends);
router.post('/requests', protect, friendRequestLimiter, sendRequest);
router.post('/requests/:id/accept', protect, accept);
router.post('/requests/:id/decline', protect, decline);
router.delete('/requests/:id', protect, cancel);
router.post('/invite', protect, inviteLimiter, invite);
router.delete('/:userId', protect, removeFriend);

module.exports = router;
