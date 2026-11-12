const router = require('express').Router();
const { listMine, getOne, save, remove } = require('../Controllers/progressController');
const { protect } = require('../Middleware/authMiddleware');

router.get('/', protect, listMine);
router.get('/:categoryId', protect, getOne);
router.put('/:categoryId', protect, save);
router.delete('/:categoryId', protect, remove);

module.exports = router;
