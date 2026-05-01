const router = require('express').Router();
const { getAll, create, update, remove } = require('../Controllers/categoryController');
const { protect } = require('../Middleware/authMiddleware');
const { adminOnly } = require('../Middleware/adminMiddleware');

router.get('/', protect, getAll);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);

console.log('getAll:', getAll);
console.log('create:', create);
console.log('update:', update);
console.log('remove:', remove);
console.log('protect:', protect);
console.log('adminOnly:', adminOnly);


module.exports = router;