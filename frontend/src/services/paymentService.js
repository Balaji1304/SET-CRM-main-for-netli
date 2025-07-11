import { apiRequest, invalidateCache } from './apiConfig';

/**
 * Initiates a payment for approval.
 * @param {object} paymentData - The payment details.
 * @returns {Promise<object>} The response from the API.
 */
export const initiatePayment = async (paymentData) => {
  try {
    const response = await apiRequest('payments', {
      method: 'POST',
      body: paymentData,
    });
    return response;
  } catch (error) {
    console.error('Error initiating payment:', error);
    throw error;
  }
};

/**
 * Fetches all payments pending approval.
 * @returns {Promise<object>} The response from the API.
 */
export const getPendingPayments = async () => {
  try {
    const response = await apiRequest('payments/pending', { method: 'GET' });
    return response;
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    throw error;
  }
};

/**
 * Approves a payment.
 * @param {string} paymentId - The ID of the payment to approve.
 * @returns {Promise<object>} The response from the API.
 */
export const approvePayment = async (paymentId) => {
  try {
    const response = await apiRequest(`payments/${paymentId}/approve`, {
      method: 'PUT',
    });
    invalidateCache('pendingPayments');
    return response;
  } catch (error) {
    console.error('Error approving payment:', error);
    throw error;
  }
};

/**
 * Rejects a payment.
 * @param {string} paymentId - The ID of the payment to reject.
 * @param {string} rejectionReason - The reason for rejection.
 * @returns {Promise<object>} The response from the API.
 */
export const rejectPayment = async (paymentId, rejectionReason) => {
  try {
    const response = await apiRequest(`payments/${paymentId}/reject`, {
      method: 'PUT',
      body: { rejectionReason },
    });
    invalidateCache('pendingPayments');
    return response;
  } catch (error) {
    console.error('Error rejecting payment:', error);
    throw error;
  }
};

/**
 * Fetches all payments for a specific customer purchase.
 * @param {string} purchaseId - The ID of the customer purchase.
 * @returns {Promise<object>} The response from the API.
 */
export const getPaymentsByPurchase = async (purchaseId) => {
  try {
    const response = await apiRequest(`payments/purchase/${purchaseId}`, { method: 'GET' });
    return response;
  } catch (error) {
    console.error('Error fetching payments for purchase:', error);
    throw error;
  }
}; 