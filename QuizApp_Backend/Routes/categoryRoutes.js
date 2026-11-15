const router = require('express').Router();
const { getAll, create, update, remove } = require('../Controllers/categoryController');
const { protect } = require('../Middleware/authMiddleware');
const { adminOnly } = require('../Middleware/adminMiddleware');

router.get('/', protect, getAll);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);

module.exports = router;