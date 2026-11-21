const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { userSearchLimiter } = require('../Middleware/rateLimit');
const { searchUsers } = require('../Controllers/friendController');

// Finding other players (names and avatars only)
router.get('/search', protect, userSearchLimiter, searchUsers);

module.exports = router;
