const router = require('express').Router();
const { submit, myHistory, getOne, leaderboard } = require('../Controllers/resultController');
const { protect } = require('../Middleware/authMiddleware');

router.post('/submit', protect, submit);
router.get('/me', protect, myHistory);
router.get('/leaderboard', protect, leaderboard);
// Keep last: it matches any single path segment
router.get('/:id', protect, getOne);

module.exports = router;
