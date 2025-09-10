const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Import Report model for virtual population
const Report = require("./Report");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    picture: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    profile: {
      phone: {
        type: String,
        trim: true,
      },
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
          type: String,
          default: "USA",
        },
      },
      preferences: {
        notifications: {
          email: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
        },
        language: {
          type: String,
          default: "en",
        },
      },
    },
    stats: {
      reportsSubmitted: {
        type: Number,
        default: 0,
      },
      reportsResolved: {
        type: Number,
        default: 0,
      },
      reportsInProgress: {
        type: Number,
        default: 0,
      },
      reportsPending: {
        type: Number,
        default: 0,
      },
      reportsVerified: {
        type: Number,
        default: 0,
      },
      points: {
        type: Number,
        default: 0,
      },
      level: {
        type: String,
        enum: ["Bronze", "Silver", "Gold", "Platinum"],
        default: "Bronze",
      },
    },
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 30 * 24 * 60 * 60, // 30 days
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return this.name;
});

// Virtual for report count
userSchema.virtual("reportCount").get(function () {
  return this.stats.reportsSubmitted;
});

// Virtual for user's reports
userSchema.virtual("reports", {
  ref: "Report",
  localField: "_id",
  foreignField: "reporter",
  justOne: false,
});

// Ensure virtuals are included when converting to JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// Index for better query performance
userSchema.index({ email: 1 }, { unique: true }); // Ensure email uniqueness
userSchema.index({ email: 1, role: 1 });
userSchema.index({ "stats.reportsSubmitted": -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to check admin role based on email and ensure stats exist
userSchema.pre("save", function (next) {
  if (this.isModified("email")) {
    // Hardcoded superadmin email - change this to your email
    const superAdminEmail = "nagriksetu@gmail.com";

    if (this.email.toLowerCase() === superAdminEmail.toLowerCase()) {
      this.role = "admin";
      this.isVerified = true;
    }
  }

  // Ensure stats object exists with all required fields
  if (!this.stats) {
    this.stats = {};
  }

  // Set defaults for any missing stats fields
  this.stats.reportsSubmitted = this.stats.reportsSubmitted || 0;
  this.stats.reportsResolved = this.stats.reportsResolved || 0;
  this.stats.reportsInProgress = this.stats.reportsInProgress || 0;
  this.stats.reportsPending = this.stats.reportsPending || 0;
  this.stats.reportsVerified = this.stats.reportsVerified || 0;
  this.stats.points = this.stats.points || 0;
  this.stats.level = this.stats.level || "Bronze";

  next();
});

// Method to update user stats
userSchema.methods.updateStats = function (type, increment = 1) {
  if (type === "reportSubmitted") {
    this.stats.reportsSubmitted += increment;
  } else if (type === "reportResolved") {
    this.stats.reportsResolved += increment;
  }

  // Update points and level
  this.stats.points =
    this.stats.reportsSubmitted * 10 + this.stats.reportsResolved * 20;

  if (this.stats.points >= 1000) {
    this.stats.level = "Platinum";
  } else if (this.stats.points >= 500) {
    this.stats.level = "Gold";
  } else if (this.stats.points >= 100) {
    this.stats.level = "Silver";
  } else {
    this.stats.level = "Bronze";
  }

  return this.save();
};

// Method to add refresh token
userSchema.methods.addRefreshToken = function (token) {
  this.refreshTokens.push({ token });
  return this.save();
};

// Method to remove refresh token
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
  return this.save();
};

// Method to check if user is admin
userSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

// Static method to find or create user from Google profile
userSchema.statics.findOrCreateFromGoogle = async function (googleProfile) {
  try {
    let user = await this.findOne({ googleId: googleProfile.sub });

    if (!user) {
      // Check if user exists with same email
      user = await this.findOne({ email: googleProfile.email });

      if (user) {
        // Update existing user with Google ID
        user.googleId = googleProfile.sub;
        user.picture = googleProfile.picture;
        user.isVerified = true;
        await user.save();
      } else {
        // Create new user
        user = await this.create({
          googleId: googleProfile.sub,
          email: googleProfile.email,
          name: googleProfile.name,
          picture: googleProfile.picture,
          isVerified: true,
        });
      }
    } else {
      // Update existing Google user
      user.name = googleProfile.name;
      user.picture = googleProfile.picture;
      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();
    }

    return user;
  } catch (error) {
    throw new Error(`Error in findOrCreateFromGoogle: ${error.message}`);
  }
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function () {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          adminUsers: { $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
          },
          totalReports: { $sum: "$stats.reportsSubmitted" },
          totalResolved: { $sum: "$stats.reportsResolved" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        adminUsers: 0,
        verifiedUsers: 0,
        totalReports: 0,
        totalResolved: 0,
      }
    );
  } catch (error) {
    throw new Error(`Error getting user stats: ${error.message}`);
  }
};

module.exports = mongoose.model("User", userSchema);
