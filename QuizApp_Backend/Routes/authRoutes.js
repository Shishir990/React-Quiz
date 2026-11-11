const router = require('express').Router();
const { register, login, getMe, changePassword, forgotPassword, resetPassword } = require('../Controllers/authController');
const { protect } = require('../Middleware/authMiddleware');
console.log('protect:', protect); // should print [Function: protect]
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

console.log('register:', register);
console.log('login:', login);
console.log('getMe:', getMe);
console.log('protect:', protect);


module.exports = router;