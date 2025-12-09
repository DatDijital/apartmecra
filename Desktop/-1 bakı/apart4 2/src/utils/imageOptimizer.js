/**
 * Image optimization utilities
 * Provides functions to optimize image URLs for Firebase Storage and other sources
 */

/**
 * Optimize image URL for Firebase Storage
 * @param {string} url - Original image URL
 * @param {number} width - Target width in pixels
 * @param {number} quality - Image quality (0-100, default: 80)
 * @returns {string} Optimized image URL
 */
export const optimizeImageUrl = (url, width, quality = 80) => {
  if (!url) return '';
  
  // Firebase Storage optimization
  if (url.includes('firebasestorage')) {
    const params = [];
    if (width) params.push(`width=${width}`);
    if (quality) params.push(`quality=${quality}`);
    if (params.length > 0) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${params.join('&')}`;
    }
  }
  
  return url;
};

/**
 * Generate srcSet for responsive images
 * @param {string} url - Original image URL
 * @param {number} baseWidth - Base width (1x)
 * @param {number} quality - Image quality (default: 80)
 * @returns {string} srcSet string
 */
export const generateSrcSet = (url, baseWidth = 400, quality = 80) => {
  if (!url) return '';
  
  const widths = [baseWidth, baseWidth * 2]; // 1x and 2x
  return widths
    .map((width, index) => {
      const optimizedUrl = optimizeImageUrl(url, width, quality);
      return `${optimizedUrl} ${index + 1}x`;
    })
    .join(', ');
};

/**
 * Check if image URL is valid
 * @param {string} url - Image URL to check
 * @returns {boolean} True if URL is valid
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default {
  optimizeImageUrl,
  generateSrcSet,
  isValidImageUrl
};

