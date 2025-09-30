import { apiRequest } from './apiConfig';

/**
 * Get customer's order tracking list
 * @returns {Promise<Object>} - Response with tracking records
 */
export const getMyOrderTracking = async () => {
  try {
    const response = await apiRequest('tracking/my-orders');
    return response;
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    throw error;
  }
};

/**
 * Get detailed tracking information for a specific purchase (customer view)
 * @param {string} purchaseId - Purchase ID
 * @returns {Promise<Object>} - Response with detailed tracking data
 */
export const getCustomerTracking = async (purchaseId) => {
  try {
    const response = await apiRequest(`tracking/customer/${purchaseId}`);
    return response;
  } catch (error) {
    console.error('Error fetching customer tracking:', error);
    throw error;
  }
};

/**
 * Get internal tracking information (staff view)
 * @param {string} purchaseId - Purchase ID
 * @returns {Promise<Object>} - Response with full tracking data
 */
export const getInternalTracking = async (purchaseId) => {
  try {
    const response = await apiRequest(`tracking/internal/${purchaseId}`);
    return response;
  } catch (error) {
    console.error('Error fetching internal tracking:', error);
    throw error;
  }
};

/**
 * Update tracking status
 * @param {string} purchaseId - Purchase ID
 * @param {Object} statusData - Status update data
 * @returns {Promise<Object>} - Response with updated tracking
 */
export const updateTrackingStatus = async (purchaseId, statusData) => {
  try {
    const response = await apiRequest(`tracking/${purchaseId}/status`, {
      method: 'PUT',
      body: statusData
    }, false);
    return response;
  } catch (error) {
    console.error('Error updating tracking status:', error);
    throw error;
  }
};

/**
 * Update shipping details
 * @param {string} purchaseId - Purchase ID
 * @param {Object} shippingData - Shipping details
 * @returns {Promise<Object>} - Response with updated tracking
 */
export const updateShippingDetails = async (purchaseId, shippingData) => {
  try {
    const response = await apiRequest(`tracking/${purchaseId}/shipping`, {
      method: 'PUT',
      body: shippingData
    }, false);
    return response;
  } catch (error) {
    console.error('Error updating shipping details:', error);
    throw error;
  }
};

/**
 * Update installation details
 * @param {string} purchaseId - Purchase ID
 * @param {Object} installationData - Installation details
 * @returns {Promise<Object>} - Response with updated tracking
 */
export const updateInstallationDetails = async (purchaseId, installationData) => {
  try {
    const response = await apiRequest(`tracking/${purchaseId}/installation`, {
      method: 'PUT',
      body: installationData
    }, false);
    return response;
  } catch (error) {
    console.error('Error updating installation details:', error);
    throw error;
  }
};

/**
 * Add customer note to tracking
 * @param {string} purchaseId - Purchase ID
 * @param {Object} noteData - Note data
 * @returns {Promise<Object>} - Response with updated tracking
 */
export const addTrackingNote = async (purchaseId, noteData) => {
  try {
    const response = await apiRequest(`tracking/${purchaseId}/notes`, {
      method: 'POST',
      body: noteData
    }, false);
    return response;
  } catch (error) {
    console.error('Error adding tracking note:', error);
    throw error;
  }
};

/**
 * Get tracking summary for dashboard
 * @returns {Promise<Object>} - Response with tracking summary
 */
export const getTrackingSummary = async () => {
  try {
    const response = await apiRequest('tracking/summary');
    return response;
  } catch (error) {
    console.error('Error fetching tracking summary:', error);
    throw error;
  }
};

/**
 * Update estimated dates
 * @param {string} purchaseId - Purchase ID
 * @param {Object} estimates - Estimated dates
 * @returns {Promise<Object>} - Response with updated tracking
 */
export const updateEstimatedDates = async (purchaseId, estimates) => {
  try {
    const response = await apiRequest(`tracking/${purchaseId}/estimates`, {
      method: 'PUT',
      body: estimates
    }, false);
    return response;
  } catch (error) {
    console.error('Error updating estimated dates:', error);
    throw error;
  }
};

/**
 * Create initial tracking record
 * @param {Object} trackingData - Initial tracking data
 * @returns {Promise<Object>} - Response with created tracking
 */
export const createTrackingRecord = async (trackingData) => {
  try {
    const response = await apiRequest('tracking/create', {
      method: 'POST',
      body: trackingData
    }, false);
    return response;
  } catch (error) {
    console.error('Error creating tracking record:', error);
    throw error;
  }
};

/**
 * Export orders data
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise<Object>} - Response with orders data for export
 */
export const exportOrders = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const endpoint = `tracking/export?${query}`;
    const response = await apiRequest(endpoint, { method: 'GET' }, false);
    return response;
  } catch (error) {
    console.error('Error exporting orders:', error);
    throw error;
  }
};

// Status and phase mappings for frontend use
export const STATUS_LABELS = {
  'order_placed': 'Order Placed',
  'payment_confirmed': 'Payment Confirmed',
  'order_approved': 'Order Approved',
  'order_accepted': 'Order Accepted',
  'order_processing': 'Processing Order',
  'items_reserved': 'Items Reserved',
  'packaging_started': 'Packaging Started',
  'package_ready': 'Package Ready',
  'ready_to_dispatch': 'Ready to Dispatch',
  'dispatched': 'Dispatched',
  'in_transit': 'In Transit',
  'out_for_delivery': 'Out for Delivery',
  'delivered': 'Delivered',
  'installation_scheduled': 'Installation Scheduled',
  'engineer_assigned': 'Engineer Assigned',
  'installation_in_progress': 'Installation in Progress',
  'installation_completed': 'Installation Completed',
  'service_activated': 'Service Activated',
  'order_completed': 'Order Completed',
  'warranty_active': 'Warranty Active',
  'on_hold': 'On Hold',
  'delayed': 'Delayed',
  'cancelled': 'Cancelled',
  'returned': 'Returned'
};

export const PHASE_LABELS = {
  'processing': 'Order Processing',
  'packaging': 'Packaging & Preparation',
  'shipping': 'Shipping & Delivery',
  'installation': 'Installation & Setup',
  'completed': 'Completed',
  'issues': 'Issues & Delays'
};

export const STATUS_COLORS = {
  'order_placed': 'bg-blue-100 text-blue-800',
  'payment_confirmed': 'bg-green-100 text-green-800',
  'order_approved': 'bg-green-100 text-green-800',
  'order_accepted': 'bg-emerald-100 text-emerald-800',
  'order_processing': 'bg-yellow-100 text-yellow-800',
  'items_reserved': 'bg-yellow-100 text-yellow-800',
  'packaging_started': 'bg-yellow-100 text-yellow-800',
  'package_ready': 'bg-blue-100 text-blue-800',
  'ready_to_dispatch': 'bg-blue-100 text-blue-800',
  'dispatched': 'bg-purple-100 text-purple-800',
  'in_transit': 'bg-purple-100 text-purple-800',
  'out_for_delivery': 'bg-purple-100 text-purple-800',
  'delivered': 'bg-green-100 text-green-800',
  'installation_scheduled': 'bg-blue-100 text-blue-800',
  'engineer_assigned': 'bg-blue-100 text-blue-800',
  'installation_in_progress': 'bg-yellow-100 text-yellow-800',
  'installation_completed': 'bg-green-100 text-green-800',
  'service_activated': 'bg-green-100 text-green-800',
  'order_completed': 'bg-green-100 text-green-800',
  'warranty_active': 'bg-green-100 text-green-800',
  'on_hold': 'bg-orange-100 text-orange-800',
  'delayed': 'bg-red-100 text-red-800',
  'cancelled': 'bg-gray-100 text-gray-800',
  'returned': 'bg-red-100 text-red-800'
};

export const PHASE_COLORS = {
  'processing': 'bg-blue-500',
  'packaging': 'bg-yellow-500',
  'shipping': 'bg-purple-500',
  'installation': 'bg-orange-500',
  'completed': 'bg-green-500',
  'issues': 'bg-red-500'
};


