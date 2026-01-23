import mongoose from 'mongoose';
import { AppError } from './errorHandler.js';

/**
 * Check if MongoDB connection is ready before performing database operations
 * @returns {boolean} True if connected, false otherwise
 */
export const isMongoConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Ensure MongoDB connection is ready before database operations
 * Throws an error if not connected (production-ready)
 * @throws {AppError} If MongoDB is not connected
 */
export const ensureMongoConnected = () => {
  if (!isMongoConnected()) {
    throw new AppError(
      'Database service is temporarily unavailable. Please try again later.',
      503
    );
  }
};

/**
 * Wrap database operations with connection checking and retry logic
 * @param {Function} dbOperation - The database operation to execute
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @param {number} retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise} The result of the database operation
 */
export const executeWithRetry = async (dbOperation, maxRetries = 2, retryDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check connection before each attempt
      if (attempt > 0 && !isMongoConnected()) {
        // Wait for reconnection
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        ensureMongoConnected();
      }
      
      return await dbOperation();
    } catch (error) {
      lastError = error;
      
      // If it's a connection error and we have retries left, retry
      if (
        (error.name === 'MongoServerSelectionError' || 
         error.name === 'MongoNetworkError' ||
         error.message?.includes('ENOTFOUND') ||
         error.message?.includes('getaddrinfo')) &&
        attempt < maxRetries
      ) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }
      
      // Re-throw if it's not a connection error or no retries left
      throw error;
    }
  }
  
  // If we exhausted all retries, throw the last error with a user-friendly message
  throw new AppError(
    'Database service is temporarily unavailable. Please try again later or contact support.',
    503
  );
};

