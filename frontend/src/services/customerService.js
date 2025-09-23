import { apiRequest, invalidateCache } from './apiConfig';

/**
 * Get all purchases for the current customer
 * @returns {Promise<Object>} - Response with purchases list
 */
export const getMyPurchases = async () => {
  try {
    const response = await apiRequest('customer-purchases/my-purchases');
    return response;
  } catch (error) {
    console.error('Error fetching my purchases:', error);
    throw error;
  }
};

/**
 * Get all customer purchases including payment information
 * @returns {Promise<Object>} - Response with customer purchases
 */
export const getCustomerPurchases = async () => {
  try {
    const response = await apiRequest('customer-purchases');
    return response;
  } catch (error) {
    console.error('Error fetching customer purchases:', error);
    throw error;
  }
};

/**
 * Get details for a specific purchase
 * @param {string} purchaseId - Purchase ID
 * @returns {Promise<Object>} - Response with purchase data
 */
export const getPurchaseDetails = async (purchaseId) => {
  try {
    const response = await apiRequest(`customer-purchases/${purchaseId}`);
    return response;
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    throw error;
  }
};

/**
 * Make a payment for a purchase
 * @param {string} purchaseId - Purchase ID
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} - Response
 */
export const makePayment = async (purchaseId, paymentData) => {
  try {
    const response = await apiRequest(`customer-purchases/${purchaseId}/payment`, {
      method: 'POST',
      body: paymentData
    }, false); // Don't cache POST requests
    
    // Invalidate purchases cache
    invalidateCache('customer-purchases');
    return response;
  } catch (error) {
    console.error('Error making payment:', error);
    throw error;
  }
};

/**
 * Customer: record manual payment (with verification flow)
 */
export const recordManualPayment = async (purchaseId, data) => {
  const response = await apiRequest(`customer-purchases/${purchaseId}/payments/manual`, {
    method: 'POST',
    body: data
  }, false);
  invalidateCache('customer-purchases');
  return response;
};

/**
 * Get all approved payments for accounts department (both quotation and remaining payment approvals)
 * @returns {Promise<Object>} - Response with unified approved payments list
 */
export const getAllApprovedPayments = async () => {
  try {
    const response = await apiRequest('customer-purchases/approved-payments');
    return response;
  } catch (error) {
    console.error('Error fetching all approved payments:', error);
    throw error;
  }
};

/**
 * Get all pending approvals for accounts department (both quotation and remaining payment approvals)
 * @returns {Promise<Object>} - Response with unified approvals list
 */
export const getAllPendingApprovals = async () => {
  try {
    const response = await apiRequest('customer-purchases/pending-approvals');
    return response;
  } catch (error) {
    console.error('Error fetching all pending approvals:', error);
    throw error;
  }
};

/**
 * Verify a remaining payment (accounts department)
 * @param {string} purchaseId - Purchase ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} - Response
 */
export const verifyRemainingPayment = async (purchaseId, paymentId) => {
  try {
    const response = await apiRequest(`customer-purchases/${purchaseId}/payments/${paymentId}/verify`, {
      method: 'PUT'
    }, false);
    
    // Invalidate cache
    invalidateCache('customer-purchases');
    return response;
  } catch (error) {
    console.error('Error verifying remaining payment:', error);
    throw error;
  }
};

/**
 * Reject a remaining payment (accounts department)
 * @param {string} purchaseId - Purchase ID
 * @param {string} paymentId - Payment ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} - Response
 */
export const rejectRemainingPayment = async (purchaseId, paymentId, reason) => {
  try {
    const response = await apiRequest(`customer-purchases/${purchaseId}/payments/${paymentId}/reject`, {
      method: 'PUT',
      body: { reason }
    }, false);
    
    // Invalidate cache
    invalidateCache('customer-purchases');
    return response;
  } catch (error) {
    console.error('Error rejecting remaining payment:', error);
    throw error;
  }
};

/**
 * Create a Razorpay payment link for remaining payment
 * @param {string} purchaseId - Purchase ID
 * @returns {Promise<Object>} - Response with payment link data
 */
export const createRazorpayPaymentLink = async (purchaseId) => {
  try {
    const response = await apiRequest(`payments/remaining/${purchaseId}/razorpay-link`, {
      method: 'POST'
    }, false); // Don't cache POST requests
    
    return response;
  } catch (error) {
    console.error('Error creating Razorpay payment link:', error);
    throw error;
  }
};

/**
 * Verify Razorpay payment status
 * @param {string} purchaseId - Purchase ID
 * @param {string} paymentLinkId - Razorpay payment link ID
 * @returns {Promise<Object>} - Response with payment verification
 */
export const verifyRazorpayPayment = async (purchaseId, paymentLinkId) => {
  try {
    const response = await apiRequest(`payments/verify/${purchaseId}/${paymentLinkId}`, {}, false);
    
    // Invalidate purchases cache
    invalidateCache('customer-purchases');
    return response;
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    throw error;
  }
};

/**
 * Get payment history for the current customer
 * @returns {Promise<Object>} - Response with all payment history
 */
export const getPaymentHistory = async () => {
  try {
    const response = await apiRequest('customer-purchases/payments/history');
    return response;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

/**
 * Get payment history for a specific purchase
 * @param {string} purchaseId - Purchase ID
 * @returns {Promise<Object>} - Response with payment history for a purchase
 */
export const getPurchasePaymentHistory = async (purchaseId) => {
  try {
    const response = await apiRequest(`customer-purchases/${purchaseId}/payments`);
    return response;
  } catch (error) {
    console.error('Error fetching purchase payment history:', error);
    throw error;
  }
};

/**
 * Get all approved sales orders that are not yet packaged
 * @returns {Promise<Object>} - Response with approved sales orders
 */
export const getApprovedSalesOrders = async (token) => {
  try {
    const response = await apiRequest('customer-purchases/approved', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  } catch (error) {
    console.error('Error fetching approved sales orders:', error);
    throw error;
  }
}; 

/**
 * Get all customers for management
 * @returns {Promise<Object>} - Response with customers list
 */
export const getAllCustomers = async () => {
  try {
    const response = await apiRequest('customer-purchases/customers');
    return response;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

/**
 * Download Order Form PDF for a purchase
 * @param {string} purchaseId - Purchase ID
 * @returns {Promise<Blob>} - PDF blob
 */
export const downloadOrderFormPDF = async (purchaseId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/customer-purchases/${purchaseId}/order-form/pdf`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download Order Form');
    }

    return await response.blob();
  } catch (error) {
    console.error('Error downloading Order Form PDF:', error);
    throw error;
  }
};

/**
 * Get Order Form data for a purchase
 * @param {string} purchaseId - Purchase ID
 * @returns {Promise<Object>} - Order form data
 */
export const getOrderFormData = async (purchaseId) => {
  try {
    const response = await apiRequest(`customer-purchases/${purchaseId}/order-form/data`);
    return response;
  } catch (error) {
    console.error('Error fetching Order Form data:', error);
    throw error;
  }
};

/**
 * Export customers data
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise<Object>} - Response with customers data for export
 */
export const exportCustomers = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const endpoint = `customers/export?${query}`;
    const response = await apiRequest(endpoint, { method: 'GET' }, false);
    return response;
  } catch (error) {
    console.error('Error exporting customers:', error);
    throw error;
  }
};

/**
 * Export purchase orders data
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise<Object>} - Response with purchase orders data for export
 */
export const exportPurchaseOrders = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const endpoint = `customer-purchases/export?${query}`;
    const response = await apiRequest(endpoint, { method: 'GET' }, false);
    return response;
  } catch (error) {
    console.error('Error exporting purchase orders:', error);
    throw error;
  }
};

/**
 * Export approved payments data
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise<Object>} - Response with approved payments data for export
 */
export const exportApprovedPayments = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const endpoint = `customer-purchases/export-approved-payments?${query}`;
    const response = await apiRequest(endpoint, { method: 'GET' }, false);
    return response;
  } catch (error) {
    console.error('Error exporting approved payments:', error);
    throw error;
  }
};