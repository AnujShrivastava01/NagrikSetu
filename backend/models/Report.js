const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter is required"],
    },
    // Backward-compatible specific type; broadened to cover civic issues
    type: {
      type: String,
      required: [true, "Issue type is required"],
      enum: [
        "pothole",
        "crack",
        "waterlogged",
        "debris",
        "signage",
        "streetlight",
        "garbage",
        "drainage",
        "treefall",
        "encroachment",
        "vandalism",
        "noise",
        "water_supply",
        "sewer",
        "electricity",
        "animal",
        "parking",
        "cleanliness",
        "other",
      ],
      lowercase: true,
    },
    // High-level category for filtering and routing
    category: {
      type: String,
      enum: [
        "roads",
        "lighting",
        "sanitation",
        "water",
        "sewer",
        "environment",
        "safety",
        "traffic",
        "public_property",
        "other",
      ],
      default: function () {
        // Map legacy road-only types to roads by default
        const roadTypes = new Set([
          "pothole",
          "crack",
          "waterlogged",
          "debris",
          "signage",
        ]);
        return roadTypes.has(this.type) ? "roads" : "other";
      },
    },
    severity: {
      type: String,
      required: [true, "Severity is required"],
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "verified", "in-progress", "resolved", "rejected"],
      default: "pending",
    },
    // Status history for audit trail
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "verified", "in-progress", "resolved", "rejected"],
          required: true,
        },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
    assignedDepartment: {
      type: String,
      enum: [
        "public_works",
        "sanitation",
        "electricity",
        "water",
        "traffic",
        "horticulture",
        "other",
      ],
      default: "public_works",
    },
    location: {
      address: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
      },
      coordinates: {
        latitude: {
          type: Number,
          required: [true, "Latitude is required"],
          min: -90,
          max: 90,
        },
        longitude: {
          type: Number,
          required: [true, "Longitude is required"],
          min: -180,
          max: 180,
        },
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    adminNotes: [
      {
        note: {
          type: String,
          required: true,
          trim: true,
        },
        admin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    contractor: {
      name: {
        type: String,
        trim: true,
      },
      contact: {
        phone: String,
        email: String,
      },
      assignedAt: Date,
      estimatedCompletion: Date,
    },
    verification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: Date,
      verificationNotes: String,
    },
    resolution: {
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      resolvedAt: Date,
      resolutionNotes: String,
      beforeImage: String,
      afterImage: String,
    },
    upvotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    downvotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    duplicateReports: [
      {
        report: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Report",
        },
        linkedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    estimatedCost: {
      type: Number,
      min: 0,
    },
    weatherConditions: {
      temperature: Number,
      humidity: Number,
      precipitation: String,
      windSpeed: Number,
    },
    // Add weather snapshot and update time
    weather: {
      type: Object,
      default: null,
    },
    weatherUpdatedAt: {
      type: Date,
      default: null,
    },
    trafficImpact: {
      type: String,
      enum: ["none", "low", "medium", "high", "severe"],
      default: "none",
    },
    safetyRisk: {
      type: String,
      enum: ["none", "low", "medium", "high", "critical"],
      default: "low",
    },
    aiAnalysis: {
      issueType: {
        type: String,
        enum: [
          "pothole",
          "crack",
          "waterlogged",
          "debris",
          "signage",
          "streetlight",
          "garbage",
          "drainage",
          "treefall",
          "encroachment",
          "vandalism",
          "noise",
          "water_supply",
          "sewer",
          "electricity",
          "animal",
          "parking",
          "cleanliness",
          "other",
        ],
      },
      severity: {
        type: String,
        enum: ["critical", "high", "medium", "low"],
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      description: String,
      details: {
        size: {
          type: String,
          enum: ["small", "medium", "large"],
        },
        location: {
          type: String,
          enum: [
            "road surface",
            "shoulder",
            "center",
            "edge",
            "intersection",
            "curve",
            "sidewalk",
            "pole",
            "drain",
            "manhole",
            "bin_area",
            "public_property",
            "building_front",
            "open_area",
          ],
        },
        trafficImpact: {
          type: String,
          enum: ["none", "low", "medium", "high", "severe"],
        },
        safetyRisk: {
          type: String,
          enum: ["none", "low", "medium", "high", "critical"],
        },
      },
      processingTime: Number,
      analyzedAt: {
        type: Date,
        default: Date.now,
      },
    },
    lastWeatherNotificationSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for vote count
reportSchema.virtual("voteCount").get(function () {
  const upvotesLength =
    this.upvotes && Array.isArray(this.upvotes) ? this.upvotes.length : 0;
  const downvotesLength =
    this.downvotes && Array.isArray(this.downvotes) ? this.downvotes.length : 0;
  return upvotesLength - downvotesLength;
});

// Virtual for age in days
reportSchema.virtual("ageInDays").get(function () {
  if (!this.createdAt) return 0;
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for is urgent
reportSchema.virtual("isUrgent").get(function () {
  return this.severity === "critical" || this.safetyRisk === "critical";
});

// Indexes for better query performance
reportSchema.index({ "location.coordinates": "2dsphere" });
reportSchema.index({ status: 1, severity: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ category: 1, status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ "location.city": 1, "location.state": 1 });

// Pre-save middleware to calculate priority
reportSchema.pre("save", function (next) {
  if (
    this.isModified("severity") ||
    this.isModified("trafficImpact") ||
    this.isModified("safetyRisk")
  ) {
    this.calculatePriority();
  }
  next();
});

// Method to calculate priority score
reportSchema.methods.calculatePriority = function () {
  let priority = 0;

  // Severity weight
  const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
  priority += severityWeights[this.severity] || 1;

  // Traffic impact weight
  const trafficWeights = { none: 0, low: 1, medium: 2, high: 3, severe: 4 };
  priority += trafficWeights[this.trafficImpact] || 0;

  // Safety risk weight
  const safetyWeights = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
  priority += safetyWeights[this.safetyRisk] || 1;

  // Age factor (older reports get higher priority)
  const ageInDays = this.ageInDays;
  if (ageInDays > 30) priority += 2;
  else if (ageInDays > 7) priority += 1;

  // Vote factor
  const voteCount = this.voteCount;
  if (voteCount > 10) priority += 2;
  else if (voteCount > 5) priority += 1;

  this.priority = Math.min(priority, 10);
};

// Method to add upvote
reportSchema.methods.addUpvote = function (userId) {
  // Remove existing vote from this user
  this.upvotes = this.upvotes.filter(
    (vote) => vote.user.toString() !== userId.toString()
  );
  this.downvotes = this.downvotes.filter(
    (vote) => vote.user.toString() !== userId.toString()
  );

  // Add upvote
  this.upvotes.push({ user: userId });
  this.calculatePriority();
  return this.save();
};

// Method to add downvote
reportSchema.methods.addDownvote = function (userId) {
  // Remove existing vote from this user
  this.upvotes = this.upvotes.filter(
    (vote) => vote.user.toString() !== userId.toString()
  );
  this.downvotes = this.downvotes.filter(
    (vote) => vote.user.toString() !== userId.toString()
  );

  // Add downvote
  this.downvotes.push({ user: userId });
  this.calculatePriority();
  return this.save();
};

// Method to add admin note
reportSchema.methods.addAdminNote = function (note, adminId) {
  this.adminNotes.push({
    note,
    admin: adminId,
  });
  return this.save();
};

// Method to update status
reportSchema.methods.updateStatus = function (newStatus, adminId, notes = "") {
  this.status = newStatus;
  // Append to status history
  try {
    this.statusHistory = this.statusHistory || [];
    this.statusHistory.push({
      status: newStatus,
      changedBy: adminId,
      notes,
      changedAt: new Date(),
    });
  } catch (_) {
    /* no-op */
  }

  if (newStatus === "verified") {
    this.verification = {
      verifiedBy: adminId,
      verifiedAt: new Date(),
      verificationNotes: notes,
    };
  } else if (newStatus === "resolved") {
    this.resolution = {
      resolvedBy: adminId,
      resolvedAt: new Date(),
      resolutionNotes: notes,
    };
  }

  return this.save();
};

// Static method to get reports by location
reportSchema.statics.getReportsByLocation = async function (
  lat,
  lng,
  radius = 5000
) {
  try {
    return await this.find({
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: radius,
        },
      },
      status: { $ne: "resolved" },
    }).populate("reporter", "name email picture");
  } catch (error) {
    throw new Error(`Error getting reports by location: ${error.message}`);
  }
};

// Static method to get report statistics
reportSchema.statics.getReportStats = async function () {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          pendingReports: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          verifiedReports: {
            $sum: { $cond: [{ $eq: ["$status", "verified"] }, 1, 0] },
          },
          inProgressReports: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          resolvedReports: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          criticalReports: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
          },
          highPriorityReports: {
            $sum: { $cond: [{ $gte: ["$priority", 7] }, 1, 0] },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalReports: 0,
        pendingReports: 0,
        verifiedReports: 0,
        inProgressReports: 0,
        resolvedReports: 0,
        criticalReports: 0,
        highPriorityReports: 0,
      }
    );
  } catch (error) {
    throw new Error(`Error getting report stats: ${error.message}`);
  }
};

// Static method to get reports by type
reportSchema.statics.getReportsByType = async function () {
  try {
    return await this.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          critical: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);
  } catch (error) {
    throw new Error(`Error getting reports by type: ${error.message}`);
  }
};

module.exports = mongoose.model("Report", reportSchema);
