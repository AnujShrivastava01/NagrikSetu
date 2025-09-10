const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import controllers
const {
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
} = require('../controllers/authController');

// Import middleware
const { protect, authorize, requireAdmin } = require('../middlewares/auth');
const { validateUserProfileUpdate } = require('../middlewares/validation');

// Rate limiting for auth routes
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 requests per windowMs
//   message: {
//     success: false,
//     error: {
//       message: 'Too many authentication attempts, please try again later',
//       statusCode: 429
//     }
//   }
// });

// Public routes
router.options('/google', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(204).end();
});
router.post('/google', googleLogin);
router.post('/refresh', refreshToken);
router.post('/validate', validateToken);

// Test route to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

// Protected routes
router.use(protect); // Apply protection to all routes below

router.post('/logout', logout);
router.post('/logout-all', logoutAllDevices);
router.get('/profile', getProfile);
router.put('/profile', validateUserProfileUpdate, updateProfile);

// Admin routes
router.get('/admin-profile', requireAdmin, getAdminProfile);
router.put('/admin-profile', requireAdmin, updateAdminProfile);
router.get('/stats', requireAdmin, getUserStats);

// User management routes (Admin only)
router.put('/users/:userId/role', requireAdmin, changeUserRole);
router.put('/users/:userId/deactivate', requireAdmin, deactivateUser);
router.put('/users/:userId/reactivate', requireAdmin, reactivateUser);

module.exports = router; 