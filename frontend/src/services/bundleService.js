import { apiRequest, invalidateCache } from './apiConfig';

/**
 * Get all product bundles
 * @param {Object} filters - Filter options (category, subcategory, brand, isActive)
 * @returns {Promise<Object>} - Response with bundles list
 */
export const getBundles = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== '') {
      queryParams.append(key, filters[key]);
    }
  });
  
  const url = queryParams.toString() ? `bundles?${queryParams.toString()}` : 'bundles';
  return await apiRequest(url);
};

/**
 * Get a specific bundle by ID
 * @param {string} id - Bundle ID
 * @returns {Promise<Object>} - Response with bundle data
 */
export const getBundle = async (id) => {
  return await apiRequest(`bundles/${id}`);
};

/**
 * Create a new product bundle
 * @param {Object} bundleData - Bundle data
 * @returns {Promise<Object>} - Response with created bundle
 */
export const createBundle = async (bundleData) => {
  const response = await apiRequest('bundles', {
    method: 'POST',
    body: JSON.stringify(bundleData)
  });
  
  // Invalidate cache after creating
  invalidateCache('bundles');
  return response;
};

/**
 * Update an existing bundle
 * @param {string} id - Bundle ID
 * @param {Object} bundleData - Updated bundle data
 * @returns {Promise<Object>} - Response with updated bundle
 */
export const updateBundle = async (id, bundleData) => {
  const response = await apiRequest(`bundles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(bundleData)
  });
  
  // Invalidate cache after updating
  invalidateCache('bundles');
  return response;
};

/**
 * Delete a bundle
 * @param {string} id - Bundle ID
 * @returns {Promise<Object>} - Response confirmation
 */
export const deleteBundle = async (id) => {
  const response = await apiRequest(`bundles/${id}`, {
    method: 'DELETE'
  });
  
  // Invalidate cache after deletion
  invalidateCache('bundles');
  return response;
};

/**
 * Get power plant configurations (standard KVA options)
 * @param {string} brand - Optional brand filter
 * @returns {Promise<Object>} - Response with power plant configurations
 */
export const getPowerPlantConfigurations = async (brand = '') => {
  const url = brand ? `bundles/power-plants/configurations?brand=${brand}` : 'bundles/power-plants/configurations';
  return await apiRequest(url);
};

/**
 * Get compatible products for bundle creation
 * @param {Object} filters - Filter options (category, brand)
 * @returns {Promise<Object>} - Response with compatible products
 */
export const getCompatibleProducts = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== '') {
      queryParams.append(key, filters[key]);
    }
  });
  
  const url = queryParams.toString() ? `bundles/compatible-products?${queryParams.toString()}` : 'bundles/compatible-products';
  return await apiRequest(url);
};

/**
 * Calculate bundle pricing with different configurations
 * @param {Object} pricingData - Pricing calculation data
 * @returns {Promise<Object>} - Response with calculated pricing
 */
export const calculateBundlePricing = async (pricingData) => {
  return await apiRequest('bundles/calculate-pricing', {
    method: 'POST',
    body: JSON.stringify(pricingData)
  });
}; 