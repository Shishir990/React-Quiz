const router = require('express').Router();
const {
  register, login, getMe, changePassword, forgotPassword, checkResetToken, resetPassword,
  googleConfig, googleLogin, refresh, logout, logoutAll,
  listSessions, revokeSession,
  updateProfile, requestEmailChange, cancelEmailChange, confirmEmailChange,
} = require('../Controllers/authController');
const { protect } = require('../Middleware/authMiddleware');
const {
  loginLimiter, changePasswordLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter, refreshLimiter,
  emailChangeLimiter,
} = require('../Middleware/rateLimit');

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/google/config', googleConfig);
router.post('/google', loginLimiter, googleLogin);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);
router.get('/sessions', protect, listSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.get('/me', protect, getMe);
router.put('/password', protect, changePasswordLimiter, changePassword);
router.put('/profile', protect, updateProfile);
router.post('/email-change', protect, emailChangeLimiter, requestEmailChange);
router.delete('/email-change', protect, cancelEmailChange);
router.post('/email-change/confirm', resetPasswordLimiter, confirmEmailChange);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password/check', resetPasswordLimiter, checkResetToken);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

module.exports = router;
