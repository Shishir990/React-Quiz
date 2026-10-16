const router = require('express').Router();
const { stats, users, setRole, setStatus } = require('../Controllers/adminController');
const { protect } = require('../Middleware/authMiddleware');
const { adminOnly } = require('../Middleware/adminMiddleware');

// Every route here is admin only
router.use(protect, adminOnly);

router.get('/stats', stats);
router.get('/users', users);
router.patch('/users/:id/role', setRole);
router.patch('/users/:id/status', setStatus);

module.exports = router;
