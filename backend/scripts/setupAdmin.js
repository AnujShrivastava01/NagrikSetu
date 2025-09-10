const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const createAdminUser = async () => {
  try {
    console.log('🔧 Setting up admin user...');
    
    // Create admin user
    const adminUser = new User({
      email: 'admin@gmail.com',
      name: 'Admin User',
      role: 'admin',
      isVerified: true,
      isActive: true,
      picture: 'https://ui-avatars.com/api/?name=Admin+User&background=0D9488&color=fff',
      stats: {
        reportsSubmitted: 0,
        reportsResolved: 0,
        points: 0,
        level: 'Bronze'
      }
    });

    await adminUser.save();
    console.log('✅ Admin user created:', adminUser.email);

    // Create admin profile
    const adminProfile = new Admin({
      user: adminUser._id,
      role: 'super_admin',
      permissions: [
        'view_reports',
        'edit_reports',
        'delete_reports',
        'verify_reports',
        'assign_contractors',
        'manage_users',
        'view_analytics',
        'manage_settings',
        'super_admin'
      ],
      assignedRegions: [{
        city: 'All Cities',
        state: 'All States',
        zipCodes: ['*']
      }],
      isActive: true
    });

    await adminProfile.save();
    console.log('✅ Admin profile created');

    // Create regular user for testing
    const regularUser = new User({
      email: 'user@gmail.com',
      name: 'Regular User',
      role: 'user',
      isVerified: true,
      isActive: true,
      picture: 'https://ui-avatars.com/api/?name=Regular+User&background=3B82F6&color=fff',
      stats: {
        reportsSubmitted: 0,
        reportsResolved: 0,
        points: 0,
        level: 'Bronze'
      }
    });

    await regularUser.save();
    console.log('✅ Regular user created:', regularUser.email);

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📧 Test Accounts:');
    console.log('Admin: admin@gmail.com');
    console.log('User: user@gmail.com');
    console.log('\n💡 Use these emails to test Google OAuth login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
};

createAdminUser(); 