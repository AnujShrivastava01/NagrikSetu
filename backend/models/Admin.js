const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  permissions: [{
    type: String,
    enum: [
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
    default: ['view_reports', 'edit_reports', 'verify_reports']
  }],
  assignedRegions: [{
    city: String,
    state: String,
    zipCodes: [String]
  }],
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    dashboard: {
      defaultView: {
        type: String,
        enum: ['list', 'map', 'analytics'],
        default: 'list'
      },
      itemsPerPage: {
        type: Number,
        default: 20,
        min: 10,
        max: 100
      }
    },
    filters: {
      defaultStatus: {
        type: String,
        enum: ['all', 'pending', 'verified', 'in-progress'],
        default: 'pending'
      },
      defaultSeverity: {
        type: String,
        enum: ['all', 'low', 'medium', 'high', 'critical'],
        default: 'all'
      }
    }
  },
  activity: {
    lastActive: {
      type: Date,
      default: Date.now
    },
    reportsReviewed: {
      type: Number,
      default: 0
    },
    reportsResolved: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number, // in hours
      default: 0
    }
  },
  stats: {
    totalReportsManaged: {
      type: Number,
      default: 0
    },
    reportsResolved: {
      type: Number,
      default: 0
    },
    reportsInProgress: {
      type: Number,
      default: 0
    },
    reportsPending: {
      type: Number,
      default: 0
    },
    usersManaged: {
      type: Number,
      default: 0
    },
    averageResolutionTime: {
      type: Number,
      default: 0
    },
    efficiencyScore: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'moderator'],
    default: 'admin'
  }
}, {
  timestamps: true
});

// Indexes
adminSchema.index({ user: 1 });
adminSchema.index({ 'assignedRegions.city': 1, 'assignedRegions.state': 1 });
adminSchema.index({ role: 1, isActive: 1 });

// Method to check permission
adminSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.permissions.includes('super_admin');
};

// Method to add permission
adminSchema.methods.addPermission = function(permission) {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
  return this.save();
};

// Method to remove permission
adminSchema.methods.removePermission = function(permission) {
  this.permissions = this.permissions.filter(p => p !== permission);
  return this.save();
};

// Method to update activity
adminSchema.methods.updateActivity = function(action) {
  this.activity.lastActive = new Date();
  
  if (action === 'review') {
    this.activity.reportsReviewed += 1;
  } else if (action === 'resolve') {
    this.activity.reportsResolved += 1;
  }
  
  return this.save();
};

// Method to update admin stats
adminSchema.methods.updateStats = async function() {
  try {
    const Report = require('./Report');
    const User = require('./User');
    
    // Get all reports for admin statistics
    const allReports = await Report.find({});
    const totalReports = allReports.length;
    const resolvedReports = allReports.filter(r => r.status === 'resolved').length;
    const inProgressReports = allReports.filter(r => r.status === 'in-progress').length;
    const pendingReports = allReports.filter(r => r.status === 'pending').length;
    
    // Get total users managed
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    // Calculate average resolution time (in days)
    const resolvedReportsWithDates = allReports.filter(r => r.status === 'resolved' && r.resolution && r.resolution.resolvedAt && r.createdAt);
    let averageResolutionTime = 0;
    if (resolvedReportsWithDates.length > 0) {
      const totalDays = resolvedReportsWithDates.reduce((sum, report) => {
        const created = new Date(report.createdAt);
        const resolved = new Date(report.resolution.resolvedAt);
        const days = Math.ceil((resolved - created) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      averageResolutionTime = Math.round(totalDays / resolvedReportsWithDates.length);
    }
    
    // Calculate efficiency score based on resolution rate and speed
    const resolutionRate = totalReports > 0 ? (resolvedReports / totalReports) * 100 : 0;
    const efficiencyScore = Math.round((resolutionRate * 0.7) + (Math.max(0, 100 - averageResolutionTime) * 0.3));
    
    // Update stats
    this.stats = {
      totalReportsManaged: totalReports,
      reportsResolved: resolvedReports,
      reportsInProgress: inProgressReports,
      reportsPending: pendingReports,
      usersManaged: totalUsers,
      averageResolutionTime: averageResolutionTime,
      efficiencyScore: efficiencyScore
    };
    
    await this.save();
    console.log('✅ Admin stats updated:', this.stats);
    
    return this.stats;
  } catch (error) {
    console.error('❌ Error updating admin stats:', error);
    throw error;
  }
};

// Method to check if admin can manage region
adminSchema.methods.canManageRegion = function(city, state) {
  // Super admins can manage all regions
  if (this.role === 'super_admin') return true;
  
  // Check if admin is assigned to this region
  return this.assignedRegions.some(region => 
    region.city === city && region.state === state
  );
};

// Static method to get admin statistics
adminSchema.statics.getAdminStats = async function() {
  try {
    const stats = await this.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalAdmins: { $sum: 1 },
          superAdmins: { $sum: { $cond: [{ $eq: ['$role', 'super_admin'] }, 1, 0] } },
          moderators: { $sum: { $cond: [{ $eq: ['$role', 'moderator'] }, 1, 0] } },
          totalReviews: { $sum: '$activity.reportsReviewed' },
          totalResolutions: { $sum: '$activity.reportsResolved' },
          avgResponseTime: { $avg: '$activity.averageResponseTime' }
        }
      }
    ]);
    
    return stats[0] || {
      totalAdmins: 0,
      superAdmins: 0,
      moderators: 0,
      totalReviews: 0,
      totalResolutions: 0,
      avgResponseTime: 0
    };
  } catch (error) {
    throw new Error(`Error getting admin stats: ${error.message}`);
  }
};

// Static method to find admin by region
adminSchema.statics.findByRegion = async function(city, state) {
  try {
    return await this.find({
      isActive: true,
      $or: [
        { role: 'super_admin' },
        { 'assignedRegions': { $elemMatch: { city, state } } }
      ]
    }).populate('user', 'name email picture');
  } catch (error) {
    throw new Error(`Error finding admin by region: ${error.message}`);
  }
};

module.exports = mongoose.model('Admin', adminSchema);
