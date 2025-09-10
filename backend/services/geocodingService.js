const axios = require('axios');

class GeocodingService {
  constructor() {
    this.mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    this.baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
  }

  // Reverse geocoding: convert coordinates to address
  async reverseGeocode(latitude, longitude) {
    try {
      if (!this.mapboxToken) {
        console.warn('Mapbox access token not configured for geocoding');
        return null;
      }

      const url = `${this.baseUrl}/${longitude},${latitude}.json`;
      const response = await axios.get(url, {
        params: {
          access_token: this.mapboxToken,
          types: 'address,poi,neighborhood,place',
          limit: 1
        }
      });

      if (response.data && response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        return {
          address: feature.place_name,
          city: this.extractCity(feature.context),
          state: this.extractState(feature.context),
          zipCode: this.extractZipCode(feature.context),
          country: this.extractCountry(feature.context)
        };
      }

      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return null;
    }
  }

  // Forward geocoding: convert address to coordinates
  async forwardGeocode(address) {
    try {
      if (!this.mapboxToken) {
        console.warn('Mapbox access token not configured for geocoding');
        return null;
      }

      const url = `${this.baseUrl}/${encodeURIComponent(address)}.json`;
      const response = await axios.get(url, {
        params: {
          access_token: this.mapboxToken,
          types: 'address,poi,neighborhood,place',
          limit: 1
        }
      });

      if (response.data && response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        const [longitude, latitude] = feature.center;
        
        return {
          coordinates: {
            latitude,
            longitude
          },
          address: feature.place_name,
          city: this.extractCity(feature.context),
          state: this.extractState(feature.context),
          zipCode: this.extractZipCode(feature.context),
          country: this.extractCountry(feature.context)
        };
      }

      return null;
    } catch (error) {
      console.error('Forward geocoding error:', error.message);
      return null;
    }
  }

  // Extract city from Mapbox context
  extractCity(context) {
    if (!context) return null;
    const cityContext = context.find(item => 
      item.id.includes('place') || item.id.includes('neighborhood')
    );
    return cityContext ? cityContext.text : null;
  }

  // Extract state from Mapbox context
  extractState(context) {
    if (!context) return null;
    const stateContext = context.find(item => 
      item.id.includes('region')
    );
    return stateContext ? stateContext.text : null;
  }

  // Extract zip code from Mapbox context
  extractZipCode(context) {
    if (!context) return null;
    const zipContext = context.find(item => 
      item.id.includes('postcode')
    );
    return zipContext ? zipContext.text : null;
  }

  // Extract country from Mapbox context
  extractCountry(context) {
    if (!context) return null;
    const countryContext = context.find(item => 
      item.id.includes('country')
    );
    return countryContext ? countryContext.text : null;
  }

  // Batch reverse geocoding for multiple coordinates
  async batchReverseGeocode(coordinates) {
    const results = [];
    
    for (const coord of coordinates) {
      try {
        const address = await this.reverseGeocode(coord.latitude, coord.longitude);
        results.push({
          coordinates: coord,
          address: address
        });
      } catch (error) {
        console.error(`Error geocoding coordinates ${coord.latitude}, ${coord.longitude}:`, error.message);
        results.push({
          coordinates: coord,
          address: null
        });
      }
    }
    
    return results;
  }
}

module.exports = new GeocodingService(); 