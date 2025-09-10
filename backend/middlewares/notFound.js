const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: {
        auth: '/api/auth',
        reports: '/api/reports',
        users: '/api/users',
        admin: '/api/admin',
        map: '/api/map',
        health: '/health'
      }
    }
  });
};

module.exports = notFound; 