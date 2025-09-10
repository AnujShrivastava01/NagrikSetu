const express = require("express");
const router = express.Router();
const multer = require("multer");

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Import controllers
const {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  updateReportStatus,
  addAdminNote,
  assignContractor,
  voteOnReport,
  getUserReports,
  getReportsByLocation,
  getReportStats,
  getReportsByType,
  getReportsByCategory,
  getResponseTimeStats,
  getUrgentReports,
  getRecentReports,
  searchReports,
  getDuplicateReports,
  linkDuplicateReports,
  analyzeImage,
  getAIAnalysisStats,
  refreshWeatherForAllReports,
} = require("../controllers/reportController");

// Import middleware
const { protect, requireAdmin, optionalAuth } = require("../middlewares/auth");
const {
  validateReportCreation,
  validateReportUpdate,
  validatePagination,
  validateSearch,
  validateLocationQuery,
  validateVote,
  validateAdminNote,
} = require("../middlewares/validation");

// All routes require authentication
router.use(protect); // Apply protection to all routes below

// Report CRUD operations
router.post("/", validateReportCreation, createReport);
router.get("/", validatePagination, getReports);
router.get("/user/me", getUserReports);
router.get("/location", validateLocationQuery, getReportsByLocation);
router.get("/recent", getRecentReports);
router.get("/search", validateSearch, searchReports);

// AI Analysis routes (must come before /:id routes)
router.post("/analyze-image", upload.single("image"), analyzeImage);
router.get("/ai-stats", requireAdmin, getAIAnalysisStats);

// Admin routes (must come before /:id routes)
router.get("/stats", requireAdmin, getReportStats);
router.get("/stats/by-type", requireAdmin, getReportsByType);
router.get("/stats/by-category", requireAdmin, getReportsByCategory);
router.get("/stats/response-times", requireAdmin, getResponseTimeStats);
router.get("/urgent", requireAdmin, getUrgentReports);
// Add admin endpoint to refresh weather for all reports
router.post("/refresh-weather", requireAdmin, async (req, res) => {
  return refreshWeatherForAllReports(req, res);
});

// Add test endpoint to check weather service
router.get("/test-weather", requireAdmin, async (req, res) => {
  try {
    const { getCurrentWeather } = require("../services/weatherService");
    const testWeather = await getCurrentWeather(21.250713, 81.61805); // Test coordinates
    res.json({
      success: true,
      weather: testWeather,
      message: testWeather
        ? "Weather service is working"
        : "Weather service returned null",
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      message: "Weather service is not working",
    });
  }
});

// Parameterized routes (must come last)
router.get("/:id", getReportById);
router.put("/:id", validateReportUpdate, updateReport);
router.delete("/:id", deleteReport);

// Voting
router.post("/:id/vote", validateVote, voteOnReport);

// Admin routes with ID parameter
router.put("/:id/status", requireAdmin, updateReportStatus);
router.post("/:id/notes", requireAdmin, validateAdminNote, addAdminNote);
router.put("/:id/contractor", requireAdmin, assignContractor);
router.get("/:id/duplicates", requireAdmin, getDuplicateReports);
router.post("/:id/link-duplicates", requireAdmin, linkDuplicateReports);

module.exports = router;
