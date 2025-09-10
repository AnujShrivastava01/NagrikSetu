const asyncHandler = require('express-async-handler');
const AuthService = require('../services/authService');
const { sendWelcomeEmail } = require('../services/emailService');

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = asyncHandler(async (req, res) => {
  const { credential, idToken, access_token, role } = req.body;
  const token = credential || idToken || access_token;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Google token is required',
        statusCode: 400
      }
    });
  }

  try {
    const result = await AuthService.googleLogin(token, role);

    // Send welcome email for new users
    if (result.isNewUser && result.user.email) {
      try {
        await sendWelcomeEmail(result.user);
      } catch (emailError) {
        console.error('Welcome email failed:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      message: 'Login successful'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 401
      }
    });
  }
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Refresh token is required',
        statusCode: 400
      }
    });
  }

  try {
    const result = await AuthService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 401
      }
    });
  }
});

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Refresh token is required',
        statusCode: 400
      }
    });
  }

  try {
    await AuthService.logout(req.user._id, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400
      }
    });
  }
});

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
const logoutAllDevices = asyncHandler(async (req, res) => {
  try {
    await AuthService.logoutAllDevices(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400
      }
    });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      throw new Error('User not found in request');
    }
    
    const user = await AuthService.getUserProfile(req.user._id);

    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile retrieved successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 404
      }
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const user = await AuthService.updateUserProfile(req.user._id, req.body);

    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400
      }
    });
  }
});

// @desc    Get admin profile
// @route   GET /api/auth/admin-profile
// @access  Private (Admin)
const getAdminProfile = asyncHandler(async (req, res) => {
  try {
    const admin = await AuthService.getAdminProfile(req.user._id);

    res.status(200).json({
      success: true,
      data: admin,
      message: 'Admin profile retrieved successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 404
      }
    });
  }
});

// @desc    Update admin profile
// @route   PUT /api/auth/admin-profile
// @access  Private (Admin)
const updateAdminProfile = asyncHandler(async (req, res) => {
  try {
    const admin = await AuthService.updateAdminProfile(req.user._id, req.body);

    res.status(200).json({
      success: true,
      data: admin,
      message: 'Admin profile updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400
      }
    });
  }
});

// @desc    Change user role (Admin only)
// @route   PUT /api/auth/users/:userId/role
// @access  Private (Admin)
const changeUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !['user', 'admin'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Valid role is required (user or admin)',
        statusCode: 400
      }
    });
  }

  try {
    const user = await AuthService.changeUserRole(userId, role, req.user._id);

    res.status(200).json({
      success: true,
      data: user,
      message: `User role changed to ${role}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400
      }
    });
  }
});

// @desc    Deactivate user (Admin only)
// @route   PUT /api/auth/users/:userId/deactivate
// @access  Private (Admin)
const deactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await AuthService.deactivateUser(userId, req.user._id);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400
      }
    });
  }
});

// @desc    Reactivate user (Admin only)
// @route   PUT /api/auth/users/:userId/reactivate
// @access  Private (Admin)
const reactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await AuthService.reactivateUser(userId, req.user._id);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User reactivated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400
      }
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/auth/stats
// @access  Private (Admin)
const getUserStats = asyncHandler(async (req, res) => {
  try {
    const stats = await AuthService.getUserStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: 'User statistics retrieved successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400
      }
    });
  }
});

// @desc    Validate token
// @route   POST /api/auth/validate
// @access  Public
const validateToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Token is required',
        statusCode: 400
      }
    });
  }

  try {
    const user = await AuthService.validateToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token',
          statusCode: 401
        }
      });
    }

    res.status(200).json({
      success: true,
      user: user,
      message: 'Token is valid'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        statusCode: 401
      }
    });
  }
});

module.exports = {
  googleLogin,
  refreshToken,
  logout,
  logoutAllDevices,
  getProfile,
  updateProfile,
  getAdminProfile,
  updateAdminProfile,
  changeUserRole,
  deactivateUser,
  reactivateUser,
  getUserStats,
  validateToken
}; 