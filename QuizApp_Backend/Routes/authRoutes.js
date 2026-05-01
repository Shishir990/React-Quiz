const router = require('express').Router();
const { register, login, getMe } = require('../Controllers/authController');
const { protect } = require('../Middleware/authMiddleware');
console.log('protect:', protect); // should print [Function: protect]
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

console.log('register:', register);
console.log('login:', login);
console.log('getMe:', getMe);
console.log('protect:', protect);


module.exports = router;