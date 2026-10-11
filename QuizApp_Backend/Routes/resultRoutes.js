const router = require('express').Router();
const { submit, myHistory } = require('../Controllers/resultController');
const { protect } = require('../Middleware/authMiddleware');

router.post('/submit', protect, submit);
router.get('/me', protect, myHistory);


module.exports = router;