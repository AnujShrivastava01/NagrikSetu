const geocodingService = require('../services/geocodingService');

/**
 * Process reports with geocoding to convert coordinates to addresses
 * @param {Array} reports - Array of report objects
 * @returns {Array} - Processed reports with proper addresses
 */
const processReportsWithGeocoding = async (reports) => {
  if (!Array.isArray(reports)) {
    return reports;
  }

  return await Promise.all(reports.map(async (report) => {
    const reportObj = report.toObject ? report.toObject() : report;
    
    // Check if the address is just coordinates (e.g., "40.7128, -74.0060")
    const isCoordinateAddress = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(reportObj.location.address);
    
    if (isCoordinateAddress) {
      try {
        // Use reverse geocoding to get proper address
        const geocodedAddress = await geocodingService.reverseGeocode(
          reportObj.location.coordinates.latitude,
          reportObj.location.coordinates.longitude
        );
        
        if (geocodedAddress) {
          reportObj.location.address = geocodedAddress.address;
          reportObj.location.city = geocodedAddress.city;
          reportObj.location.state = geocodedAddress.state;
          reportObj.location.zipCode = geocodedAddress.zipCode;
        } else {
          // Fallback: format coordinates nicely
          const lat = parseFloat(reportObj.location.coordinates.latitude).toFixed(6);
          const lng = parseFloat(reportObj.location.coordinates.longitude).toFixed(6);
          reportObj.location.address = `📍 Location (${lat}, ${lng})`;
        }
      } catch (error) {
        console.error(`Error geocoding report ${reportObj._id}:`, error.message);
        // Fallback: format coordinates nicely
        const lat = parseFloat(reportObj.location.coordinates.latitude).toFixed(6);
        const lng = parseFloat(reportObj.location.coordinates.longitude).toFixed(6);
        reportObj.location.address = `📍 Location (${lat}, ${lng})`;
      }
    }
    
    return reportObj;
  }));
};

/**
 * Process a single report with geocoding
 * @param {Object} report - Single report object
 * @returns {Object} - Processed report with proper address
 */
const processSingleReportWithGeocoding = async (report) => {
  if (!report) {
    return report;
  }

  const reportObj = report.toObject ? report.toObject() : report;
  
  // Check if the address is just coordinates
  const isCoordinateAddress = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(reportObj.location.address);
  
  if (isCoordinateAddress) {
    try {
      const geocodedAddress = await geocodingService.reverseGeocode(
        reportObj.location.coordinates.latitude,
        reportObj.location.coordinates.longitude
      );
      
      if (geocodedAddress) {
        reportObj.location.address = geocodedAddress.address;
        reportObj.location.city = geocodedAddress.city;
        reportObj.location.state = geocodedAddress.state;
        reportObj.location.zipCode = geocodedAddress.zipCode;
      } else {
        // Fallback: format coordinates nicely
        const lat = parseFloat(reportObj.location.coordinates.latitude).toFixed(6);
        const lng = parseFloat(reportObj.location.coordinates.longitude).toFixed(6);
        reportObj.location.address = `📍 Location (${lat}, ${lng})`;
      }
    } catch (error) {
      console.error(`Error geocoding report ${reportObj._id}:`, error.message);
      // Fallback: format coordinates nicely
      const lat = parseFloat(reportObj.location.coordinates.latitude).toFixed(6);
      const lng = parseFloat(reportObj.location.coordinates.longitude).toFixed(6);
      reportObj.location.address = `📍 Location (${lat}, ${lng})`;
    }
  }
  
  return reportObj;
};

/**
 * Check if a string is a coordinate address
 * @param {string} address - Address string to check
 * @returns {boolean} - True if it's a coordinate address
 */
const isCoordinateAddress = (address) => {
  return /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(address);
};

module.exports = {
  processReportsWithGeocoding,
  processSingleReportWithGeocoding,
  isCoordinateAddress
}; 