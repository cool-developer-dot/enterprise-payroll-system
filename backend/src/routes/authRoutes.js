import express from 'express';
import {
  login,
  register,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import {
  validateLogin,
  validateRegister,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors,
} from '../validators/authValidator.js';

const router = express.Router();

// Apply rate limiting to authentication endpoints
router.post('/login', authLimiter, validateLogin, handleValidationErrors, login);

// Public registration is disabled for production security
// Only admins can create users through /api/users endpoint
// Keeping route for backward compatibility but it will return an error
if (process.env.ALLOW_PUBLIC_REGISTRATION === 'true') {
  router.post('/register', authLimiter, validateRegister, handleValidationErrors, register);
  console.warn('⚠️  WARNING: Public registration is enabled. This is not recommended for production!');
} else {
  // Disable public registration - return 403 Forbidden
  router.post('/register', (req, res, next) => {
    return res.status(403).json({
      success: false,
      message: 'Public registration is disabled. Only administrators can create user accounts. Please contact your system administrator.'
    });
  });
}

router.post('/refresh', authLimiter, validateRefreshToken, handleValidationErrors, refreshToken);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, handleValidationErrors, forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, handleValidationErrors, resetPassword);
router.get('/me', authenticate, getCurrentUser);

export default router;


