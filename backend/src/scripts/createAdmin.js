import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import User from '../models/User.js';

dotenv.config();

/**
 * Script to create the first admin user
 * This should be run once during initial setup
 * Usage: node src/scripts/createAdmin.js
 */
const createAdmin = async () => {
  try {
    console.log('🔄 Initializing Admin User Creation...\n');

    // Connect to MongoDB
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin', status: 'active' });
    
    // Get admin details from environment variables or command line arguments
    let adminEmail = process.env.ADMIN_EMAIL || process.argv[2];
    let adminPassword = process.env.ADMIN_PASSWORD || process.argv[3];
    let adminName = process.env.ADMIN_NAME || process.argv[4] || 'System Administrator';
    let adminEmployeeId = process.env.ADMIN_EMPLOYEE_ID || process.argv[5] || 'ADM001';

    // Check if admin already exists
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Employee ID: ${existingAdmin.employeeId || 'N/A'}\n`);
      
      // Only prompt if not using command line args or env vars
      if (!adminEmail || !adminPassword) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise((resolve) => {
          rl.question('Do you want to create another admin user? (yes/no): ', resolve);
        });

        rl.close();

        if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
          console.log('✅ Exiting without creating new admin user.\n');
          process.exit(0);
        }
      } else {
        console.log('⚠️  Admin already exists, but credentials provided. Creating additional admin...\n');
      }
    }

    // If email or password not provided, use interactive mode
    if (!adminEmail || !adminPassword) {
      console.log('📝 Admin credentials not provided. Using interactive mode...\n');
      
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const question = (query) => new Promise((resolve) => rl.question(query, resolve));

      try {
        if (!adminEmail) {
          adminEmail = await question('Enter admin email address: ');
          if (!adminEmail || !adminEmail.trim() || !adminEmail.includes('@')) {
            console.error('❌ Error: Valid email address is required!');
            rl.close();
            process.exit(1);
          }
        }

        if (!adminPassword) {
          adminPassword = await question('Enter admin password (min 8 characters): ');
          if (!adminPassword || adminPassword.length < 8) {
            console.error('❌ Error: Password must be at least 8 characters long!');
            rl.close();
            process.exit(1);
          }
        }

        const nameResponse = await question(`Enter admin name [${adminName}]: `);
        if (nameResponse && nameResponse.trim()) {
          adminName = nameResponse.trim();
        }

        const empIdResponse = await question(`Enter employee ID [${adminEmployeeId}]: `);
        if (empIdResponse && empIdResponse.trim()) {
          adminEmployeeId = empIdResponse.trim();
        }
      } catch (error) {
        console.error('❌ Error reading input:', error.message);
        rl.close();
        process.exit(1);
      } finally {
        rl.close();
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      console.error('❌ Error: Invalid email format!');
      process.exit(1);
    }

    // Validate password strength (production-ready)
    if (adminPassword.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long!');
      console.error('   For production security, use a strong password with:');
      console.error('   - Minimum 12 characters');
      console.error('   - Mix of uppercase and lowercase letters');
      console.error('   - Numbers and special characters');
      process.exit(1);
    }

    // Warn if password is weak (but allow it)
    if (adminPassword.length < 12) {
      console.warn('⚠️  WARNING: Password is less than 12 characters. Consider using a stronger password for production.');
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase().trim() });
    if (existingUser) {
      console.error(`❌ Error: User with email ${adminEmail} already exists!`);
      console.log(`   Existing user role: ${existingUser.role}`);
      console.log(`   Existing user status: ${existingUser.status}`);
      process.exit(1);
    }

    // Check if employee ID is already taken
    if (adminEmployeeId) {
      const existingEmployeeId = await User.findOne({ employeeId: adminEmployeeId.trim() });
      if (existingEmployeeId) {
        console.error(`❌ Error: Employee ID ${adminEmployeeId} is already taken!`);
        process.exit(1);
      }
    }

    // Create admin user
    console.log('📝 Creating admin user...');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Employee ID: ${adminEmployeeId}`);
    console.log(`   Role: admin\n`);

    const adminUser = await User.create({
      email: adminEmail.toLowerCase().trim(),
      password: adminPassword, // Will be hashed by pre-save hook
      name: adminName.trim(),
      role: 'admin',
      employeeId: adminEmployeeId.trim(),
      status: 'active',
      isEmailVerified: true, // Admin email is considered verified
      profileCompletion: 100,
      joinDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   User ID: ${adminUser._id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Employee ID: ${adminUser.employeeId}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Status: ${adminUser.status}\n`);
    
    console.log('🔐 Security Notes:');
    console.log('   - Please change the default password after first login');
    console.log('   - Store admin credentials securely');
    console.log('   - Do not commit credentials to version control');
    console.log('   - Enable two-factor authentication if available\n');

    console.log('🎉 Setup complete! You can now login with the admin credentials.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      console.error(`   Duplicate ${field}: ${error.keyValue?.[field]}`);
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map((e) => e.message);
      console.error(`   Validation errors: ${errors.join(', ')}`);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check database connection');
    console.error('   - Verify email format is correct');
    console.error('   - Ensure password meets requirements (min 8 characters)');
    console.error('   - Check if user with same email/employee ID exists\n');
    
    process.exit(1);
  }
};

// Run the script
createAdmin();

