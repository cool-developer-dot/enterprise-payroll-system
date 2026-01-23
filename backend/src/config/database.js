import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DATABASE_NAME = process.env.DATABASE_NAME || 'payroll_system';

// Production-ready connection options (MongoDB driver compatible)
// Note: bufferMaxEntries and bufferCommands are Mongoose options, not MongoDB driver options
const connectionOptions = {
  serverSelectionTimeoutMS: 30000, // 30 seconds for production
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds for production
  maxPoolSize: 50, // Increased for production
  minPoolSize: 5, // Increased for production
  retryWrites: true,
  w: 'majority',
  // Retry configuration
  retryReads: true,
  // Connection pool settings
  maxIdleTimeMS: 30000,
};

const getConnectionString = () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  
  // Validate connection string format
  if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new Error('Invalid MongoDB connection string format. Must start with mongodb:// or mongodb+srv://');
  }
  
  // Check if database name is already in URI
  const hasDatabase = MONGODB_URI.match(/\/[^/?]+(\?|$)/);
  
  if (!hasDatabase && MONGODB_URI.includes('/')) {
    const separator = MONGODB_URI.endsWith('/') ? '' : '/';
    const hasQuery = MONGODB_URI.includes('?');
    const query = hasQuery ? '&' : '?';
    return `${MONGODB_URI}${separator}${DATABASE_NAME}${query}retryWrites=true&w=majority`;
  }
  
  return MONGODB_URI;
};

const getErrorMessage = (error) => {
  const errorMessage = error.message || String(error);
  
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('querySrv')) {
    return {
      type: 'DNS_NETWORK_ERROR',
      message: 'Cannot resolve MongoDB hostname or connection refused',
      troubleshooting: [
        'Check your internet connection',
        'Verify MongoDB Atlas cluster is running (not paused)',
        'Check if the connection string is correct',
        'Verify DNS resolution is working',
        'Check firewall settings',
        'Try using direct connection string instead of SRV',
      ],
    };
  }
  
  if (errorMessage.includes('authentication failed') || errorMessage.includes('bad auth')) {
    return {
      type: 'AUTH_ERROR',
      message: 'MongoDB authentication failed',
      troubleshooting: [
        'Verify username and password in connection string',
        'Check if database user exists in MongoDB Atlas',
        'Verify IP whitelist includes your current IP',
        'Check if user has proper permissions',
      ],
    };
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
    return {
      type: 'TIMEOUT_ERROR',
      message: 'Connection timeout',
      troubleshooting: [
        'Check your internet connection',
        'Verify MongoDB Atlas cluster is accessible',
        'Check firewall/network settings',
        'Try increasing connection timeout',
      ],
    };
  }
  
  // Handle unsupported options error (Mongoose 8+ compatibility)
  if (errorMessage.includes('buffermaxentries') || 
      errorMessage.includes('bufferMaxEntries') || 
      errorMessage.includes('bufferCommands') ||
      (errorMessage.includes('option') && errorMessage.includes('not supported'))) {
    return {
      type: 'CONFIGURATION_ERROR',
      message: 'Invalid MongoDB connection option detected. Mongoose 8+ removed deprecated buffer options.',
      troubleshooting: [
        'bufferMaxEntries and bufferCommands are no longer supported in Mongoose 8+',
        'These options have been removed from the configuration',
        'Connection should now work with corrected options',
        'If issue persists, check MongoDB driver version compatibility',
      ],
    };
  }
  
  return {
    type: 'UNKNOWN_ERROR',
    message: errorMessage,
    troubleshooting: [
      'Check MongoDB Atlas cluster status',
      'Verify connection string format',
      'Check network connectivity',
      'Review MongoDB Atlas logs',
      'Verify MongoDB driver version compatibility',
    ],
  };
};

const connectDB = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connectionString = getConnectionString();
      
      // Mask password in logs for security
      const maskedUri = connectionString.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3');
      
      console.log(`\n🔄 Attempting MongoDB connection (${attempt}/${retries})...`);
      console.log(`📍 Connection string: ${maskedUri}`);
      
      // Set Mongoose options (production-ready)
      // Note: In Mongoose 8+, bufferMaxEntries and bufferCommands are deprecated/removed
      // They are no longer needed or supported
      mongoose.set('strictQuery', false);
      
      // Add better error handling for DNS resolution issues with retry mechanism
      let connectionAttempt = null;
      let connectionError = null;
      
      try {
        // For SRV connections, add timeout to handle DNS resolution issues
        if (connectionString.includes('mongodb+srv://')) {
          connectionAttempt = Promise.race([
            mongoose.connect(connectionString, connectionOptions),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout: DNS resolution or connection exceeded 35 seconds')), 35000)
            )
          ]);
          await connectionAttempt;
        } else {
          await mongoose.connect(connectionString, connectionOptions);
        }
      } catch (err) {
        connectionError = err;
        // Check if it's a DNS/network error and retry with better handling
        if (err.message?.includes('ENOTFOUND') || 
            err.message?.includes('getaddrinfo') ||
            err.cause?.message?.includes('ENOTFOUND') ||
            err.message?.includes('MongoServerSelectionError') ||
            (err.reason?.error?.message && err.reason.error.message.includes('ENOTFOUND'))) {
          
          // For DNS errors, try to close any existing connection attempts and retry
          try {
            if (mongoose.connection.readyState !== 0) {
              await mongoose.connection.close();
            }
          } catch (closeErr) {
            // Ignore close errors
          }
          
          // If this is not the last attempt, continue to retry logic below
          if (attempt < retries) {
            // Will be caught by outer retry logic
            throw new Error(
              `DNS Resolution Failed (Attempt ${attempt}/${retries}): Cannot resolve MongoDB hostname. ` +
              `Error: ${err.message || err.cause?.message || 'Unknown DNS error'}. ` +
              `Retrying... Please ensure: 1) Internet connection is active, 2) MongoDB Atlas cluster is running (not paused), ` +
              `3) DNS servers are accessible (try 8.8.8.8 or 1.1.1.1), 4) Firewall allows MongoDB connections.`
            );
          } else {
            // Last attempt failed - provide detailed troubleshooting
          throw new Error(
              `DNS Resolution Failed after ${retries} attempts: Cannot resolve MongoDB hostname. ` +
              `Host: ${connectionString.match(/@([^/]+)/)?.[1] || 'unknown'}. ` +
              `Error: ${err.message || err.cause?.message || 'Unknown DNS error'}. ` +
              `Troubleshooting: 1) Verify internet connection, 2) Check MongoDB Atlas cluster status (not paused), ` +
              `3) Test DNS: nslookup ${connectionString.match(/@([^/]+)/)?.[1] || 'mongodb.net'}, ` +
              `4) Try different DNS server (8.8.8.8, 1.1.1.1), 5) Check firewall/proxy settings, ` +
              `6) Verify MongoDB Atlas Network Access allows your IP, 7) Try converting SRV to standard connection string.`
          );
        }
        }
        // Re-throw non-DNS errors
        throw err;
      }
      
      const conn = mongoose.connection;
      
      // Verify connection is actually established
      if (conn.readyState !== 1) {
        throw new Error('Connection established but readyState is not connected');
      }
      
      console.log(`\n✅ MongoDB Connected Successfully!`);
      console.log(`   Host: ${conn.host || 'N/A'}`);
      console.log(`   Database: ${conn.name || 'N/A'}`);
      console.log(`   Ready State: ${conn.readyState === 1 ? 'Connected' : 'Disconnected'}`);
      console.log(`   Connection Pool: ${connectionOptions.maxPoolSize} max connections\n`);

      // Verify indexes on connection (non-blocking)
      setImmediate(async () => {
        try {
          const { verifyAllIndexes } = await import('../utils/indexVerifier.js');
          await verifyAllIndexes();
        } catch (indexError) {
          console.warn('⚠️  Index verification failed:', indexError.message);
        }
      });
      
      // Handle connection events with better error handling
      conn.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
        const errorInfo = getErrorMessage(err);
        console.error(`   Error Type: ${errorInfo.type}`);
        if (process.env.NODE_ENV !== 'production') {
          console.error(`   Troubleshooting: ${errorInfo.troubleshooting.join(', ')}`);
        }
      });

      conn.on('disconnected', () => {
        if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️  MongoDB disconnected. Driver will attempt to reconnect automatically...');
        }
        // In production, log to monitoring service
        if (process.env.NODE_ENV === 'production') {
          console.error('[MONGO_DISCONNECTED] MongoDB connection lost. Attempting automatic reconnection...');
        }
      });

      conn.on('reconnected', () => {
        console.log('✅ MongoDB reconnected successfully');
        if (process.env.NODE_ENV === 'production') {
          console.log('[MONGO_RECONNECTED] MongoDB connection restored successfully');
        }
      });

      conn.on('connecting', () => {
        if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 MongoDB is connecting...');
        }
      });

      conn.on('connected', () => {
        if (process.env.NODE_ENV !== 'production') {
        console.log('✅ MongoDB connection established');
        }
      });
      
      // Handle topology description changes (cluster reconfigurations)
      conn.on('topologyDescriptionChanged', (event) => {
        if (event.newDescription.type === 'Unknown' || event.newDescription.type === 'ReplicaSetNoPrimary') {
          console.warn('⚠️  MongoDB topology changed. Connection may be temporarily unavailable.');
        }
      });

      // Graceful shutdown handler
      const shutdown = async (signal) => {
        console.log(`\n${signal} received. Closing MongoDB connection gracefully...`);
        try {
          await conn.close();
          console.log('✅ MongoDB connection closed gracefully');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error closing MongoDB connection:', error.message);
          process.exit(1);
        }
      };

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));

      return conn;
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      
      console.error(`\n❌ MongoDB Connection Failed (Attempt ${attempt}/${retries})`);
      console.error(`   Error Type: ${errorInfo.type}`);
      console.error(`   Message: ${errorInfo.message}`);
      
      // In production, don't expose full error details
      if (process.env.NODE_ENV === 'development') {
        console.error(`   Full Error: ${error.message || String(error)}`);
        if (error.stack) {
          console.error(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
        }
      }
      
      if (attempt < retries) {
        const waitTime = delay * attempt; // Exponential backoff
        console.error(`\n⏳ Retrying in ${(waitTime / 1000).toFixed(1)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`\n💡 Troubleshooting Steps:`);
        errorInfo.troubleshooting.forEach((step, index) => {
          console.error(`   ${index + 1}. ${step}`);
        });
        console.error(`\n📝 Production-Ready Solutions:`);
        console.error(`   1. Verify MONGODB_URI in .env file (format: mongodb+srv://user:pass@cluster/db)`);
        console.error(`   2. Check MongoDB Atlas cluster status (not paused)`);
        console.error(`   3. Verify IP whitelist in MongoDB Atlas Network Access`);
        console.error(`   4. Check Database User has correct permissions`);
        console.error(`   5. Test connection string directly: npm run test-connection`);
        console.error(`   6. For DNS issues, try alternative DNS (8.8.8.8, 1.1.1.1)`);
        console.error(`   7. If SRV fails, convert to standard connection string`);
        console.error(`\n❌ Failed to connect after ${retries} attempts with ${delay}ms delay.`);
        console.error(`   This is a critical error. Server cannot start without database connection.\n`);
        
        // In production, exit with proper code
        process.exit(1);
      }
    }
  }
  
  // This should never be reached, but TypeScript/ESLint may complain
  throw new Error('MongoDB connection failed after all retry attempts');
};

export default connectDB;
