import { apiRequest, invalidateCache, API_URL, getAuthHeaders } from './apiConfig';

/**
 * Create a new customized product during lead creation
 * @param {Object} customizedProductData - Customized product data
 * @returns {Promise<Object>} - Response with created customized product
 */
export const createCustomizedProduct = async (customizedProductData) => {
  const response = await apiRequest('customized-products', {
    method: 'POST',
    body: customizedProductData
  }, false);
  
  // Invalidate cache after creating
  invalidateCache('customized-products');
  return response;
};

/**
 * Get all customized products for the authenticated user
 * @returns {Promise<Object>} - Response with all customized products
 */
export const getAllCustomizedProducts = async () => {
  return await apiRequest('customized-products');
};

/**
 * Get customized products by lead ID
 * @param {string} leadId - Lead ID
 * @returns {Promise<Object>} - Response with customized products
 */
export const getCustomizedProductsByLead = async (leadId) => {
  return await apiRequest(`customized-products/lead/${leadId}`);
};

/**
 * Get a specific customized product by ID
 * @param {string} id - Customized Product ID
 * @returns {Promise<Object>} - Response with customized product data
 */
export const getCustomizedProduct = async (id) => {
  return await apiRequest(`customized-products/${id}`);
};

/**
 * Update an existing customized product (for quotation details)
 * @param {string} id - Customized Product ID
 * @param {Object} updateData - Updated customized product data
 * @returns {Promise<Object>} - Response with updated customized product
 */
export const updateCustomizedProduct = async (id, updateData) => {
  const response = await apiRequest(`customized-products/${id}`, {
    method: 'PUT',
    body: updateData
  }, false);
  
  // Invalidate cache after updating
  invalidateCache('customized-products');
  return response;
};

/**
 * Upload images for a customized product
 * @param {string} id - Customized Product ID
 * @param {FormData} formData - FormData containing the image files
 * @returns {Promise<Object>} - Response
 */
export const uploadCustomizedProductImages = async (id, formData) => {
  const url = `${API_URL}/customized-products/${id}/images`;
  const headers = getAuthHeaders();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': headers.Authorization
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(errorData.message || `Error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Invalidate cache after image upload
  invalidateCache('customized-products');
  return data;
};

/**
 * Delete a customized product
 * @param {string} id - Customized Product ID
 * @returns {Promise<Object>} - Response
 */
export const deleteCustomizedProduct = async (id) => {
  const response = await apiRequest(`customized-products/${id}`, {
    method: 'DELETE'
  }, false);
  
  // Invalidate cache after deletion
  invalidateCache('customized-products');
  return response;
};
