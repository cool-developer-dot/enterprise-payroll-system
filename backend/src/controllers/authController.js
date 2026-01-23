import User from '../models/User.js';
import UserSession from '../models/UserSession.js';
import { comparePassword, generateResetToken, hashResetToken, generatePasswordResetExpiry } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { 
  AuthenticationFailedError, 
  ResourceNotFoundError, 
  InvalidInputError, 
  DuplicateResourceError,
  // Backward compatibility
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ConflictError
} from '../utils/errorHandler.js';
import { addDays } from '../utils/dateUtils.js';

const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || '',
    deviceType: req.get('user-agent')?.includes('Mobile') ? 'mobile' : 
                req.get('user-agent')?.includes('Tablet') ? 'tablet' : 'desktop',
  };
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Additional validation (backup in case middleware fails)
    if (!email || !password) {
      return next(new InvalidInputError('Email address and password are required'));
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Production-ready logging (masked for security)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Login attempt: ${normalizedEmail} (password length: ${password.length})`);
    } else {
      // In production, log without sensitive data
      console.log(`[AUTH] Login attempt: ${normalizedEmail}`);
    }
    
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    
    if (!user) {
      // Log failed login attempt (security monitoring)
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[SECURITY] Failed login attempt: ${normalizedEmail} - User not found`);
      }
      // Return generic error to prevent email enumeration
      return next(new AuthenticationFailedError('The email address or password you entered is incorrect. Please try again.'));
    }
    
    if (!user.password) {
      console.error(`[ERROR] User ${user._id} (${user.email}) found but password field is missing`);
      return next(new AuthenticationFailedError('Account configuration error. Please contact support for assistance.'));
    }
    
    // Verify password with error handling (production-ready security)
    let isPasswordValid = false;
    try {
      isPasswordValid = await comparePassword(password, user.password);
    } catch (compareError) {
      console.error(`[ERROR] Password comparison failed for user ${user._id}:`, compareError.message);
      return next(new AuthenticationFailedError('Authentication failed. Please try again or contact support.'));
    }
    
    if (!isPasswordValid) {
      // Increment login attempts for security (production-ready)
      const newLoginAttempts = (user.loginAttempts || 0) + 1;
      const updateData = {
        loginAttempts: newLoginAttempts
      };
      
      // Lock account after 5 failed attempts (production-ready security)
      if (newLoginAttempts >= 5) {
        updateData.lockUntil = addDays(new Date(), 1);
        
        // Use updateOne to avoid triggering validation for existing users
        await User.updateOne({ _id: user._id }, { $set: updateData });
        
        // Log security event
        if (process.env.NODE_ENV === 'production') {
          console.warn(`[SECURITY] Account locked: ${user.email} after ${newLoginAttempts} failed login attempts`);
        }
        
        return next(new AuthenticationFailedError(
          'Your account has been temporarily locked due to multiple failed login attempts. ' +
          'Please contact your administrator or try again after 24 hours.'
        ));
      }
      
      // Use updateOne to avoid triggering validation for existing users
      await User.updateOne({ _id: user._id }, { $set: updateData });
      
      // Log failed attempt (without password info)
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[SECURITY] Failed login: ${user.email} (attempt ${newLoginAttempts}/5)`);
      }
      
      // Return generic error to prevent user enumeration
      return next(new AuthenticationFailedError('The email address or password you entered is incorrect. Please try again.'));
    }
    
    if (user.status !== 'active') {
      const statusMessages = {
        'inactive': 'Your account is currently inactive. Please contact support to reactivate your account.',
        'on-leave': 'Your account is currently on leave. Please contact support for assistance.',
        'terminated': 'Your account has been terminated. Please contact support for more information.'
      };
      return next(new AuthenticationFailedError(statusMessages[user.status] || 'Your account is not active. Please contact support.'));
    }
    
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return next(new AuthenticationFailedError('Your account has been temporarily locked due to multiple failed login attempts. Please contact support or try again later.'));
    }
    
    // Update user login information without triggering full validation
    // Use updateOne to avoid re-validating required fields for existing users
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          loginAttempts: 0,
          lockUntil: undefined,
          lastLogin: new Date(),
          lastActiveAt: new Date(),
        }
      }
    );
    
    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });
    
    const clientInfo = getClientInfo(req);
    const expiresAt = addDays(new Date(), 30);
    
    try {
      await UserSession.create({
        userId: user._id,
        sessionToken: accessToken,
        refreshToken: refreshToken,
        ...clientInfo,
        isActive: true,
        expiresAt: expiresAt,
      });
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      // Continue even if session creation fails - user can still login
    }
    
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      department: user.department,
    };
    
    return sendSuccess(res, 200, 'Login successful', {
      user: userData,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    // Production-ready error handling
    console.error('[ERROR] Login process failed:', error.message);
    
    // Handle MongoDB connection errors specifically
    if (error.name === 'MongoServerSelectionError' || 
        error.name === 'MongoNetworkError' ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) {
      console.error('[ERROR] Database connection error during login');
      return next(new AuthenticationFailedError(
        'Database service is temporarily unavailable. Please try again later or contact support.'
      ));
    }
    
    // Handle other errors
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR] Full login error:', error);
    }
    
    return next(error);
  }
};

/**
 * DEPRECATED: Public registration is disabled for production security
 * Only admins can create users through the /api/users endpoint
 * This endpoint is kept for backward compatibility but returns an error
 */
export const register = async (req, res, next) => {
  try {
    // Public registration is disabled - only admin can create users
    // Users should be created by admin through /api/users endpoint
    return next(new AuthenticationFailedError(
      'Public registration is disabled. Please contact your administrator to create an account. ' +
      'Only system administrators can create user accounts.'
    ));
  } catch (error) {
    console.error('Registration error:', error);
    return next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return next(new ValidationError('Refresh token is required'));
    }
    
    const decoded = verifyToken(token);
    
    const session = await UserSession.findOne({
      refreshToken: token,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
    
    if (!session) {
      return next(new UnauthorizedError('Invalid or expired refresh token'));
    }
    
    const user = await User.findById(decoded.id);
    
    if (!user || user.status !== 'active') {
      return next(new UnauthorizedError('User not found or inactive'));
    }
    
    const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user._id });
    
    session.sessionToken = newAccessToken;
    session.refreshToken = newRefreshToken;
    session.expiresAt = addDays(new Date(), 30);
    session.lastActivity = new Date();
    await session.save();
    
    return sendSuccess(res, 200, 'Token refreshed successfully', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.message === 'Token expired' || error.message === 'Invalid token') {
      return next(new UnauthorizedError('Invalid or expired refresh token'));
    }
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const session = await UserSession.findOne({ sessionToken: token });
      if (session) {
        session.isActive = false;
        session.loggedOutAt = new Date();
        await session.save();
      }
    }
    
    if (req.user) {
      req.user.lastActiveAt = new Date();
      await req.user.save();
    }
    
    return sendSuccess(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return sendSuccess(res, 200, 'If email exists, password reset link has been sent');
    }
    
    const resetToken = generateResetToken();
    const hashedToken = hashResetToken(resetToken);
    
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = generatePasswordResetExpiry();
    await user.save();
    
    // TODO: Send email with reset token
    // For now, return token in development
    if (process.env.NODE_ENV === 'development') {
      return sendSuccess(res, 200, 'Password reset token generated', {
        resetToken, // Only in development
        expiresAt: user.passwordResetExpires,
      });
    }
    
    return sendSuccess(res, 200, 'If email exists, password reset link has been sent');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return next(new ValidationError('Token and password are required'));
    }
    
    const hashedToken = hashResetToken(token);
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');
    
    if (!user) {
      return next(new UnauthorizedError('Invalid or expired reset token'));
    }
    
    // Set plain password - pre-save hook will hash it automatically
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    
    // Invalidate all existing sessions
    await UserSession.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, loggedOutAt: new Date() }
    );
    
    return sendSuccess(res, 200, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return next(new ResourceNotFoundError('User account'));
    }
    
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      department: user.department,
      position: user.position,
      photo: user.photo,
      status: user.status,
      preferences: user.preferences,
    };
    
    return sendSuccess(res, 200, 'User retrieved successfully', { user: userData });
  } catch (error) {
    next(error);
  }
};

