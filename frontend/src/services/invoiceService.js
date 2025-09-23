import { apiRequest, invalidateCache, API_URL, getAuthHeaders } from './apiConfig';

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

export const getInvoiceByPurchaseId = async (customerPurchaseId) => {
  try {
    const response = await fetch(`${API_URL}/invoices/purchase/${customerPurchaseId}`, {
      method: 'GET',
      headers: getAuthHeaders(), // Make sure getAuthHeaders() returns an object with Authorization header
    });
    
    const responseData = await response.json();

    if (!response.ok) {
      // Use the message from backend response if available, otherwise default
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }
    return responseData; // This should be { success: true, data: ... } or { success: false, message: ... }
  } catch (error) {
    console.error('Error fetching invoice by purchase ID in service:', error);
    // Ensure the error re-thrown or returned maintains a consistent structure expected by the component
    return { success: false, message: error.message || 'An unexpected error occurred while fetching invoice data.' };
  }
};

export const sendInvoiceEmail = async (proformaInvoiceId) => {
  try {
    const response = await fetch(`${API_URL}/invoices/${proformaInvoiceId}/send-email`, {
      method: 'POST',
      headers: getAuthHeaders(), // Ensure this provides the auth token
    });
    // Try to parse JSON regardless of response.ok, as backend might send error details in JSON
    const responseData = await response.json(); 

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }
    return responseData; // Should be { success: true, message: '...' }
  } catch (error) {
    console.error('Error sending proforma invoice email in service:', error);
    return { success: false, message: error.message || 'An unexpected error occurred while sending proforma invoice email.' };
  }
};

// You might have other invoice related service functions here, e.g.:
// export const createManualInvoice = async (invoiceData) => { ... }; 