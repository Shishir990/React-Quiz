const router = require('express').Router();
const { getAll, getOne, create, update, remove } = require('../Controllers/quizController');
const { protect } = require('../Middleware/authMiddleware');
const { adminOnly } = require('../Middleware/adminMiddleware');



console.log('getAll:', getAll);
console.log('getOne:', getOne);
console.log('create:', create);
console.log('update:', update);
console.log('remove:', remove);

router.get('/', protect, getAll);
router.get('/:id', protect, getOne);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);


module.exports = router;