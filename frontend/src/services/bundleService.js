import { apiRequest, invalidateCache } from './apiConfig';

/**
 * Get all solar power plant systems
 * @param {Object} filters - Filter options (category, subcategory, brand, isActive)
 * @returns {Promise<Object>} - Response with systems list
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
 * Get a specific system by ID
 * @param {string} id - System ID
 * @returns {Promise<Object>} - Response with system data
 */
export const getBundle = async (id) => {
  return await apiRequest(`bundles/${id}`);
};

/**
 * Create a new solar power plant system
 * @param {Object} bundleData - System data
 * @returns {Promise<Object>} - Response with created system
 */
export const createBundle = async (bundleData) => {
  const isFormData = bundleData instanceof FormData;
  const response = await apiRequest('bundles', {
    method: 'POST',
    body: bundleData
  }, false, isFormData);
  
  // Invalidate cache after creating
  invalidateCache('bundles');
  return response;
};

/**
 * Update an existing system
 * @param {string} id - System ID
 * @param {Object} bundleData - Updated system data
 * @returns {Promise<Object>} - Response with updated system
 */
export const updateBundle = async (id, bundleData) => {
  const isFormData = bundleData instanceof FormData;
  const response = await apiRequest(`bundles/${id}`, {
    method: 'PUT',
    body: bundleData
  }, false, isFormData);
  
  // Invalidate cache after updating
  invalidateCache('bundles');
  return response;
};

/**
 * Delete a system
 * @param {string} id - System ID
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
 * Get compatible products for system creation
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
 * Get default terms and conditions for systems
 * @returns {Promise<Object>} - Response with terms and conditions
 */
export const getDefaultBundleTerms = async () => {
  return await apiRequest('bundles/terms/default');
};

/**
 * Get all available system terms and conditions
 * @returns {Promise<Object>} - Response with all terms
 */
export const getAllBundleTerms = async () => {
  return await apiRequest('bundles/terms/all');
}; 