const { validationResult, check } = require("express-validator");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        statusCode: 400,
        details: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
          value: error.value,
        })),
      },
    });
  }

  next();
};

// Validation rules for user registration
const validateUserRegistration = [
  check("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  check("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  handleValidationErrors,
];

// Validation rules for report creation
const validateReportCreation = [
  check("type")
    .isIn([
      "pothole",
      "streetlight",
      "garbage",
      "waterlogged",
      "cleanliness",
      "other",
    ])
    .withMessage("Invalid issue type"),
  check("category")
    .optional()
    .isIn(["roads", "lighting", "sanitation", "other"])
    .withMessage("Invalid category"),
  check("severity")
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid severity level"),
  check("location.address")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Address must be between 5 and 200 characters"),
  check("location.coordinates.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude value"),
  check("location.coordinates.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude value"),
  check("description")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  handleValidationErrors,
];

// Validation rules for report update
const validateReportUpdate = [
  check("type")
    .optional()
    .isIn([
      "pothole",
      "streetlight",
      "garbage",
      "waterlogged",
      "cleanliness",
      "other",
    ])
    .withMessage("Invalid issue type"),
  check("category")
    .optional()
    .isIn(["roads", "lighting", "sanitation", "other"])
    .withMessage("Invalid category"),
  check("severity")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid severity level"),
  check("status")
    .optional()
    .isIn(["pending", "verified", "in-progress", "resolved", "rejected"])
    .withMessage("Invalid status"),
  check("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  handleValidationErrors,
];

// Validation rules for user profile update
const validateUserProfileUpdate = [
  check("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  check("profile.phone")
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid phone number"),
  check("profile.address.street")
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Street address must be between 5 and 100 characters"),
  check("profile.address.city")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("City must be between 2 and 50 characters"),
  check("profile.address.state")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("State must be between 2 and 50 characters"),
  check("profile.address.zipCode")
    .optional()
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage("Please provide a valid ZIP code"),
  handleValidationErrors,
];

// Validation rules for admin actions
const validateAdminAction = [
  check("action")
    .isIn(["verify", "reject", "assign", "resolve", "note"])
    .withMessage("Invalid admin action"),
  check("notes")
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Notes must be between 5 and 500 characters"),
  check("contractor.name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Contractor name must be between 2 and 100 characters"),
  check("contractor.contact.email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid contractor email"),
  check("contractor.contact.phone")
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid contractor phone number"),
  handleValidationErrors,
];

// Validation rules for pagination
const validatePagination = [
  check("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  check("limit")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Limit must be between 1 and 100, or 0 for unlimited"),
  check("sort")
    .optional()
    .isIn(["createdAt", "updatedAt", "priority", "severity", "status"])
    .withMessage("Invalid sort field"),
  check("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be either asc or desc"),
  handleValidationErrors,
];

// Validation rules for search
const validateSearch = [
  check("q")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Search query must be between 2 and 100 characters"),
  check("type")
    .optional()
    .isIn([
      "pothole",
      "streetlight",
      "garbage",
      "waterlogged",
      "cleanliness",
      "other",
    ])
    .withMessage("Invalid issue type filter"),
  check("category")
    .optional()
    .isIn(["roads", "lighting", "sanitation", "other"])
    .withMessage("Invalid category filter"),
  check("status")
    .optional()
    .isIn(["pending", "verified", "in-progress", "resolved", "rejected"])
    .withMessage("Invalid status filter"),
  check("severity")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid severity filter"),
  check("priorityMin")
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage("priorityMin must be between 0 and 10"),
  check("priorityMax")
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage("priorityMax must be between 0 and 10"),
  check("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for dateFrom"),
  check("dateTo")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for dateTo"),
  handleValidationErrors,
];

// Validation rules for location-based queries
const validateLocationQuery = [
  check("lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude value"),
  check("lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude value"),
  check("radius")
    .optional()
    .isFloat({ min: 100, max: 50000 })
    .withMessage("Radius must be between 100 and 50000 meters"),
  // Optional bounding box params
  check("minLat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid minLat"),
  check("minLng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid minLng"),
  check("maxLat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid maxLat"),
  check("maxLng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid maxLng"),
  handleValidationErrors,
];

// Validation rules for file upload
const validateFileUpload = [
  check("images")
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage("You can upload between 1 and 5 images"),
  check("images.*")
    .optional()
    .isBase64()
    .withMessage("Images must be base64 encoded"),
  handleValidationErrors,
];

// Validation rules for voting
const validateVote = [
  check("vote")
    .isIn(["upvote", "downvote"])
    .withMessage("Vote must be either upvote or downvote"),
  handleValidationErrors,
];

// Validation rules for admin note
const validateAdminNote = [
  check("note")
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Note must be between 5 and 500 characters"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateReportCreation,
  validateReportUpdate,
  validateUserProfileUpdate,
  validateAdminAction,
  validatePagination,
  validateSearch,
  validateLocationQuery,
  validateFileUpload,
  validateVote,
  validateAdminNote,
};
