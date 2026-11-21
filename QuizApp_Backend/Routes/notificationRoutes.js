const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { listNotifications, markRead } = require('../Controllers/friendController');

// The signed-in player's notifications (the bell in the top bar)
router.get('/', protect, listNotifications);
router.post('/read', protect, markRead);

module.exports = router;
