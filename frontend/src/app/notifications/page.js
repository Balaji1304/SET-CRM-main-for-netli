import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, AlertCircle, Clock, User, Package, FileText, DollarSign, X } from 'lucide-react';
import { getNotifications, getNotificationCounts, markAsRead, markAllAsRead, deleteNotification } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadNotifications();
    loadCounts();
  }, [filterType, showUnreadOnly]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType !== 'all') params.type = filterType;
      if (showUnreadOnly) params.unreadOnly = 'true';
      
      const res = await getNotifications(params);
      setNotifications(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load notifications');
      if (window.showToast) {
        window.showToast(e.message || 'Failed to load notifications', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const res = await getNotificationCounts();
      setCounts(res.data);
    } catch (e) {
      console.error('Failed to load notification counts:', e);
    }
  };

  const handleMarkAsRead = async (notificationIds) => {
    try {
      await markAsRead(notificationIds);
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n._id) ? { ...n, read: true } : n
        )
      );
      loadCounts();
      if (window.showToast) {
        window.showToast('Notifications marked as read', 'success');
      }
    } catch (e) {
      if (window.showToast) {
        window.showToast('Failed to mark as read', 'error');
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      loadCounts();
      if (window.showToast) {
        window.showToast('All notifications marked as read', 'success');
      }
    } catch (e) {
      if (window.showToast) {
        window.showToast('Failed to mark all as read', 'error');
      }
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
      loadCounts();
      if (window.showToast) {
        window.showToast('Notification deleted', 'success');
      }
    } catch (e) {
      if (window.showToast) {
        window.showToast('Failed to delete notification', 'error');
      }
    }
  };

  const handleBulkActions = async (action) => {
    if (selectedNotifications.length === 0) return;

    if (action === 'markRead') {
      await handleMarkAsRead(selectedNotifications);
    } else if (action === 'delete') {
      await Promise.all(selectedNotifications.map(id => handleDelete(id)));
    }
    
    setSelectedNotifications([]);
  };

  const toggleSelection = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAll = () => {
    const allIds = filteredNotifications.map(n => n._id);
    setSelectedNotifications(allIds);
  };

  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ticket_created':
      case 'ticket_assigned':
      case 'ticket_status_changed':
      case 'ticket_commented':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'purchase_order_created':
      case 'purchase_order_updated':
        return <Package className="h-5 w-5 text-green-500" />;
      case 'quotation_approved':
      case 'quotation_rejected':
        return <FileText className="h-5 w-5 text-purple-500" />;
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'lead_assigned':
        return <User className="h-5 w-5 text-orange-500" />;
      case 'system_announcement':
        return <Bell className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = Math.floor((now - notificationDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    if (searchTerm) {
      return notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
        <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600 mt-1">Stay updated with your latest activities</p>
            </div>
            <div className="flex items-center space-x-3">
              {counts.unread > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="ticket_created">New Tickets</option>
                <option value="ticket_assigned">Assignments</option>
                <option value="purchase_order_created">Purchase Orders</option>
                <option value="quotation_approved">Quotations</option>
                <option value="payment_received">Payments</option>
              </select>
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`px-4 py-2.5 rounded-lg border transition-colors ${
                  showUnreadOnly 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Unread Only
              </button>
            </div>
            </div>
          </div>

        {/* Bulk Actions */}
        {selectedNotifications.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-blue-800 font-medium">
                  {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkActions('markRead')}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  <Check className="h-3 w-3" />
                  <span>Mark Read</span>
                </button>
                <button
                  onClick={() => handleBulkActions('delete')}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Notifications</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadNotifications}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Try Again
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
              <p className="text-gray-600">
                {searchTerm || filterType !== 'all' || showUnreadOnly
                  ? 'No notifications match your current filters.'
                  : "You're all caught up! No new notifications."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={selectedNotifications.length === filteredNotifications.length ? clearSelection : selectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  {filteredNotifications.length} notification{filteredNotifications.length > 1 ? 's' : ''}
                </p>
                  </div>

              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`bg-white rounded-lg shadow-sm border-l-4 border border-gray-200 p-6 transition-all duration-200 hover:shadow-md ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  } ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={() => toggleSelection(notification._id)}
                      className="mt-1 rounded border-gray-300"
                    />
                    
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-500">
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`text-sm ${!notification.read ? 'text-gray-700' : 'text-gray-600'} mb-3`}>
                        {notification.message}
                      </p>
                      
                      {notification.sender && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                          <User className="h-3 w-3" />
                          <span>From: {notification.sender.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            notification.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {notification.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                      <button
                              onClick={() => handleMarkAsRead([notification._id])}
                              className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                              title="Mark as read"
                      >
                              <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                            onClick={() => handleDelete(notification._id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                            title="Delete notification"
                    >
                            <Trash2 className="h-4 w-4" />
                    </button>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;