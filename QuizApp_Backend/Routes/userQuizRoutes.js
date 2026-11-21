const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { listMine, getOne, create, update, remove } = require('../Controllers/userQuizController');

// Quizzes players write themselves; every route only ever touches the caller's own
router.get('/', protect, listMine);
router.post('/', protect, create);
router.get('/:id', protect, getOne);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);

module.exports = router;
