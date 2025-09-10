const express = require('express');
const router = express.Router();

// Import middleware
const { protect, requireAdmin } = require('../middlewares/auth');
const { validatePagination } = require('../middlewares/validation');

// Import controllers (to be implemented)
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, isActive } = req.query;

  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (page - 1) * limit;
  const users = await User.find(query)
    .select('-refreshTokens')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    },
    message: 'Users retrieved successfully'
  });
});

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private (Admin)
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-refreshTokens')
    .populate('reports', 'type status severity createdAt');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      }
    });
  }

  res.status(200).json({
    success: true,
    data: user,
    message: 'User retrieved successfully'
  });
});

// @desc    Get user statistics (Admin only)
// @route   GET /api/users/stats
// @access  Private (Admin)
const getUserStats = asyncHandler(async (req, res) => {
  const stats = await User.getUserStats();

  res.status(200).json({
    success: true,
    data: stats,
    message: 'User statistics retrieved successfully'
  });
});

// @desc    Get top contributors
// @route   GET /api/users/top-contributors
// @access  Public
const getTopContributors = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const users = await User.find({ isActive: true })
    .select('name email picture stats')
    .sort({ 'stats.points': -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: users,
    message: 'Top contributors retrieved successfully'
  });
});

// Apply middleware
router.use(protect);

// Routes
router.get('/', requireAdmin, validatePagination, getUsers);
router.get('/stats', requireAdmin, getUserStats);
router.get('/top-contributors', getTopContributors);
router.get('/:id', requireAdmin, getUserById);

module.exports = router; 