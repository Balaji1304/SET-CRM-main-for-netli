import { apiRequest, invalidateCache, API_URL, getAuthHeaders } from './apiConfig';

/**
 * Get all products
 * @returns {Promise<Object>} - Response with products list
 */
export const getProducts = async () => {
  return await apiRequest('products');
};

/**
 * Get a specific product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} - Response with product data
 */
export const getProduct = async (id) => {
  return await apiRequest(`products/${id}`);
};

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} - Response with created product
 */
export const createProduct = async (productData) => {
  const isFormData = productData instanceof FormData;
  const response = await apiRequest('products', {
    method: 'POST',
    body: productData,
  }, false, isFormData);
  
  // Invalidate products cache after creating a new product
  invalidateCache('products');
  return response;
};

/**
 * Update an existing product
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} - Response with updated product
 */
export const updateProduct = async (id, productData) => {
  const isFormData = productData instanceof FormData;
  const response = await apiRequest(`products/${id}`, {
    method: 'PUT',
    body: productData
  }, false, isFormData);
  
  // Invalidate products cache after updating
  invalidateCache('products');
  return response;
};

/**
 * Delete a product
 * @param {string} id - Product ID
 * @returns {Promise<Object>} - Response
 */
export const deleteProduct = async (id) => {
  const response = await apiRequest(`products/${id}`, {
    method: 'DELETE'
  }, false); // Don't cache DELETE requests
  
  // Invalidate products cache after deletion
  invalidateCache('products');
  return response;
};

/**
 * Upload a brochure for a product
 * @param {string} id - Product ID
 * @param {FormData} formData - FormData containing the brochure file
 * @returns {Promise<Object>} - Response
 */
export const uploadProductBrochure = async (id, formData) => {
  const url = `${API_URL}/products/${id}/brochure`;
  const headers = getAuthHeaders();
  
  // We can't use apiRequest because FormData requires specific headers
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
  
  // Invalidate products cache after brochure upload
  invalidateCache('products');
  return data;
};

/**
 * Get default terms and conditions for a product category
 * @param {string} category - Product category
 * @returns {Promise<Object>} - Response with terms and conditions
 */
export const getDefaultTerms = async (category) => {
  return await apiRequest(`products/terms/default?category=${encodeURIComponent(category)}`);
};

/**
 * Get all available terms and conditions
 * @returns {Promise<Object>} - Response with all terms
 */
export const getAllTerms = async () => {
  return await apiRequest('products/terms/all');
}; 