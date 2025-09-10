// Mapbox Configuration
// Get your free API key from: https://account.mapbox.com/access-tokens/

export const MAPBOX_CONFIG = {
  accessToken: import.meta.env.VITE_MAPBOX_API_KEY,
  defaultStyle: 'mapbox://styles/mapbox/streets-v12',
  satelliteStyle: 'mapbox://styles/mapbox/satellite-v9',
  defaultCenter: [-74.006, 40.7128], // Default to NYC
  defaultZoom: 10
};

// Instructions to get your Mapbox API key:
// 1. Go to https://account.mapbox.com/access-tokens/
// 2. Sign up for a free account
// 3. Create a new access token
// 4. Replace the accessToken value above with your actual token
// 5. The free tier includes 50,000 map loads per month 