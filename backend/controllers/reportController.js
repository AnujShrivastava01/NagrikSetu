const asyncHandler = require("express-async-handler");
const ReportService = require("../services/reportService");
const AIService = require("../services/aiService");
const {
  sendNewReportNotification,
  sendStatusUpdateNotification,
  sendContractorAssignmentNotification,
  sendReportSubmissionConfirmation,
} = require("../services/emailService");
const { processReportsWithGeocoding } = require("../utils/geocodingUtils");
const { getCurrentWeather } = require("../services/weatherService"); // Import weather service

// @desc    Create new report
// @route   POST /api/reports
// @access  Private
const createReport = asyncHandler(async (req, res) => {
  try {
    // Save the report to the database with minimal data
    const report = await ReportService.createReport(
      { ...req.body },
      req.user._id
    );

    // Respond to the frontend immediately
    res.status(201).json({
      success: true,
      data: report,
      message: "Report created successfully",
    });

    // Do slow tasks in the background
    setImmediate(async () => {
      let weather = null;
      let weatherError = null;
      if (req.body.location && req.body.location.coordinates) {
        const { latitude, longitude } = req.body.location.coordinates;
        try {
          weather = await getCurrentWeather(latitude, longitude);
          if (weather && weather.error) weatherError = weather.error;
        } catch (err) {
          weatherError = err.message;
          console.error(
            "Weather fetch failed during report creation:",
            err.message
          );
        }
      }
      try {
        // Update report with weather info
        report.weather = weather;
        report.weatherUpdatedAt = weather ? new Date() : null;
        report.weatherError = weatherError;
        await report.save();
      } catch (err) {
        console.error("Failed to update report with weather:", err);
      }
      // Emit real-time events for immediate updates
      try {
        const io = req.app.get("io");
        io.emit("report:new", report);
        io.emit("user:stats:update", { userId: req.user._id });
        io.emit("admin:stats:update");
      } catch (err) {
        console.error("Socket emit failed:", err);
      }
      // Send professional email notification to admins
      let emailLog = [];
      try {
        await sendNewReportNotification(report, req.user);
        emailLog.push({
          type: "new_report",
          status: "success",
          message: "Sent",
          timestamp: new Date(),
        });
      } catch (emailError) {
        emailLog.push({
          type: "new_report",
          status: "failure",
          message: emailError.message,
          timestamp: new Date(),
        });
        console.error("Email notification failed:", emailError);
      }
      try {
        await sendReportSubmissionConfirmation(report, req.user);
        emailLog.push({
          type: "other",
          status: "success",
          message: "User confirmation sent",
          timestamp: new Date(),
        });
      } catch (emailError) {
        emailLog.push({
          type: "other",
          status: "failure",
          message: emailError.message,
          timestamp: new Date(),
        });
        console.error("User confirmation email failed:", emailError);
      }
      try {
        report.emailNotificationLog = emailLog;
        await report.save();
      } catch (err) {
        console.error("Failed to update report with email log:", err);
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
const getReports = asyncHandler(async (req, res) => {
  try {
    const result = await ReportService.getReports(req.query, req.query);

    // Process reports with geocoding and fetch live weather
    if (result.reports && Array.isArray(result.reports)) {
      const geocodedReports = await processReportsWithGeocoding(result.reports);

      const reportsWithWeather = await Promise.all(
        geocodedReports.map(async (report) => {
          let weatherData = null;
          let weatherError = null;

          if (report.location && report.location.coordinates) {
            const { latitude, longitude } = report.location.coordinates;
            const weatherResult = await getCurrentWeather(
              latitude,
              longitude,
              report._id
            );

            if (weatherResult && !weatherResult.error) {
              weatherData = weatherResult;
              await ReportService.updateWeather(
                report._id,
                weatherData,
                new Date(),
                null
              );
            } else {
              weatherError =
                weatherResult.error || "Weather service unavailable.";
              await ReportService.updateWeather(
                report._id,
                null,
                report.weatherUpdatedAt,
                weatherError
              );
            }
          } else {
            weatherError = "No coordinates available for this report.";
            await ReportService.updateWeather(
              report._id,
              null,
              report.weatherUpdatedAt,
              weatherError
            );
          }

          // Attach latest data to the report object for the response
          report.weather = weatherData;
          report.weatherError = weatherError;
          report.weatherUpdatedAt = weatherData
            ? new Date()
            : report.weatherUpdatedAt;

          return report;
        })
      );

      result.reports = reportsWithWeather;
    }

    res.status(200).json({
      success: true,
      data: result,
      message: "Reports retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get report by ID
// @route   GET /api/reports/:id
// @access  Private
const getReportById = asyncHandler(async (req, res) => {
  try {
    const report = await ReportService.getReportById(req.params.id);

    res.status(200).json({
      success: true,
      data: report,
      message: "Report retrieved successfully",
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 404,
      },
    });
  }
});

// @desc    Update report
// @route   PUT /api/reports/:id
// @access  Private
const updateReport = asyncHandler(async (req, res) => {
  try {
    const report = await ReportService.updateReport(
      req.params.id,
      req.body,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: report,
      message: "Report updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private
const deleteReport = asyncHandler(async (req, res) => {
  try {
    await ReportService.deleteReport(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Update report status (Admin only)
// @route   PUT /api/reports/:id/status
// @access  Private (Admin)
const updateReportStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Status is required",
        statusCode: 400,
      },
    });
  }

  try {
    const report = await ReportService.updateReportStatus(
      req.params.id,
      status,
      req.user._id,
      notes
    );

    // Emit real-time events for immediate updates
    const io = req.app.get("io");
    io.emit("report:status", report);
    io.emit("user:stats:update", { userId: report.reporter });
    io.emit("admin:stats:update");

    // Send professional email notification to reporter
    try {
      await sendStatusUpdateNotification(report, status, req.user.name, notes);
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
    }

    res.status(200).json({
      success: true,
      data: report,
      message: `Report status updated to ${status}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Add admin note (Admin only)
// @route   POST /api/reports/:id/notes
// @access  Private (Admin)
const addAdminNote = asyncHandler(async (req, res) => {
  const { note } = req.body;

  if (!note) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Note is required",
        statusCode: 400,
      },
    });
  }

  try {
    const report = await ReportService.addAdminNote(
      req.params.id,
      note,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: report,
      message: "Admin note added successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Assign contractor (Admin only)
// @route   PUT /api/reports/:id/contractor
// @access  Private (Admin)
const assignContractor = asyncHandler(async (req, res) => {
  try {
    const report = await ReportService.assignContractor(
      req.params.id,
      req.body,
      req.user._id
    );

    // Emit real-time events for immediate updates
    const io = req.app.get("io");
    io.emit("contractor:assign", {
      reportId: report._id,
      contractor: report.contractor,
    });
    io.emit("user:stats:update", { userId: report.reporter });
    io.emit("admin:stats:update");

    // Send email notification to user about contractor assignment
    try {
      await sendContractorAssignmentNotification(
        report,
        report.contractor,
        req.user.name
      );
    } catch (emailError) {
      console.error(
        "Contractor assignment email notification failed:",
        emailError
      );
    }

    res.status(200).json({
      success: true,
      data: report,
      message: "Contractor assigned successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Vote on report
// @route   POST /api/reports/:id/vote
// @access  Private
const voteOnReport = asyncHandler(async (req, res) => {
  const { vote } = req.body;

  if (!vote || !["upvote", "downvote"].includes(vote)) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Valid vote is required (upvote or downvote)",
        statusCode: 400,
      },
    });
  }

  try {
    const report = await ReportService.voteOnReport(
      req.params.id,
      vote,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: report,
      message: `Vote ${vote} recorded successfully`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get user's reports
// @route   GET /api/reports/user/me
// @access  Private
const getUserReports = asyncHandler(async (req, res) => {
  try {
    const reports = await ReportService.getUserReports(req.user._id, req.query);

    // Process reports with geocoding
    const processedReports = await processReportsWithGeocoding(reports);

    res.status(200).json({
      success: true,
      data: processedReports,
      message: "User reports retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get reports by location
// @route   GET /api/reports/location
// @access  Public
const getReportsByLocation = asyncHandler(async (req, res) => {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Latitude and longitude are required",
        statusCode: 400,
      },
    });
  }

  try {
    const reports = await ReportService.getReportsByLocation(lat, lng, radius);

    res.status(200).json({
      success: true,
      data: reports,
      message: "Location-based reports retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get report statistics
// @route   GET /api/reports/stats
// @access  Private (Admin)
const getReportStats = asyncHandler(async (req, res) => {
  try {
    const stats = await ReportService.getReportStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: "Report statistics retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get reports by type
// @route   GET /api/reports/stats/by-type
// @access  Private (Admin)
const getReportsByType = asyncHandler(async (req, res) => {
  try {
    const stats = await ReportService.getReportsByType();

    res.status(200).json({
      success: true,
      data: stats,
      message: "Reports by type retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Analytics by category and response times
// @route   GET /api/reports/stats/by-category
// @access  Private (Admin)
const getReportsByCategory = asyncHandler(async (req, res) => {
  try {
    const Report = require("../models/Report");
    const stats = await Report.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message, statusCode: 400 },
    });
  }
});

// @desc    Response time stats (submit->resolve)
// @route   GET /api/reports/stats/response-times
// @access  Private (Admin)
const getResponseTimeStats = asyncHandler(async (req, res) => {
  try {
    const Report = require("../models/Report");
    const stats = await Report.aggregate([
      { $match: { "resolution.resolvedAt": { $ne: null } } },
      {
        $project: {
          responseHours: {
            $divide: [
              { $subtract: ["$resolution.resolvedAt", "$createdAt"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: "$responseHours" },
          minHours: { $min: "$responseHours" },
          maxHours: { $max: "$responseHours" },
        },
      },
    ]);
    res.status(200).json({
      success: true,
      data: stats[0] || { avgHours: 0, minHours: 0, maxHours: 0 },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message, statusCode: 400 },
    });
  }
});

// @desc    Get urgent reports
// @route   GET /api/reports/urgent
// @access  Private (Admin)
const getUrgentReports = asyncHandler(async (req, res) => {
  try {
    const reports = await ReportService.getUrgentReports();

    res.status(200).json({
      success: true,
      data: reports,
      message: "Urgent reports retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get recent reports
// @route   GET /api/reports/recent
// @access  Public
const getRecentReports = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  try {
    const reports = await ReportService.getRecentReports(limit);

    res.status(200).json({
      success: true,
      data: reports,
      message: "Recent reports retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Search reports
// @route   GET /api/reports/search
// @access  Public
const searchReports = asyncHandler(async (req, res) => {
  const { q, ...filters } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Search query is required",
        statusCode: 400,
      },
    });
  }

  try {
    const reports = await ReportService.searchReports(q, filters);

    res.status(200).json({
      success: true,
      data: reports,
      message: "Search results retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get duplicate reports
// @route   GET /api/reports/:id/duplicates
// @access  Private (Admin)
const getDuplicateReports = asyncHandler(async (req, res) => {
  try {
    const duplicates = await ReportService.getDuplicateReports(req.params.id);

    res.status(200).json({
      success: true,
      data: duplicates,
      message: "Duplicate reports retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Link duplicate reports
// @route   POST /api/reports/:id/link-duplicates
// @access  Private (Admin)
const linkDuplicateReports = asyncHandler(async (req, res) => {
  const { duplicateIds } = req.body;

  if (!duplicateIds || !Array.isArray(duplicateIds)) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Duplicate IDs array is required",
        statusCode: 400,
      },
    });
  }

  try {
    const report = await ReportService.linkDuplicateReports(
      req.params.id,
      duplicateIds
    );

    res.status(200).json({
      success: true,
      data: report,
      message: "Duplicate reports linked successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Analyze image with AI
// @route   POST /api/reports/analyze-image
// @access  Private
const analyzeImage = asyncHandler(async (req, res) => {
  try {
    // Check if image file is provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Image file is required",
          statusCode: 400,
        },
      });
    }

    // Analyze image with AI
    const analysis = await AIService.analyzeRoadImage(
      req.file.buffer,
      req.file.mimetype
    );

    // Optionally persist analysis onto a report if reportId provided
    const { reportId } = req.body || {};
    if (reportId && analysis && analysis.data) {
      try {
        const Report = require("../models/Report");
        const report = await Report.findById(reportId);
        if (report) {
          report.aiAnalysis = analysis.data;
          // If confident and type is recognized, suggest/update type & category
          if (analysis.data.confidence >= 0.6 && analysis.data.issueType) {
            // Whitelist issue types
            const allowedTypes = new Set([
              "pothole",
              "streetlight",
              "garbage",
              "waterlogged",
              "cleanliness",
              "other",
            ]);
            const aiType = allowedTypes.has(analysis.data.issueType)
              ? analysis.data.issueType
              : "other";
            report.type = aiType;

            // Derive limited categories
            const typeToCategory = {
              pothole: "roads",
              streetlight: "lighting",
              garbage: "sanitation",
              cleanliness: "sanitation",
              waterlogged: "other",
              other: "other",
            };
            report.category = typeToCategory[aiType] || "other";
          }
          await report.save();
        }
      } catch (persistErr) {
        console.error(
          "Failed to persist AI analysis to report:",
          persistErr.message
        );
      }
    }

    res.status(200).json({
      success: true,
      data: analysis.data,
      message: "Image analyzed successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Get AI analysis statistics
// @route   GET /api/reports/ai-stats
// @access  Private (Admin)
const getAIAnalysisStats = asyncHandler(async (req, res) => {
  try {
    const stats = await AIService.getAIAnalysisStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: "AI analysis statistics retrieved successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
      },
    });
  }
});

// @desc    Refresh weather for all reports (Admin only)
// @route   POST /api/reports/refresh-weather
// @access  Private (Admin)
const refreshWeatherForAllReports = asyncHandler(async (req, res) => {
  try {
    const allReports = await ReportService.getReports({}, {});
    let updatedCount = 0;
    if (allReports.reports && Array.isArray(allReports.reports)) {
      for (let i = 0; i < allReports.reports.length; i++) {
        const report = allReports.reports[i];
        if (report.location && report.location.coordinates) {
          const { latitude, longitude } = report.location.coordinates;
          try {
            const weather = await getCurrentWeather(latitude, longitude);
            if (weather) {
              await ReportService.updateWeather(
                report._id,
                weather,
                new Date()
              );
              updatedCount++;
            }
          } catch (err) {
            console.error(
              `Weather refresh failed for report ${report._id}:`,
              err.message
            );
          }
        }
      }
    }
    res.status(200).json({
      success: true,
      message: `Weather refreshed for ${updatedCount} reports.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 500,
      },
    });
  }
});

// Manual weather refresh endpoint
const refreshWeatherForReport = asyncHandler(async (req, res) => {
  try {
    const report = await ReportService.getReportById(req.params.id);
    if (!report || !report.location || !report.location.coordinates) {
      return res
        .status(404)
        .json({ success: false, message: "Report or coordinates not found" });
    }
    const { latitude, longitude } = report.location.coordinates;
    const weather = await getCurrentWeather(latitude, longitude, report._id);
    report.weather = weather;
    report.weatherUpdatedAt = new Date();
    if (weather && weather.error) report.weatherError = weather.error;
    else report.weatherError = null;
    await report.save();
    res.json({ success: true, weather });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Email log fetch endpoint
const getEmailLogForReport = asyncHandler(async (req, res) => {
  try {
    const report = await ReportService.getReportById(req.params.id);
    if (!report)
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    res.json({
      success: true,
      emailNotificationLog: report.emailNotificationLog || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = {
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
  refreshWeatherForReport,
  getEmailLogForReport,
};
