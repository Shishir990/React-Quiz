const router = require('express').Router();
const { getAll, create, bulkCreate, update, remove } = require('../Controllers/questionController');
const { protect } = require('../Middleware/authMiddleware');
const { adminOnly } = require('../Middleware/adminMiddleware');
const {getQuizQuestions}=require("../Controllers/questionController")

console.log('getAll:', getAll);
console.log('create:', create);
console.log('update:', update);
console.log('remove:', remove);

router.get('/', protect, adminOnly, getAll);
router.post('/', protect, adminOnly, create);
router.post('/bulk', protect, adminOnly, bulkCreate);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);
router.get('/quiz/:categoryId', protect, getQuizQuestions)
module.exports = router;