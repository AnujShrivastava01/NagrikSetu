const express = require('express');
const router = express.Router();
const { getCurrentWeather } = require('../services/weatherService');
const axios = require('axios');

// Helper: Geocode city to coordinates using OpenCage or Mapbox or OpenStreetMap
async function geocodeCity(city) {
  // Example using OpenCage (replace with your API key)
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) throw new Error('OpenCage API key not set');
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${apiKey}`;
  const response = await axios.get(url);
  if (response.data && response.data.results && response.data.results.length > 0) {
    const { lat, lng } = response.data.results[0].geometry;
    return { latitude: lat, longitude: lng };
  }
  throw new Error('Could not geocode city');
}

// GET /api/weather/live?city=CityName
router.get('/live', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: 'City is required' });
  try {
    const coords = await geocodeCity(city);
    const weather = await getCurrentWeather(coords.latitude, coords.longitude);
    if (!weather) return res.status(404).json({ error: 'Weather data not found' });
    res.json({ data: weather });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch weather data' });
  }
});

module.exports = router; 