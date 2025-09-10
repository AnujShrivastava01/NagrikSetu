const axios = require('axios');


const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Fetches current weather data for given coordinates.
 * @param {number} latitude - Latitude of the location.
 * @param {number} longitude - Longitude of the location.
 * @returns {Promise<object | null>} Weather data or null if an error occurs.
 */
const getCurrentWeather = async (latitude, longitude) => {
    
    if (!process.env.OPENWEATHER_API_KEY) {
        console.error('OpenWeatherMap API key is not configured.');
        return null;
    }

    try {
        const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
            params: {
                lat: latitude,
                lon: longitude,
                appid: process.env.OPENWEATHER_API_KEY,
                units: 'metric' // or 'imperial' for Fahrenheit
            }
        });

        if (response.data) {
            return {
                temperature: response.data.main.temp,
                feelsLike: response.data.main.feels_like,
                humidity: response.data.main.humidity,
                condition: response.data.weather[0].main,
                description: response.data.weather[0].description,
                icon: response.data.weather[0].icon,
                windSpeed: response.data.wind.speed,
                timestamp: response.data.dt,
                cityName: response.data.name
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching weather data for ${latitude},${longitude}:`, error.message);
        if (error.response) {
            console.error('OpenWeatherMap API Error Response:', error.response.data);
        }
        return null;
    }
};

module.exports = {
    getCurrentWeather
}; 