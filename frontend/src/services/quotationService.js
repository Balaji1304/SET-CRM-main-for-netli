import { apiRequest, invalidateCache } from './apiConfig';

/**
 * Get all quotations
 * @returns {Promise<Object>} - Response with quotations list
 */
export const getQuotations = async () => {
  return await apiRequest('quotations');
};

/**
 * Get a specific quotation by ID
 * @param {string} id - Quotation ID
 * @returns {Promise<Object>} - Response with quotation data
 */
export const getQuotation = async (id) => {
  return await apiRequest(`quotations/${id}`);
};

/**
 * Create a new quotation
 * @param {Object} quotationData - Quotation data
 * @returns {Promise<Object>} - Response with created quotation
 */
export const createQuotation = async (quotationData) => {
  const response = await apiRequest('quotations', {
    method: 'POST',
    body: quotationData
  }, false); // Don't cache POST requests
  
  // Invalidate quotations cache after creating a new quotation
  invalidateCache('quotations');
  return response;
};

/**
 * Update an existing quotation
 * @param {string} id - Quotation ID
 * @param {Object} quotationData - Updated quotation data
 * @returns {Promise<Object>} - Response with updated quotation
 */
export const updateQuotation = async (id, quotationData) => {
  const response = await apiRequest(`quotations/${id}`, {
    method: 'PUT',
    body: quotationData
  }, false); // Don't cache PUT requests
  
  // Invalidate quotations cache after updating
  invalidateCache('quotations');
  return response;
};

/**
 * Send a quotation to the lead
 * @param {string} id - Quotation ID
 * @returns {Promise<Object>} - Response
 */
export const sendQuotation = async (id) => {
  const response = await apiRequest(`quotations/${id}/send`, {
    method: 'POST'
  }, false); // Don't cache POST requests
  
  // Invalidate quotations cache after sending
  invalidateCache('quotations');
  return response;
};

/**
 * Approve a quotation
 * @param {string} id - Quotation ID
 * @returns {Promise<Object>} - Response
 */
export const approveQuotation = async (id) => {
  const response = await apiRequest(`quotations/${id}/approve`, {
    method: 'PUT'
  }, false); // Don't cache PUT requests
  
  // Invalidate quotations cache after approving
  invalidateCache('quotations');
  return response;
};

/**
 * Close a quotation (reject)
 * @param {string} id - Quotation ID
 * @returns {Promise<Object>} - Response
 */
export const closeQuotation = async (id) => {
  const response = await apiRequest(`quotations/${id}/close`, {
    method: 'PUT'
  }, false); // Don't cache PUT requests
  
  // Invalidate quotations cache after closing
  invalidateCache('quotations');
  return response;
};

/**
 * Process offline payment for a quotation
 * @param {string} id - Quotation ID
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} - Response
 */
export const confirmOfflinePayment = async (id, paymentData) => {
  const response = await apiRequest(`quotations/${id}/offline-payment`, {
    method: 'POST',
    body: paymentData
  }, false); // Don't cache POST requests
  
  // Invalidate quotations cache after payment confirmation
  invalidateCache('quotations');
  return response;
};

/**
 * Get pending payments
 * @returns {Promise<Object>} - Response with pending payments
 */
export const getPendingPayments = async () => {
  return await apiRequest('quotations/pending-payments');
};

/**
 * Get customer products
 * @returns {Promise<Object>} - Response with customer products
 */
export const getCustomerProducts = async () => {
  return await apiRequest('quotations/customer-products');
}; 