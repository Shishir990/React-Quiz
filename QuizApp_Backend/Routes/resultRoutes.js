const router = require('express').Router();
const { submit, myHistory, analytics, getOne, leaderboard } = require('../Controllers/resultController');
const { protect } = require('../Middleware/authMiddleware');

router.post('/submit', protect, submit);
router.get('/me', protect, myHistory);
router.get('/leaderboard', protect, leaderboard);
router.get('/analytics', protect, analytics);
// Keep last: it matches any single path segment
router.get('/:id', protect, getOne);

module.exports = router;
