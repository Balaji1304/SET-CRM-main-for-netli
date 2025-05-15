import { apiRequest, invalidateCache } from './apiConfig';

/**
 * Get all invoices
 * @returns {Promise<Object>} - Response with invoices list
 */
export const getInvoices = async () => {
  return await apiRequest('invoices');
};

/**
 * Get a specific invoice by ID
 * @param {string} id - Invoice ID
 * @returns {Promise<Object>} - Response with invoice data
 */
export const getInvoice = async (id) => {
  return await apiRequest(`invoices/${id}`);
};

/**
 * Create a new invoice from a quotation
 * @param {string} quotationId - Quotation ID to create invoice from
 * @returns {Promise<Object>} - Response with created invoice
 */
export const createInvoice = async (quotationId) => {
  const response = await apiRequest('invoices', {
    method: 'POST',
    body: { quotationId }
  }, false); // Don't cache POST requests
  
  // Invalidate invoices and quotations cache
  invalidateCache('invoices');
  invalidateCache('quotations');
  return response;
};

/**
 * Update an existing invoice
 * @param {string} id - Invoice ID
 * @param {Object} invoiceData - Updated invoice data
 * @returns {Promise<Object>} - Response with updated invoice
 */
export const updateInvoice = async (id, invoiceData) => {
  const response = await apiRequest(`invoices/${id}`, {
    method: 'PUT',
    body: invoiceData
  }, false); // Don't cache PUT requests
  
  // Invalidate invoices cache after updating
  invalidateCache('invoices');
  return response;
};

/**
 * Send an invoice to the customer
 * @param {string} id - Invoice ID
 * @returns {Promise<Object>} - Response
 */
export const sendInvoice = async (id) => {
  const response = await apiRequest(`invoices/${id}/send`, {
    method: 'POST'
  }, false);
  
  invalidateCache('invoices');
  return response;
}; 