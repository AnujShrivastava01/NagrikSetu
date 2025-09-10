/**
 * Image optimization utilities for Google profile pictures
 */

/**
 * Optimize Google profile picture URL for better loading
 * @param originalUrl - Original Google profile picture URL
 * @param size - Desired size (default: 96)
 * @returns Optimized URL
 */
export const optimizeGoogleProfileUrl = (originalUrl: string, size: number = 96): string => {
  if (!originalUrl) return '';
  
  // If it's already a Google profile URL, optimize it
  if (originalUrl.includes('googleusercontent.com')) {
    // Remove any existing size parameters
    const baseUrl = originalUrl.split('=')[0];
    return `${baseUrl}=s${size}-c`;
  }
  
  return originalUrl;
};

/**
 * Create a fallback image URL for failed Google profile pictures
 * @param name - User's name
 * @param size - Image size
 * @returns Fallback image URL
 */
export const createFallbackImageUrl = (name: string, size: number = 96): string => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const colors = ['4285f4', '34a853', 'fbbc04', 'ea4335', '9c27b0', 'ff9800'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=${size}`;
};

/**
 * Check if an image URL is accessible
 * @param url - Image URL to check
 * @returns Promise that resolves to boolean
 */
export const isImageAccessible = async (url: string): Promise<boolean> => {
  try {
    // For Google images, avoid making HEAD requests to prevent 429 errors
    if (url.includes('googleusercontent.com')) {
      return true; // Assume Google images are accessible
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors' // This helps avoid CORS issues
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Cache for image URLs to avoid repeated processing
const imageUrlCache = new Map<string, string>();

/**
 * Get the best available image URL for a user
 * @param googleUrl - Google profile picture URL
 * @param name - User's name
 * @param size - Desired image size
 * @returns Promise that resolves to the best available URL
 */
export const getBestImageUrl = async (
  googleUrl: string | undefined, 
  name: string, 
  size: number = 96
): Promise<string> => {
  if (!googleUrl) {
    return createFallbackImageUrl(name, size);
  }
  
  // Create cache key
  const cacheKey = `${googleUrl}-${size}`;
  
  // Check cache first
  if (imageUrlCache.has(cacheKey)) {
    return imageUrlCache.get(cacheKey)!;
  }
  
  // For Google profile pictures, use fallback to avoid 429 errors
  if (googleUrl.includes('googleusercontent.com')) {
    const fallbackUrl = createFallbackImageUrl(name, size);
    imageUrlCache.set(cacheKey, fallbackUrl);
    return fallbackUrl;
  }
  
  // For non-Google URLs, return as-is and cache
  imageUrlCache.set(cacheKey, googleUrl);
  return googleUrl;
}; 