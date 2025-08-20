/**
 * API Configuration
 * 
 * This file provides centralized configuration for API calls, including:
 * - API URL management with environment variables
 * - Authentication header generation
 * - Request caching and deduplication
 *
 * ENVIRONMENT VARIABLES:
 * - REACT_APP_API_URL: Set to your backend API URL
 *   - For local development: http://localhost:5000/api 
 *   - For production: https://your-backend-domain.com/api
 *
 * The frontend typically runs on port 3000 (default Create React App port)
 * The backend typically runs on port 5000 (default Express port)
 */

// Environment-based API URL with fallback for local development
// For local development, if REACT_APP_API_URL is not defined, use localhost:5000
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Cache for API responses
const apiCache = new Map();
const pendingRequests = new Map();

/**
 * Get authentication headers
 * @param {boolean} includeContentType - Whether to include Content-Type header
 * @returns {Object} - Headers object with authentication token
 */
export const getAuthHeaders = (includeContentType = false) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`
  };
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

/**
 * Create cache key for request
 * @param {string} url - Request URL
 * @param {string} method - HTTP method
 * @param {Object|undefined} body - Request body
 * @returns {string} - Cache key
 */
const createCacheKey = (url, method, body) => {
  return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
};

/**
 * Make API request with authentication
 * @param {string} endpoint - API endpoint (without leading slash)
 * @param {Object} options - Fetch options
 * @param {boolean} useCache - Whether to use cache for GET requests
 * @param {boolean} isFormData - Whether the body is FormData
 * @returns {Promise<Object>} - Parsed JSON response
 */
export const apiRequest = async (endpoint, options = {}, useCache = options.method === undefined || options.method === 'GET', isFormData = options.body instanceof FormData) => {
  // Clean up endpoint to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = `${API_URL}/${cleanEndpoint}`;
  const method = options.method || 'GET';
  const cacheKey = useCache ? createCacheKey(url, method, options.body) : null;
  
  // For GET requests, try to return cached response
  if (useCache && apiCache.has(cacheKey)) {
    const { data, expiry } = apiCache.get(cacheKey);
    if (Date.now() < expiry) {
      return data;
    } else {
      apiCache.delete(cacheKey);
    }
  }
  
  // For concurrent identical requests, return the same promise
  if (useCache && cacheKey && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Prepare headers with authentication
  const fetchOptions = {
    ...options,
    headers: {
      ...getAuthHeaders(!isFormData && options.body !== undefined),
      ...options.headers
    }
  };
  
  // Stringify body if it's an object and not FormData
  if (options.body && typeof options.body === 'object' && !isFormData) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  
  // Create the request promise
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          url: url,
          method: method
        });
        console.error('Full error details:', errorData);
        
        // Create error object with additional properties for better error handling
        const error = new Error(errorData.message || `Error: ${response.status}`);
        error.errorType = errorData.errorType;
        error.duplicateField = errorData.duplicateField;
        error.duplicateValue = errorData.duplicateValue;
        error.validationErrors = errorData.validationErrors;
        error.status = response.status;
        
        throw error;
      }
      
      const data = await response.json();
      
      // Cache successful GET responses
      if (useCache && cacheKey) {
        apiCache.set(cacheKey, {
          data,
          expiry: Date.now() + 60000 // Cache for 1 minute
        });
      }
      
      return data;
    } finally {
      // Clean up pending request
      if (cacheKey) {
        pendingRequests.delete(cacheKey);
      }
    }
  })();
  
  // Store pending request
  if (useCache && cacheKey) {
    pendingRequests.set(cacheKey, requestPromise);
  }
  
  return requestPromise;
};

/**
 * Invalidate cache entries for a specific resource
 * @param {string} resource - Resource name (e.g., 'leads', 'quotations')
 */
export const invalidateCache = (resource) => {
  const pattern = new RegExp(`${API_URL}/${resource}`);
  
  for (const key of apiCache.keys()) {
    if (pattern.test(key)) {
      apiCache.delete(key);
    }
  }
};

/**
 * Clear all cached API responses
 */
export const clearCache = () => {
  apiCache.clear();
};

export default {
  API_URL,
  getAuthHeaders,
  apiRequest,
  invalidateCache,
  clearCache
}; 