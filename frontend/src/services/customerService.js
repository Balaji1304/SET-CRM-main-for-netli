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