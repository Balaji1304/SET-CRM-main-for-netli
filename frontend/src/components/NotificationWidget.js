import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/apiConfig';

const NotificationWidget = ({ userRole = 'customer' }) => {
  const { user } = useAuth();
  const [notificationStats, setNotificationStats] = useState({
    totalUnread: 0,
    byType: {
      tickets: 0,
      purchaseOrders: 0,
      quotations: 0,
      leads: 0,
      enquiries: 0
    },
    recent: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotificationStats();
  }, [user]);

  const fetchNotificationStats = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/notifications/counts');
      if (response.success) {
        setNotificationStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationTypeLabel = (type, count) => {
    const typeLabels = {
      tickets: 'Tickets',
      purchaseOrders: 'Orders',
      quotations: 'Quotations',
      leads: 'Leads',
      enquiries: 'Enquiries'
    };
    return `${count} ${typeLabels[type] || type}`;
  };

  const getNotificationIcon = (type) => {
    const icons = {
      tickets: AlertCircle,
      purchaseOrders: CheckCircle2,
      quotations: Clock,
      leads: Users,
      enquiries: Users
    };
    const IconComponent = icons[type] || Bell;
    return <IconComponent className="w-4 h-4" />;
  };

  const getRoleSpecificTypes = () => {
    const roleTypes = {
      front_office_executive: ['enquiries', 'leads', 'tickets'],
      sales_person: ['leads', 'quotations'],
      sales_head: ['leads', 'quotations', 'purchaseOrders'],
      product_head: ['tickets', 'purchaseOrders'],
      service_engineer: ['tickets'],
      accounts_department: ['quotations', 'purchaseOrders'],
      customer: ['tickets', 'quotations']
    };
    return roleTypes[userRole] || ['tickets'];
  };

  const getNotificationColor = (type, count) => {
    if (count === 0) return 'text-gray-400';
    
    const colorMap = {
      tickets: 'text-red-600',
      purchaseOrders: 'text-blue-600', 
      quotations: 'text-green-600',
      leads: 'text-purple-600',
      enquiries: 'text-orange-600'
    };
    return colorMap[type] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-primary">Notifications</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const relevantTypes = getRoleSpecificTypes();
  const hasNotifications = notificationStats.totalUnread > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-primary" />
            {hasNotifications && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notificationStats.totalUnread > 99 ? '99+' : notificationStats.totalUnread}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-primary">Notifications</h3>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard/notifications'}
          className="text-sm text-primary hover:text-primary-dark transition-colors"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {relevantTypes.length > 0 ? (
          relevantTypes.map(type => {
            const count = notificationStats.byType[type] || 0;
            return (
              <div key={type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={getNotificationColor(type, count)}>
                    {getNotificationIcon(type)}
                  </div>
                  <span className="text-sm text-secondary capitalize">
                    {getNotificationTypeLabel(type, count)}
                  </span>
                </div>
                {count > 0 && (
                  <span className={`text-sm font-semibold ${getNotificationColor(type, count)}`}>
                    {count}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-secondary">All caught up!</p>
          </div>
        )}

        {notificationStats.totalUnread === 0 && relevantTypes.length > 0 && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">No new notifications</p>
          </div>
        )}
      </div>

      {notificationStats.recent && notificationStats.recent.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-secondary mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {notificationStats.recent.slice(0, 3).map((notification, index) => (
              <div key={notification._id || index} className="text-xs text-gray-600 truncate">
                <span className="font-medium">{notification.title}</span>
                {notification.timeAgo && (
                  <span className="text-gray-400 ml-1">• {notification.timeAgo}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationWidget;
