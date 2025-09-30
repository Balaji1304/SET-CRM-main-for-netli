import { apiRequest, invalidateCache } from './apiConfig';

/**
 * Get all quotations
 * @returns {Promise<Object>} - Response with quotations list
 */
export const getQuotations = async (noCache = false, params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `quotations?${query}` : 'quotations';
    const response = await apiRequest(endpoint, {}, !noCache);
    return response;
  } catch (error) {
    console.error('Error fetching quotations:', error);
    throw error;
  }
};

/**
 * Get a specific quotation by ID
 * @param {string} id - Quotation ID
 * @returns {Promise<Object>} - Response with quotation data
 */
export const getQuotation = async (id) => {
  try {
    const response = await apiRequest(`quotations/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching quotation:', error);
    throw error;
  }
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
  try {
  const response = await apiRequest(`quotations/${id}/send`, {
    method: 'POST'
  }, false); // Don't cache POST requests
  
  // Invalidate quotations cache after sending
  invalidateCache('quotations');
  return response;
  } catch (error) {
    console.error('Error sending quotation:', error);
    throw error;
  }
};

/**
 * Approve a quotation
 * @param {string} id - Quotation ID
 * @returns {Promise<Object>} - Response
 */
export const approveQuotation = async (id) => {
  try {
  const response = await apiRequest(`quotations/${id}/approve`, {
    method: 'PUT'
  }, false); // Don't cache PUT requests
  
  // Invalidate quotations cache after approving
  invalidateCache('quotations');
  return response;
  } catch (error) {
    console.error('Error approving quotation:', error);
    throw error;
  }
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
 * Check live payment status for a quotation
 * @param {string} id - Quotation ID
 * @returns {Promise<Object>} - Response with paymentStatus, quotationStatus
 */
export const checkQuotationPaymentStatus = async (id) => {
  try {
    return await apiRequest(`quotations/${id}/payment-status`, { method: 'GET' }, false);
  } catch (error) {
    console.error('Error checking quotation payment status:', error);
    throw error;
  }
};

/**
 * Get pending payments
 * @returns {Promise<Object>} - Response with pending payments
 */
export const getPendingPayments = async () => {
  return await apiRequest('payments/customer/pending-payments');
};

/**
 * Get customer products
 * @returns {Promise<Object>} - Response with customer products
 */
export const getCustomerProducts = async () => {
  return await apiRequest('quotations/customer/products', {}, true); // Ensure noCache is true for GET
};

/**
 * Export quotations data
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise<Object>} - Response with quotations data for export
 */
export const exportQuotations = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const endpoint = `quotations/export?${query}`;
    // Use apiRequest and specify no caching for this request
    const response = await apiRequest(endpoint, { method: 'GET' }, false);
    return response;
  } catch (error) {
    console.error('Error exporting quotations:', error);
    throw error;
  }
}; 