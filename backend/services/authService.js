const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  // Generate JWT token
  static generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  // Generate refresh token
  static generateRefreshToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );
  }

  // Verify Google token (supports both ID tokens and access tokens)
  static async verifyGoogleToken(token) {
    try {
      console.log('Verifying Google token...');
      console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID);
      
      // First try to verify as ID token
      try {
        console.log('Attempting ID token verification...');
      const ticket = await googleClient.verifyIdToken({
          idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
        console.log('ID token verification successful');
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: payload.email_verified
      };
      } catch (idTokenError) {
        console.log('ID token verification failed, trying access token...');
        console.log('ID token error:', idTokenError.message);
        
        // If ID token verification fails, try as access token
        const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
        
        if (response.status !== 200) {
          throw new Error('Invalid Google token');
        }

        const userInfo = response.data;
        console.log('Access token verification successful');
        return {
          sub: userInfo.sub || userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          email_verified: userInfo.email_verified
        };
      }
    } catch (error) {
      console.log('Google token verification failed:', error.message);
      throw new Error('Invalid Google token');
    }
  }

  // Google OAuth login
  static async googleLogin(idToken, requestedRole = null) {
    try {
      console.log('🔐 Attempting Google login with token:', idToken ? 'Token provided' : 'No token');
      console.log('🎭 Requested role:', requestedRole);
      
      // Verify Google token
      const googleProfile = await this.verifyGoogleToken(idToken);
      console.log('✅ Google profile verified:', { email: googleProfile.email, name: googleProfile.name });

      if (!googleProfile.email_verified) {
        throw new Error('Google email not verified');
      }

      // Check for existing user with this email first
      let user = await User.findOne({ email: googleProfile.email });
      let isNewUser = false;
      
      if (user) {
        // User exists - update Google ID and picture if needed
        if (!user.googleId) {
          user.googleId = googleProfile.sub;
        }
        user.picture = googleProfile.picture;
        user.lastLogin = new Date();
        user.loginCount += 1;
        await user.save();
        console.log('👤 Existing user found:', { id: user._id, email: user.email, currentRole: user.role });
      } else {
        // Create new user
        user = await User.create({
          googleId: googleProfile.sub,
          email: googleProfile.email,
          name: googleProfile.name,
          picture: googleProfile.picture,
          isVerified: true,
          stats: {
            reportsSubmitted: 0,
            reportsResolved: 0,
            reportsInProgress: 0,
            reportsPending: 0,
            reportsVerified: 0,
            points: 0,
            level: 'Bronze'
          }
        });
        isNewUser = true;
        console.log('👤 New user created:', { id: user._id, email: user.email, currentRole: user.role });
      }
      
      // Handle role assignment based on requested role
      if (requestedRole) {
        console.log('🎯 Processing role request:', requestedRole);
        console.log('📧 User email:', googleProfile.email);
        console.log('🆕 Is new user:', isNewUser);
        console.log('👤 Current user role:', user.role);
        // Prevent role switching after registration
        if (requestedRole === 'admin') {
          if (isNewUser) {
            // New user can become admin
            console.log('🛠️ New user - allowing admin access');
            user.role = 'admin';
            user.isVerified = true;
            await user.save();
            console.log('✅ User role set to admin');
          } else if (user.role === 'admin') {
            // Existing admin can login as admin
            console.log('👑 Existing admin - allowing admin login');
            console.log('✅ Admin login successful');
          } else {
            // Existing user trying to become admin - denied
            console.log('⚠️ Existing user - admin access denied for security');
            throw new Error('Role switching is not allowed. You are registered as a regular user and cannot log in as admin. Please contact support if you need admin privileges.');
          }
        } else if (requestedRole === 'user') {
          if (isNewUser) {
            // New user becomes user
            console.log('👤 New user - setting as regular user');
            user.role = 'user';
            user.isVerified = true;
            await user.save();
            console.log('✅ User role set to user');
          } else if (user.role === 'user') {
            // Existing user can login as user
            console.log('👤 Existing user - allowing user login');
            console.log('✅ User login successful');
          } else if (user.role === 'admin') {
            // Admin trying to login as user - denied
            console.log('⚠️ Admin trying to login as user - denied');
            throw new Error('Role switching is not allowed. You are registered as an admin and cannot log in as a regular user. Please use the admin login option.');
          }
        }
      }

      // Generate tokens
      const accessToken = this.generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      // Add refresh token to user
      await user.addRefreshToken(refreshToken);

      // Handle admin profile creation/retrieval
      let adminProfile = null;
      if (user.role === 'admin') {
        console.log('🔧 Setting up admin profile for user:', user._id);
        adminProfile = await Admin.findOne({ user: user._id });
        
        if (!adminProfile) {
          // Create admin profile
          adminProfile = new Admin({
            user: user._id,
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
          console.log('✅ Admin profile created successfully');
        } else {
          console.log('✅ Existing admin profile found');
        }
      }

      // Return user data with proper structure
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role,
        isVerified: user.isVerified,
        stats: user.stats || {
          reportsSubmitted: 0,
          reportsResolved: 0,
          points: 0,
          level: 'Bronze'
        }
      };

      console.log('🎉 Login successful for:', userData.name, 'Role:', userData.role);
      
      return {
        user: userData,
        adminProfile,
        accessToken,
        refreshToken,
        isNewUser: false
      };
    } catch (error) {
      console.error('❌ Google login failed:', error.message);
      throw new Error(`Google login failed: ${error.message}`);
    }
  }

  // Refresh token
  static async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Find user
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if refresh token exists in user's tokens
      const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
      if (!tokenExists) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = this.generateToken(user._id);
      const newRefreshToken = this.generateRefreshToken(user._id);

      // Remove old refresh token and add new one
      await user.removeRefreshToken(refreshToken);
      await user.addRefreshToken(newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Logout
  static async logout(userId, refreshToken) {
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.removeRefreshToken(refreshToken);
      }
      return true;
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  // Logout from all devices
  static async logoutAllDevices(userId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokens = [];
        await user.save();
      }
      return true;
    } catch (error) {
      throw new Error(`Logout all devices failed: ${error.message}`);
    }
  }

  // Get user profile
  static async getUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .select('-refreshTokens')
        .populate({
          path: 'reports',
          select: 'type status severity createdAt location description',
          options: { lean: false }
        });

      // Also fetch reports directly from Report model as fallback
      const Report = require('../models/Report');
      let directReports = [];
      try {
        directReports = await Report.find({ reporter: userId })
          .select('type status severity createdAt location description')
          .sort({ createdAt: -1 });
      } catch (err) {
        directReports = [];
      }

      if (!user) {
        throw new Error('User not found');
      }

      // Ensure user.stats exists with defaults
      if (!user.stats) {
        user.stats = {
          reportsSubmitted: 0,
          reportsResolved: 0,
          points: 0,
          level: 'Bronze',
          reportsInProgress: 0,
          reportsPending: 0,
          reportsVerified: 0
        };
      }

      // Defensive: always default to array and handle undefined/null cases
      let reports = [];
      try {
        if (user.reports && Array.isArray(user.reports) && user.reports.length > 0) {
          reports = user.reports;
        } else if (user.reports && typeof user.reports === 'object' && user.reports.length !== undefined && user.reports.length > 0) {
          reports = Array.from(user.reports);
        } else {
          // Use direct reports from Report model as fallback
          reports = directReports;
        }
      } catch (err) {
        reports = directReports;
      }
      
      const reportsSubmitted = reports.length;
      const reportsResolved = reports.filter(report => report && report.status && report.status === 'resolved').length;
      const reportsInProgress = reports.filter(report => report && report.status && report.status === 'in-progress').length;
      const reportsPending = reports.filter(report => report && report.status && report.status === 'pending').length;
      const reportsVerified = reports.filter(report => report && report.status && report.status === 'verified').length;

      // Calculate points based on reports
      const points = reportsSubmitted * 10 + reportsResolved * 20;

      // Determine level based on points
      let level = 'Bronze';
      if (points >= 1000) level = 'Platinum';
      else if (points >= 500) level = 'Gold';
      else if (points >= 100) level = 'Silver';

      // Update user stats with calculated values
      user.stats = {
        reportsSubmitted,
        reportsResolved,
        points,
        level,
        reportsInProgress,
        reportsPending,
        reportsVerified
      };

      // Save updated stats to database
      try {
      await user.save();
      } catch (saveError) {
        // Continue without saving if there's an error
      }
      
      // Prepare return object
      const returnData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role,
        isVerified: user.isVerified,
        stats: user.stats,
        reports: reports,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      };

      return returnData;
    } catch (error) {
      console.error('❌ Error in getUserProfile:', error);
      throw new Error(`Get user profile failed: ${error.message}`);
    }
  }

  // Update user profile
  static async updateUserProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update allowed fields
      const allowedFields = ['name', 'profile'];
      for (const field of allowedFields) {
        if (updateData[field]) {
          user[field] = { ...user[field], ...updateData[field] };
        }
      }

      await user.save();
      return user;
    } catch (error) {
      throw new Error(`Update user profile failed: ${error.message}`);
    }
  }

  // Change user role (admin only)
  static async changeUserRole(userId, newRole, adminId) {
    try {
      // Check if admin has permission
      const admin = await Admin.findOne({ user: adminId });
      if (!admin || !admin.hasPermission('manage_users')) {
        throw new Error('Insufficient permissions');
      }
      // Prevent users from changing their own role
      if (userId.toString() === adminId.toString()) {
        throw new Error('Admins cannot change their own role for security reasons.');
      }
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      user.role = newRole;
      await user.save();
      // Create or update admin profile if role is admin
      if (newRole === 'admin') {
        await Admin.findOneAndUpdate(
          { user: userId },
          { user: userId, role: 'admin' },
          { upsert: true, new: true }
        );
      } else {
        // Remove admin profile if role is not admin
        await Admin.findOneAndDelete({ user: userId });
      }
      return user;
    } catch (error) {
      throw new Error(`Change user role failed: ${error.message}`);
    }
  }

  // Deactivate user (admin only)
  static async deactivateUser(userId, adminId) {
    try {
      // Check if admin has permission
      const admin = await Admin.findOne({ user: adminId });
      if (!admin || !admin.hasPermission('manage_users')) {
        throw new Error('Insufficient permissions');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.isActive = false;
      await user.save();

      return user;
    } catch (error) {
      throw new Error(`Deactivate user failed: ${error.message}`);
    }
  }

  // Reactivate user (admin only)
  static async reactivateUser(userId, adminId) {
    try {
      // Check if admin has permission
      const admin = await Admin.findOne({ user: adminId });
      if (!admin || !admin.hasPermission('manage_users')) {
        throw new Error('Insufficient permissions');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.isActive = true;
      await user.save();

      return user;
    } catch (error) {
      throw new Error(`Reactivate user failed: ${error.message}`);
    }
  }

  // Get user statistics
  static async getUserStats() {
    try {
      return await User.getUserStats();
    } catch (error) {
      throw new Error(`Get user stats failed: ${error.message}`);
    }
  }

  // Validate token
  static async validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-refreshTokens');
      
      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  // Get admin profile
  static async getAdminProfile(userId) {
    try {
      // First check if user exists and is admin
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.role !== 'admin') {
        throw new Error('User is not an admin');
      }

      const admin = await Admin.findOne({ user: userId })
        .populate('user', 'name email picture role');

      if (!admin) {
        // Create admin profile if it doesn't exist
        const newAdmin = new Admin({
          user: userId,
          role: 'admin',
          permissions: [
            'view_reports',
            'edit_reports',
            'delete_reports',
            'verify_reports',
            'assign_contractors',
            'manage_users',
            'view_analytics',
            'manage_settings'
          ],
          assignedRegions: [{
            city: 'All Cities',
            state: 'All States',
            zipCodes: ['*']
          }],
          isActive: true
        });
        await newAdmin.save();
        return newAdmin;
      }

      // Update admin stats if they don't exist or are outdated
      if (!admin.stats || !admin.stats.totalReportsManaged) {
        console.log('🔄 Initializing admin stats...');
        await admin.updateStats();
      }

      return admin;
    } catch (error) {
      throw new Error(`Get admin profile failed: ${error.message}`);
    }
  }

  // Update admin profile
  static async updateAdminProfile(userId, updateData) {
    try {
      const admin = await Admin.findOne({ user: userId });
      if (!admin) {
        throw new Error('Admin profile not found');
      }

      // Update allowed fields
      if (updateData.permissions) {
        admin.permissions = updateData.permissions;
      }
      if (updateData.assignedRegions) {
        admin.assignedRegions = updateData.assignedRegions;
      }
      if (updateData.preferences) {
        admin.preferences = { ...admin.preferences, ...updateData.preferences };
      }

      await admin.save();
      return admin;
    } catch (error) {
      throw new Error(`Update admin profile failed: ${error.message}`);
    }
  }
}

module.exports = AuthService; 
