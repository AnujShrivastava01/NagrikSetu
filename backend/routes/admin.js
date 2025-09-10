const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Import middleware
const { protect, requireAdmin } = require("../middlewares/auth");
const { validatePagination } = require("../middlewares/validation");

// Import models and services
const asyncHandler = require("express-async-handler");
const Report = require("../models/Report");
const User = require("../models/User");
const Admin = require("../models/Admin");
const { processReportsWithGeocoding } = require("../utils/geocodingUtils");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure uploads directory exists with absolute path
    const fs = require("fs");
    const uploadDir = path.join(__dirname, "..", "uploads");

    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log("✅ Created uploads directory:", uploadDir);
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error("❌ Error creating uploads directory:", error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = file.fieldname + "-" + uniqueSuffix + extension;
    console.log("📁 Generated filename:", filename);
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardData = asyncHandler(async (req, res) => {
  // Get report statistics
  const reportStats = await Report.getReportStats();

  // Get user statistics
  const userStats = await User.getUserStats();

  // Get admin statistics
  const adminStats = await Admin.getAdminStats();

  // Get AI analysis statistics
  const aiService = require("../services/aiService");
  const aiStats = await aiService.getAIAnalysisStats();

  // Get recent reports
  const recentReports = await Report.find()
    .populate("reporter", "name email picture")
    .sort({ createdAt: -1 })
    .limit(5);

  // Get urgent reports
  const urgentReports = await Report.find({
    $or: [
      { severity: "critical" },
      { safetyRisk: "critical" },
      { priority: { $gte: 8 } },
    ],
    status: { $ne: "resolved" },
  })
    .populate("reporter", "name email picture")
    .sort({ priority: -1, createdAt: 1 })
    .limit(10);

  // Process reports with geocoding
  const processedRecentReports = await processReportsWithGeocoding(
    recentReports
  );
  const processedUrgentReports = await processReportsWithGeocoding(
    urgentReports
  );

  res.status(200).json({
    success: true,
    data: {
      reportStats,
      userStats,
      adminStats,
      aiStats,
      recentReports: processedRecentReports,
      urgentReports: processedUrgentReports,
    },
    message: "Dashboard data retrieved successfully",
  });
});

// @desc    Get admin activity
// @route   GET /api/admin/activity
// @access  Private (Admin)
const getAdminActivity = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;
  const admins = await Admin.find({ isActive: true })
    .populate("user", "name email picture")
    .sort({ "activity.lastActive": -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Admin.countDocuments({ isActive: true });

  res.status(200).json({
    success: true,
    data: {
      admins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
    message: "Admin activity retrieved successfully",
  });
});

// @desc    Get reports by admin
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getAdminReports = asyncHandler(async (req, res) => {
  const { adminId, page = 1, limit = 20 } = req.query;

  const query = {};
  if (adminId) {
    query.$or = [
      { "verification.verifiedBy": adminId },
      { "resolution.resolvedBy": adminId },
    ];
  }

  const skip = (page - 1) * limit;
  const reports = await Report.find(query)
    .populate("reporter", "name email picture")
    .populate("verification.verifiedBy", "name email")
    .populate("resolution.resolvedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Report.countDocuments(query);

  // Process reports with geocoding
  const processedReports = await processReportsWithGeocoding(reports);

  res.status(200).json({
    success: true,
    data: {
      reports: processedReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
    message: "Admin reports retrieved successfully",
  });
});

// Add this endpoint to return all reports with all fields populated
router.get(
  "/reports/all",
  asyncHandler(async (req, res) => {
    const reports = await Report.find({})
      .populate("reporter", "name email picture")
      .populate("verification.verifiedBy", "name email")
      .populate("resolution.resolvedBy", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { reports } });
  })
);

// @desc    Get admin analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin)
const getAdminAnalytics = asyncHandler(async (req, res) => {
  const { period = "30d" } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate;

  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get reports by date
  const reportsByDate = await Report.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get reports by type
  const reportsByType = await Report.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get reports by severity
  const reportsBySeverity = await Report.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$severity",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get top reporters
  const topReporters = await Report.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$reporter",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 1,
        count: 1,
        "user.name": 1,
        "user.email": 1,
        "user.picture": 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      period,
      reportsByDate,
      reportsByType,
      reportsBySeverity,
      topReporters,
    },
    message: "Analytics data retrieved successfully",
  });
});

// @desc    Get admin settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
const getAdminSettings = asyncHandler(async (req, res) => {
  const admin = await Admin.findOne({ user: req.user._id });

  if (!admin) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Admin profile not found",
        statusCode: 404,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: admin.preferences,
    message: "Admin settings retrieved successfully",
  });
});

// @desc    Update admin settings
// @route   PUT /api/admin/settings
// @access  Private (Admin)
const updateAdminSettings = asyncHandler(async (req, res) => {
  const admin = await Admin.findOne({ user: req.user._id });

  if (!admin) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Admin profile not found",
        statusCode: 404,
      },
    });
  }

  // Update preferences
  if (req.body.preferences) {
    admin.preferences = { ...admin.preferences, ...req.body.preferences };
  }

  await admin.save();

  res.status(200).json({
    success: true,
    data: admin.preferences,
    message: "Admin settings updated successfully",
  });
});

// @desc    Update report status
// @route   PATCH /api/admin/reports/:id/status
// @access  Private (Admin)
const updateReportStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes = "" } = req.body;

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Report not found",
        statusCode: 404,
      },
    });
  }

  // Use model method to ensure statusHistory and resolution.resolvedAt are maintained
  await report.updateStatus(status, req.user._id, notes);

  // Emit socket event for real-time updates
  const io = req.app.get("io");
  io.emit("report:status", report);

  res.status(200).json({
    success: true,
    data: report,
    message: "Report status updated successfully",
  });
});

// @desc    Assign contractor to report
// @route   PATCH /api/admin/reports/:id/assign
// @access  Private (Admin)
const assignContractor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { contractor } = req.body;

  console.log("👷 Contractor assignment request:", { id, contractor });

  const report = await Report.findById(id).populate("reporter", "name email");
  if (!report) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Report not found",
        statusCode: 404,
      },
    });
  }

  // Handle contractor assignment - can be string or object
  if (typeof contractor === "string") {
    // If contractor is just a name string, create proper structure
    report.contractor = {
      name: contractor,
      assignedAt: new Date(),
    };
  } else if (typeof contractor === "object") {
    // If contractor is an object, use it directly
    report.contractor = {
      ...contractor,
      assignedAt: new Date(),
    };
  } else {
    return res.status(400).json({
      success: false,
      error: {
        message: "Invalid contractor data",
        statusCode: 400,
      },
    });
  }

  // Add assignment metadata
  report.assignedAt = new Date();
  report.assignedBy = req.user._id;

  await report.save();

  console.log("✅ Contractor assigned successfully:", report.contractor);

  // Send email notification to user
  try {
    const {
      sendContractorAssignmentNotification,
    } = require("../services/emailService");
    await sendContractorAssignmentNotification(
      report,
      report.contractor,
      req.user.name
    );
  } catch (emailError) {
    console.error("Email notification failed:", emailError);
  }

  // Emit socket event for real-time updates
  const io = req.app.get("io");
  io.emit("report:status", report);
  io.emit("contractor:assign", {
    reportId: report._id,
    contractor: report.contractor,
    assignedBy: req.user.name,
  });

  res.status(200).json({
    success: true,
    data: report,
    message: "Contractor assigned successfully",
  });
});

// @desc    Add admin note to report
// @route   POST /api/admin/reports/:id/notes
// @access  Private (Admin)
const addAdminNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  // Validate note
  if (!note || note.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Note content is required",
        statusCode: 400,
      },
    });
  }

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Report not found",
        statusCode: 404,
      },
    });
  }

  if (!report.adminNotes) {
    report.adminNotes = [];
  }

  report.adminNotes.push({
    note: note.trim(),
    admin: req.user._id,
    createdAt: new Date(),
  });

  await report.save();

  // Emit socket event for real-time updates
  const io = req.app.get("io");
  io.emit("report:status", report);

  res.status(200).json({
    success: true,
    data: report,
    message: "Admin note added successfully",
  });
});

// @desc    Upload resolution image
// @route   POST /api/admin/reports/upload-image
// @access  Private (Admin)
const uploadResolutionImage = asyncHandler(async (req, res) => {
  const { reportId } = req.body;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        message: "No image file provided",
        statusCode: 400,
      },
    });
  }

  const report = await Report.findById(reportId);
  if (!report) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Report not found",
        statusCode: 404,
      },
    });
  }

  try {
    // Check if Cloudinary is configured
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error(
        "❌ Cloudinary not configured - please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment"
      );
      return res.status(500).json({
        success: false,
        error: {
          message:
            "Image upload service not configured. Please configure Cloudinary credentials.",
          statusCode: 500,
        },
      });
    }

    // Configure Cloudinary
    const cloudinary = require("cloudinary").v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    console.log("📤 Uploading image to Cloudinary:", req.file.path);

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "nagriksetu/resolution-images",
      transformation: [
        { width: 800, height: 600, crop: "limit" },
        { quality: "auto" },
      ],
    });

    console.log("✅ Image uploaded to Cloudinary:", result.secure_url);

    // Add image to report
    const imageData = {
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date(),
    };

    if (!report.images) {
      report.images = [];
    }
    report.images.push(imageData);

    await report.save();

    // Clean up local file after successful upload
    const fs = require("fs");
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("🗑️ Cleaned up local file:", req.file.path);
    }

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    io.emit("report:status", report);

    res.status(200).json({
      success: true,
      data: {
        image: imageData,
      },
      message: "Resolution image uploaded successfully to Cloudinary",
    });
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);

    // Clean up local file on error
    const fs = require("fs");
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("🗑️ Cleaned up local file on error:", req.file.path);
    }

    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to upload image to Cloudinary",
        statusCode: 500,
      },
    });
  }
});

// Apply middleware
router.use(protect);
router.use(requireAdmin);

// Routes
router.get("/dashboard", getDashboardData);
router.get("/activity", validatePagination, getAdminActivity);
router.get("/reports", validatePagination, getAdminReports);
router.get(
  "/reports/all",
  asyncHandler(async (req, res) => {
    const reports = await Report.find({})
      .populate("reporter", "name email picture")
      .populate("verification.verifiedBy", "name email")
      .populate("resolution.resolvedBy", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { reports } });
  })
);
router.get("/analytics", getAdminAnalytics);
router.get("/settings", getAdminSettings);
router.put("/settings", updateAdminSettings);

// Report management routes
router.patch("/reports/:id/status", updateReportStatus);
router.patch("/reports/:id/assign", assignContractor);
router.post("/reports/:id/notes", addAdminNote);

// Image upload route with error handling
router.post(
  "/reports/upload-image",
  (req, res, next) => {
    console.log("📤 Starting image upload...");

    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("❌ Multer error:", err);
        return res.status(400).json({
          success: false,
          error: {
            message:
              err.message === "File too large"
                ? "File size too large (max 5MB)"
                : err.message,
            statusCode: 400,
          },
        });
      } else if (err) {
        console.error("❌ Upload error:", err);
        return res.status(500).json({
          success: false,
          error: {
            message: err.message || "Failed to process upload",
            statusCode: 500,
          },
        });
      }

      console.log("✅ File uploaded successfully:", req.file);
      next();
    });
  },
  uploadResolutionImage
);

module.exports = router;
