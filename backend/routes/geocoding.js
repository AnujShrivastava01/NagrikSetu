const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const geocodingService = require('../services/geocodingService');

// @desc    Forward geocoding: convert address to coordinates
// @route   POST /api/geocode/forward
// @access  Public
const forwardGeocode = asyncHandler(async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Address is required',
        statusCode: 400
      }
    });
  }

  try {
    const result = await geocodingService.forwardGeocode(address);
    
    if (result) {
      res.status(200).json({
        success: true,
        data: result,
        message: 'Address geocoded successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          message: 'Address not found',
          statusCode: 404
        }
      });
    }
  } catch (error) {
    console.error('Forward geocoding error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Geocoding service error',
        statusCode: 500
      }
    });
  }
});

// @desc    Reverse geocoding: convert coordinates to address
// @route   POST /api/geocode/reverse
// @access  Public
const reverseGeocode = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Latitude and longitude are required',
        statusCode: 400
      }
    });
  }

  try {
    const result = await geocodingService.reverseGeocode(latitude, longitude);
    
    if (result) {
      res.status(200).json({
        success: true,
        data: result,
        message: 'Coordinates reverse geocoded successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          message: 'Location not found',
          statusCode: 404
        }
      });
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Geocoding service error',
        statusCode: 500
      }
    });
  }
});

// @desc    Batch reverse geocoding: convert multiple coordinates to addresses
// @route   POST /api/geocode/batch-reverse
// @access  Public
const batchReverseGeocode = asyncHandler(async (req, res) => {
  const { coordinates } = req.body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Coordinates array is required',
        statusCode: 400
      }
    });
  }

  if (coordinates.length > 50) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Maximum 50 coordinates allowed per request',
        statusCode: 400
      }
    });
  }

  try {
    const results = await geocodingService.batchReverseGeocode(coordinates);
    
    res.status(200).json({
      success: true,
      data: results,
      message: 'Batch reverse geocoding completed'
    });
  } catch (error) {
    console.error('Batch reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Geocoding service error',
        statusCode: 500
      }
    });
  }
});

// Routes
router.post('/forward', forwardGeocode);
router.post('/reverse', reverseGeocode);
router.post('/batch-reverse', batchReverseGeocode);

module.exports = router; 