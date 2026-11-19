const router = require('express').Router();
const { stats, users, setRole, setStatus } = require('../Controllers/adminController');
const { protect } = require('../Middleware/authMiddleware');
const { adminOnly } = require('../Middleware/adminMiddleware');
const serverError = require('../Utils/serverError');

// Every route here is admin only
router.use(protect, adminOnly);

router.get('/stats', stats);
router.get('/users', users);
router.patch('/users/:id/role', setRole);
router.patch('/users/:id/status', setStatus);

// Fails on purpose, to check that errors reach Sentry (see instrument.js)
router.get('/debug-error', (req, res) => {
  serverError(req, res, new Error('Sentry test error from /api/admin/debug-error'));
});

module.exports = router;
