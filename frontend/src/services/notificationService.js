import { apiRequest } from './apiConfig';

const BASE = 'notifications';

// Get user notifications
export const getNotifications = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiRequest(`${BASE}${queryString ? `?${queryString}` : ''}`);
};

// Get notification counts
export const getNotificationCounts = () => apiRequest(`${BASE}/counts`);

// Mark notifications as read
export const markAsRead = (notificationIds) => 
  apiRequest(`${BASE}/mark-read`, { 
    method: 'PUT', 
    body: { notificationIds } 
  }, false);

// Mark all notifications as read
export const markAllAsRead = () => 
  apiRequest(`${BASE}/mark-all-read`, { method: 'PUT' }, false);

// Delete notification
export const deleteNotification = (id) => 
  apiRequest(`${BASE}/${id}`, { method: 'DELETE' }, false);

// Create system notification (Admin only)
export const createSystemNotification = (data) => 
  apiRequest(`${BASE}/system`, { 
    method: 'POST', 
    body: data 
  }, false);

export default {
  getNotifications,
  getNotificationCounts,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createSystemNotification
};
