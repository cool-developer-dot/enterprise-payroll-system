import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError, AppError } from '../utils/errorHandler.js';
import { ensureMongoConnected, executeWithRetry } from '../utils/dbUtils.js';
import User from '../models/User.js';
import UserSession from '../models/UserSession.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return next(new UnauthorizedError('You are not logged in! Please log in to get access.'));
    }
    
    // Verify token first (doesn't require DB)
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (tokenError) {
      if (tokenError.message === 'Token expired') {
        return next(new UnauthorizedError('Your token has expired! Please log in again.'));
      }
      if (tokenError.message === 'Invalid token') {
        return next(new UnauthorizedError('Invalid token. Please log in again!'));
      }
      return next(tokenError);
    }
    
    // Ensure database connection is ready before queries
    try {
      ensureMongoConnected();
    } catch (dbError) {
      // Database connection error - return user-friendly error
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }
    
    // Execute database operations with retry logic
    const user = await executeWithRetry(async () => {
      return await User.findById(decoded.id).select('+password');
    });
    
    if (!user) {
      return next(new UnauthorizedError('The user belonging to this token does no longer exist.'));
    }
    
    if (user.status !== 'active') {
      return next(new UnauthorizedError('Your account has been deactivated.'));
    }
    
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return next(new UnauthorizedError('Your account has been locked. Please contact support.'));
    }
    
    const session = await executeWithRetry(async () => {
      return await UserSession.findOne({
      userId: user._id,
      sessionToken: token,
      isActive: true,
      expiresAt: { $gt: new Date() },
      });
    });
    
    if (!session) {
      return next(new UnauthorizedError('Invalid or expired session. Please log in again.'));
    }
    
    // Update session and user with retry logic
    try {
    session.lastActivity = new Date();
      await executeWithRetry(async () => {
        return await session.save();
      });
    
    user.lastActiveAt = new Date();
      await executeWithRetry(async () => {
        return await user.save();
      });
    } catch (saveError) {
      // If save fails, log but don't fail authentication
      console.warn('Failed to update session/user activity:', saveError.message);
    }
    
    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    // Handle connection errors with user-friendly messages
    if (error.name === 'MongoServerSelectionError' || 
        error.name === 'MongoNetworkError' ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) {
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }
    
    // Re-throw operational errors
    if (error.isOperational || error.statusCode) {
      return next(error);
    }
    
    // For unexpected errors, return generic message in production
    if (process.env.NODE_ENV === 'production') {
      return next(new AppError(
        'Authentication failed. Please try again later.',
        500
      ));
    }
    
    return next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

