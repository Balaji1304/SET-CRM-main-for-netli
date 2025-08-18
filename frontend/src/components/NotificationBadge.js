import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/apiConfig';

const NotificationBadge = ({ className = '' }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Set up polling for real-time updates every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await apiRequest('/notifications/counts');
      if (response.success) {
        setUnreadCount(response.data.unread || 0);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  if (unreadCount === 0) {
    return null;
  }

  return (
    <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium ${className}`}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

export default NotificationBadge;
