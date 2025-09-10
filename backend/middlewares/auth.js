const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Protect routes - require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-refreshTokens');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            statusCode: 401
          }
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User account is deactivated',
            statusCode: 401
          }
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized, token failed',
          statusCode: 401
        }
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Not authorized, no token',
        statusCode: 401
      }
    });
  }
});

// Optional auth - user can be authenticated but not required
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-refreshTokens');
    } catch (error) {
      // Token is invalid, but we continue without user
      req.user = null;
    }
  }

  next();
});

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized, no token',
          statusCode: 401
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `User role ${req.user.role} is not authorized to access this route`,
          statusCode: 403
        }
      });
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = authorize('admin');

// Check if user is the owner or admin
const requireOwnerOrAdmin = (resourceUserIdField = 'reporter') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized, no token',
          statusCode: 401
        }
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is the owner
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user._id.toString() === resourceUserId?.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        message: 'Not authorized to access this resource',
        statusCode: 403
      }
    });
  };
};

// Rate limiting for auth routes
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// Google OAuth verification middleware
const verifyGoogleToken = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Google ID token is required',
        statusCode: 400
      }
    });
  }

  try {
    // Verify Google token (this would be implemented with google-auth-library)
    // For now, we'll assume the token is valid and extract user info
    req.googleToken = idToken;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid Google token',
        statusCode: 401
      }
    });
  }
});

module.exports = {
  protect,
  optionalAuth,
  authorize,
  requireAdmin,
  requireOwnerOrAdmin,
  authRateLimit,
  verifyGoogleToken
}; 