const express = require('express');
const router = express.Router();

// Import middleware
const { protect } = require('../middlewares/auth');
const { validateLocationQuery, validatePagination } = require('../middlewares/validation');

// Import models and services
const asyncHandler = require('express-async-handler');
const Report = require('../models/Report');
const { processReportsWithGeocoding } = require('../utils/geocodingUtils');

// @desc    Get map data with reports
// @route   GET /api/map/data
// @access  Public
const getMapData = asyncHandler(async (req, res) => {
  console.log('Map data request received:', req.query);
  
  const { 
    lat, 
    lng, 
    radius = 10000, 
    type, 
    status, 
    severity,
    limit = 100 
  } = req.query;

  // Build query
  const query = {};

  // Location filter
  if (lat && lng) {
    query['location.coordinates.latitude'] = {
      $gte: parseFloat(lat) - (parseFloat(radius) / 111000), // Approximate degrees
      $lte: parseFloat(lat) + (parseFloat(radius) / 111000)
    };
    query['location.coordinates.longitude'] = {
      $gte: parseFloat(lng) - (parseFloat(radius) / (111000 * Math.cos(parseFloat(lat) * Math.PI / 180))),
      $lte: parseFloat(lng) + (parseFloat(radius) / (111000 * Math.cos(parseFloat(lat) * Math.PI / 180)))
    };
  }

  // Other filters
  if (type) query.type = type;
  if (status) query.status = status;
  if (severity) query.severity = severity;

  console.log('Query being executed:', JSON.stringify(query, null, 2));

  // Get reports
  let reports;
  try {
    reports = await Report.find(query)
    .populate('reporter', 'name email picture')
    .sort({ priority: -1, createdAt: -1 })
    .limit(parseInt(limit));
    
    console.log(`Found ${reports.length} reports`);
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }

  // Process reports to add proper addresses if they're missing
  const processedReports = await processReportsWithGeocoding(reports);

  // Get statistics for the area
  const stats = await Report.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      reports: processedReports,
      stats: stats[0] || {
        total: 0,
        pending: 0,
        verified: 0,
        inProgress: 0,
        resolved: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    },
    message: 'Map data retrieved successfully'
  });
});

// @desc    Get heatmap data
// @route   GET /api/map/heatmap
// @access  Public
const getHeatmapData = asyncHandler(async (req, res) => {
  const { 
    lat, 
    lng, 
    radius = 50000, 
    type, 
    status,
    resolution = 'medium' // low, medium, high
  } = req.query;

  // Build query
  const query = {};

  // Location filter
  if (lat && lng) {
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: parseFloat(radius)
      }
    };
  }

  // Other filters
  if (type) query.type = type;
  if (status) query.status = status;

  // Get heatmap data
  const heatmapData = await Report.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          lat: { $round: ['$location.coordinates.latitude', 3] },
          lng: { $round: ['$location.coordinates.longitude', 3] }
        },
        count: { $sum: 1 },
        avgPriority: { $avg: '$priority' },
        criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highCount: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        lat: '$_id.lat',
        lng: '$_id.lng',
        count: 1,
        avgPriority: 1,
        criticalCount: 1,
        highCount: 1,
        weight: {
          $add: [
            '$count',
            { $multiply: ['$criticalCount', 3] },
            { $multiply: ['$highCount', 2] }
          ]
        }
      }
    },
    { $sort: { weight: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: heatmapData,
    message: 'Heatmap data retrieved successfully'
  });
});

// @desc    Get cluster data
// @route   GET /api/map/clusters
// @access  Public
const getClusterData = asyncHandler(async (req, res) => {
  const { 
    lat, 
    lng, 
    radius = 50000, 
    zoom = 10,
    type, 
    status 
  } = req.query;

  // Build query
  const query = {};

  // Location filter
  if (lat && lng) {
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: parseFloat(radius)
      }
    };
  }

  // Other filters
  if (type) query.type = type;
  if (status) query.status = status;

  // Determine grid size based on zoom level
  const gridSize = Math.max(0.001, 1 / Math.pow(2, zoom - 10));

  // Get cluster data
  const clusterData = await Report.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          lat: { $round: ['$location.coordinates.latitude', 3] },
          lng: { $round: ['$location.coordinates.longitude', 3] }
        },
        count: { $sum: 1 },
        reports: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        _id: 0,
        lat: '$_id.lat',
        lng: '$_id.lng',
        count: 1,
        reports: {
          $slice: ['$reports', 5] // Limit to 5 reports per cluster
        }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: clusterData,
    message: 'Cluster data retrieved successfully'
  });
});

// @desc    Get nearby reports
// @route   GET /api/map/nearby
// @access  Public
const getNearbyReports = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5000, limit = 20 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Latitude and longitude are required',
        statusCode: 400
      }
    });
  }

  const reports = await Report.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: parseFloat(radius)
      }
    }
  })
  .populate('reporter', 'name email picture')
  .sort({ priority: -1, createdAt: -1 })
  .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: reports,
    message: 'Nearby reports retrieved successfully'
  });
});

// @desc    Get map statistics
// @route   GET /api/map/stats
// @access  Public
const getMapStats = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 50000 } = req.query;

  // Build query
  const query = {};

  // Location filter
  if (lat && lng) {
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: parseFloat(radius)
      }
    };
  }

  // Get statistics
  const stats = await Report.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalReports: { $sum: 1 },
        activeReports: { $sum: { $cond: [{ $ne: ['$status', 'resolved'] }, 1, 0] } },
        resolvedReports: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        criticalReports: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highPriorityReports: { $sum: { $cond: [{ $gte: ['$priority', 7] }, 1, 0] } },
        avgResolutionTime: { $avg: { $subtract: ['$resolution.resolvedAt', '$createdAt'] } }
      }
    }
  ]);

  // Get reports by type
  const reportsByType = await Report.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get reports by status
  const reportsByStatus = await Report.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: stats[0] || {
        totalReports: 0,
        activeReports: 0,
        resolvedReports: 0,
        criticalReports: 0,
        highPriorityReports: 0,
        avgResolutionTime: 0
      },
      reportsByType,
      reportsByStatus
    },
    message: 'Map statistics retrieved successfully'
  });
});

// Apply middleware - require authentication for all map routes
router.use(protect);

// Routes
router.get('/data', validateLocationQuery, getMapData);
router.get('/heatmap', validateLocationQuery, getHeatmapData);
router.get('/clusters', validateLocationQuery, getClusterData);
router.get('/nearby', validateLocationQuery, getNearbyReports);
router.get('/stats', validateLocationQuery, getMapStats);

module.exports = router; 