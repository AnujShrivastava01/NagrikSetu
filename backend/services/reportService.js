const Report = require("../models/Report");
const User = require("../models/User");
const Admin = require("../models/Admin");

class ReportService {
  // Create new report
  static async createReport(reportData, userId) {
    try {
      const report = new Report({
        ...reportData,
        reporter: userId,
      });

      // Auto-assign department based on category if not provided
      if (!report.assignedDepartment) {
        const categoryToDept = {
          roads: "public_works",
          lighting: "electricity",
          sanitation: "sanitation",
          water: "water",
          sewer: "sewer",
          environment: "horticulture",
          safety: "public_works",
          traffic: "traffic",
          public_property: "public_works",
          other: "public_works",
        };
        report.assignedDepartment =
          categoryToDept[report.category] || "public_works";
      }

      await report.save();

      // Update user stats
      const user = await User.findById(userId);
      if (user) {
        await user.updateStats("reportSubmitted");
      }

      // Update admin stats for all admins when new report is created
      console.log("🔄 Updating admin stats after new report creation...");
      const allAdmins = await Admin.find({ isActive: true });
      for (const adminUser of allAdmins) {
        try {
          await adminUser.updateStats();
        } catch (error) {
          console.error(
            "❌ Error updating stats for admin:",
            adminUser._id,
            error
          );
        }
      }

      return report;
    } catch (error) {
      throw new Error(`Create report failed: ${error.message}`);
    }
  }

  // Get all reports with filtering and pagination
  static async getReports(filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = "createdAt",
        order = "desc",
        type,
        category,
        status,
        severity,
        reporter,
        dateFrom,
        dateTo,
        q,
        priorityMin,
        priorityMax,
      } = filters;

      const {
        lat,
        lng,
        radius = 5000,
        minLat,
        minLng,
        maxLat,
        maxLng,
      } = pagination;

      // Build query
      const query = {};

      if (type) query.type = type;
      if (category) query.category = category;
      if (status) query.status = status;
      if (severity) query.severity = severity;
      if (reporter) query.reporter = reporter;

      // Priority range filter
      if (priorityMin !== undefined || priorityMax !== undefined) {
        query.priority = {};
        if (priorityMin !== undefined)
          query.priority.$gte = parseInt(priorityMin);
        if (priorityMax !== undefined)
          query.priority.$lte = parseInt(priorityMax);
      }

      // Date range filter
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      // Text search
      if (q) {
        query.$or = [
          { "location.address": { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { "location.city": { $regex: q, $options: "i" } },
          { "location.state": { $regex: q, $options: "i" } },
        ];
      }

      // Location-based query (radial)
      if (lat && lng) {
        query["location.coordinates"] = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: parseFloat(radius),
          },
        };
      }

      // Bounding box query (fallback using numeric comparisons)
      if (
        minLat !== undefined &&
        minLng !== undefined &&
        maxLat !== undefined &&
        maxLng !== undefined
      ) {
        query["location.coordinates.latitude"] = {
          $gte: parseFloat(minLat),
          $lte: parseFloat(maxLat),
        };
        query["location.coordinates.longitude"] = {
          $gte: parseFloat(minLng),
          $lte: parseFloat(maxLng),
        };
      }

      // Build sort object
      const sortObj = {};
      sortObj[sort] = order === "desc" ? -1 : 1;

      // Execute query
      const numericLimit = parseInt(limit);
      const unlimited = !Number.isFinite(numericLimit) || numericLimit <= 0;
      const skip = (parseInt(page) - 1) * (unlimited ? 0 : numericLimit);
      let queryExec = Report.find(query)
        .populate("reporter", "name email picture")
        .populate("verification.verifiedBy", "name email")
        .populate("resolution.resolvedBy", "name email")
        .sort(sortObj);
      if (!unlimited) {
        queryExec = queryExec.skip(skip).limit(numericLimit);
      }
      const reports = await queryExec;

      // Get total count
      const total = await Report.countDocuments(query);

      return {
        reports,
        pagination: {
          page: parseInt(page),
          limit: unlimited ? total : numericLimit,
          total,
          pages: unlimited ? 1 : Math.ceil(total / numericLimit || 1),
        },
      };
    } catch (error) {
      throw new Error(`Get reports failed: ${error.message}`);
    }
  }

  // Get all reports for a specific user (returns an array as controller expects)
  static async getUserReports(userId, query = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sort = "createdAt",
        order = "desc",
        status,
        severity,
        type,
        category,
      } = query;

      const filter = { reporter: userId };
      if (status) filter.status = status;
      if (severity) filter.severity = severity;
      if (type) filter.type = type;
      if (category) filter.category = category;

      const sortObj = {};
      sortObj[sort] = order === "desc" ? -1 : 1;

      const numericLimit = parseInt(limit);
      const unlimited = !Number.isFinite(numericLimit) || numericLimit <= 0;
      const skip = (parseInt(page) - 1) * (unlimited ? 0 : numericLimit);
      let queryExec = Report.find(filter)
        .populate("reporter", "name email picture")
        .populate("verification.verifiedBy", "name email")
        .populate("resolution.resolvedBy", "name email")
        .sort(sortObj);
      if (!unlimited) {
        queryExec = queryExec.skip(skip).limit(numericLimit);
      }
      const reports = await queryExec;

      return reports;
    } catch (error) {
      throw new Error(`Get user reports failed: ${error.message}`);
    }
  }

  // Get report by ID
  static async getReportById(reportId) {
    try {
      const report = await Report.findById(reportId)
        .populate("reporter", "name email picture")
        .populate("verification.verifiedBy", "name email")
        .populate("resolution.resolvedBy", "name email")
        .populate("adminNotes.admin", "name email")
        .populate("upvotes.user", "name email picture")
        .populate("downvotes.user", "name email picture");

      if (!report) {
        throw new Error("Report not found");
      }

      return report;
    } catch (error) {
      throw new Error(`Get report failed: ${error.message}`);
    }
  }

  // Update report
  static async updateReport(reportId, updateData, userId) {
    try {
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error("Report not found");
      }

      // Check if user can update this report
      if (report.reporter.toString() !== userId.toString()) {
        const user = await User.findById(userId);
        if (user.role !== "admin") {
          throw new Error("Not authorized to update this report");
        }
      }

      // Update allowed fields
      const allowedFields = [
        "type",
        "severity",
        "description",
        "location",
        "tags",
        "weather",
        "weatherUpdatedAt",
      ];
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          report[field] = updateData[field];
        }
      }

      await report.save();
      return report;
    } catch (error) {
      throw new Error(`Update report failed: ${error.message}`);
    }
  }

  // Delete report
  static async deleteReport(reportId, userId) {
    try {
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error("Report not found");
      }

      // Check if user can delete this report
      if (report.reporter.toString() !== userId.toString()) {
        const user = await User.findById(userId);
        if (user.role !== "admin") {
          throw new Error("Not authorized to delete this report");
        }
      }

      await Report.findByIdAndDelete(reportId);
      return true;
    } catch (error) {
      throw new Error(`Delete report failed: ${error.message}`);
    }
  }

  // Update report status (admin only)
  static async updateReportStatus(reportId, status, adminId, notes = "") {
    try {
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error("Report not found");
      }

      // Check if admin has permission
      const admin = await Admin.findOne({ user: adminId });
      if (!admin || !admin.hasPermission("edit_reports")) {
        throw new Error("Insufficient permissions");
      }

      await report.updateStatus(status, adminId, notes);

      // Update admin activity
      await admin.updateActivity(status === "resolved" ? "resolve" : "review");

      // Update admin stats for all admins when report status changes
      console.log("🔄 Updating admin stats after report status change...");
      const allAdmins = await Admin.find({ isActive: true });
      for (const adminUser of allAdmins) {
        try {
          await adminUser.updateStats();
        } catch (error) {
          console.error(
            "❌ Error updating stats for admin:",
            adminUser._id,
            error
          );
        }
      }

      // Update user stats for all status changes
      const user = await User.findById(report.reporter);
      if (user) {
        // Recalculate user stats based on all their reports
        const userReports = await Report.find({ reporter: report.reporter });
        const reportsSubmitted = userReports.length;
        const reportsResolved = userReports.filter(
          (r) => r.status === "resolved"
        ).length;
        const reportsInProgress = userReports.filter(
          (r) => r.status === "in-progress"
        ).length;
        const reportsPending = userReports.filter(
          (r) => r.status === "pending"
        ).length;
        const reportsVerified = userReports.filter(
          (r) => r.status === "verified"
        ).length;

        // Calculate points
        const points = reportsSubmitted * 10 + reportsResolved * 20;

        // Determine level
        let level = "Bronze";
        if (points >= 1000) level = "Platinum";
        else if (points >= 500) level = "Gold";
        else if (points >= 100) level = "Silver";

        // Update user stats
        user.stats = {
          reportsSubmitted,
          reportsResolved,
          reportsInProgress,
          reportsPending,
          reportsVerified,
          points,
          level,
        };

        await user.save();
      }

      return report;
    } catch (error) {
      throw new Error(`Update report status failed: ${error.message}`);
    }
  }

  // Add admin note
  static async addAdminNote(reportId, note, adminId) {
    try {
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error("Report not found");
      }

      // Check if admin has permission
      const admin = await Admin.findOne({ user: adminId });
      if (!admin || !admin.hasPermission("edit_reports")) {
        throw new Error("Insufficient permissions");
      }

      await report.addAdminNote(note, adminId);
      return report;
    } catch (error) {
      throw new Error(`Add admin note failed: ${error.message}`);
    }
  }

  // Update only weather fields (for internal use)
  static async updateWeather(
    reportId,
    weather,
    weatherUpdatedAt,
    weatherError
  ) {
    try {
      const report = await Report.findById(reportId);
      if (!report) {
        // Silently fail if report not found, as this is an internal service
        console.warn(
          `Attempted to update weather for non-existent report: ${reportId}`
        );
        return null;
      }
      report.weather = weather;
      if (weatherUpdatedAt) {
        report.weatherUpdatedAt = weatherUpdatedAt;
      }
      report.weatherError = weatherError; // Set or clear the error message
      await report.save();
      return report;
    } catch (error) {
      console.error(
        `Error updating weather for report ${reportId}:`,
        error.message
      );
      // Don't re-throw, as this is a background process
      return null;
    }
  }
}

module.exports = ReportService;
