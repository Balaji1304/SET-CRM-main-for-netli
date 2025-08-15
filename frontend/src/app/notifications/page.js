import React, { useEffect, useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, AlertCircle, Clock, User, Package, FileText, DollarSign, X, Settings, Zap, Star, Archive, RefreshCw, Eye, EyeOff } from 'lucide-react';
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
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadNotifications(), loadCounts()]);
      if (window.showToast) {
        window.showToast('Notifications refreshed', 'success');
      }
    } catch (e) {
      if (window.showToast) {
        window.showToast('Failed to refresh notifications', 'error');
      }
    } finally {
      setRefreshing(false);
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
    const allIds = filteredAndSortedNotifications.map(n => n._id);
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

  // Role-specific notification types
  const getRoleSpecificTypes = (userRole) => {
    const typesByRole = {
      customer: [
        { value: 'ticket_created', label: 'My Tickets' },
        { value: 'ticket_assigned', label: 'Ticket Updates' },
        { value: 'ticket_status_changed', label: 'Status Changes' },
        { value: 'quotation_approved', label: 'Quotations' },
        { value: 'payment_received', label: 'Payments' },
        { value: 'installation_scheduled', label: 'Installation' },
        { value: 'order_update', label: 'Order Updates' }
      ],
      front_office_executive: [
        { value: 'enquiry_created', label: 'New Enquiries' },
        { value: 'enquiry_assigned', label: 'Enquiry Assignments' },
        { value: 'enquiry_converted', label: 'Conversions' },
        { value: 'lead_created', label: 'New Leads' },
        { value: 'ticket_created', label: 'Customer Tickets' },
        { value: 'task_reminder', label: 'Task Reminders' }
      ],
      sales_person: [
        { value: 'lead_assigned', label: 'Lead Assignments' },
        { value: 'enquiry_assigned', label: 'New Enquiries' },
        { value: 'quotation_created', label: 'New Quotations' },
        { value: 'quotation_approved', label: 'Approved Quotations' },
        { value: 'quotation_rejected', label: 'Quote Updates' },
        { value: 'quotation_expired', label: 'Expired Quotes' },
        { value: 'lead_follow_up', label: 'Follow-up Reminders' },
        { value: 'payment_received', label: 'Payment Updates' }
      ],
      sales_head: [
        { value: 'lead_created', label: 'New Leads' },
        { value: 'lead_updated', label: 'Lead Updates' },
        { value: 'enquiry_created', label: 'New Enquiries' },
        { value: 'quotation_created', label: 'New Quotations' },
        { value: 'quotation_updated', label: 'Quote Updates' },
        { value: 'quotation_approved', label: 'Approved Quotations' },
        { value: 'purchase_order_created', label: 'Purchase Orders' },
        { value: 'payment_received', label: 'Payments' },
        { value: 'performance_alert', label: 'Performance Alerts' }
      ],
      product_head: [
        { value: 'ticket_created', label: 'New Tickets' },
        { value: 'ticket_assigned', label: 'Ticket Assignments' },
        { value: 'purchase_order_created', label: 'Purchase Orders' },
        { value: 'engineer_assigned', label: 'Engineer Assignments' },
        { value: 'installation_completed', label: 'Installations' },
        { value: 'issue_reported', label: 'Installation Issues' },
        { value: 'sla_breach', label: 'SLA Breaches' },
        { value: 'system_announcement', label: 'System Updates' }
      ],
      service_engineer: [
        { value: 'ticket_assigned', label: 'Ticket Assignments' },
        { value: 'ticket_status_changed', label: 'Ticket Updates' },
        { value: 'ticket_commented', label: 'Comments' },
        { value: 'engineer_assigned', label: 'Installation Assignments' },
        { value: 'installation_scheduled', label: 'Installation Schedule' },
        { value: 'customer_approved', label: 'Customer Feedback' },
        { value: 'customer_rejected', label: 'Installation Issues' }
      ],
      accounts_department: [
        { value: 'payment_received', label: 'Payments Received' },
        { value: 'payment_failed', label: 'Payment Failures' },
        { value: 'payment_pending', label: 'Pending Payments' },
        { value: 'quotation_created', label: 'New Quotations' },
        { value: 'quotation_approved', label: 'Approved Quotes' },
        { value: 'purchase_order_created', label: 'Purchase Orders' }
      ],
      inventory_manager: [
        { value: 'purchase_order_created', label: 'New Purchase Orders' },
        { value: 'purchase_order_updated', label: 'Order Updates' }
      ],
      marketing_coordinator: [
        { value: 'installation_scheduled', label: 'Installation Scheduling' },
        { value: 'installation_rescheduled', label: 'Schedule Changes' },
        { value: 'purchase_order_created', label: 'New Orders' }
      ]
    };
    return typesByRole[userRole] || [];
  };

  // Enhanced filtering and sorting
  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = notifications.filter(notification => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!notification.title.toLowerCase().includes(searchLower) &&
            !notification.message.toLowerCase().includes(searchLower) &&
            !notification.sender?.name?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Type filter
      if (filterType !== 'all' && notification.type !== filterType) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && notification.priority !== priorityFilter) {
        return false;
      }

      // Unread filter
      if (showUnreadOnly && notification.read) {
        return false;
      }

      return true;
    });

    // Sort notifications
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case 'unread':
          return a.read - b.read; // Unread first
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return filtered;
  }, [notifications, searchTerm, filterType, priorityFilter, showUnreadOnly, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
            {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
        <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <Bell className="h-6 w-6 text-orange-500" />
                  <span>Notifications</span>
                  {counts.unread > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {counts.unread} new
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 mt-1">
                  Stay updated with your latest activities • {user?.role?.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh notifications"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'cards' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
              </div>

              {counts.unread > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
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

                {/* Enhanced Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col space-y-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                  placeholder="Search notifications by title, message, or sender..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              </div>
            </div>
              
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Filter - Role Specific */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
              <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Types</option>
                  {getRoleSpecificTypes(user?.role).map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
              </select>
            </div>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>

              {/* Sort Options */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">By Priority</option>
                <option value="unread">Unread First</option>
              </select>

              {/* Unread Toggle */}
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                  showUnreadOnly 
                    ? 'bg-orange-100 border-orange-300 text-orange-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {showUnreadOnly ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showUnreadOnly ? 'Show All' : 'Unread Only'}</span>
              </button>

              {/* Clear Filters */}
              {(filterType !== 'all' || priorityFilter !== 'all' || showUnreadOnly || searchTerm) && (
                <button
                  onClick={() => {
                    setFilterType('all');
                    setPriorityFilter('all');
                    setShowUnreadOnly(false);
                    setSearchTerm('');
                  }}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  <X className="h-4 w-4" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {(filterType !== 'all' || priorityFilter !== 'all' || showUnreadOnly) && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-500">Active filters:</span>
                {filterType !== 'all' && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                    {getRoleSpecificTypes(user?.role).find(t => t.value === filterType)?.label || filterType}
                  </span>
                )}
                {priorityFilter !== 'all' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {priorityFilter} priority
                  </span>
                )}
                {showUnreadOnly && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Unread only
                  </span>
                )}
              </div>
            )}
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
          ) : filteredAndSortedNotifications.length === 0 ? (
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
                    onClick={selectedNotifications.length === filteredAndSortedNotifications.length ? clearSelection : selectAll}
                    className="text-sm text-orange-600 hover:text-orange-800"
                  >
                    {selectedNotifications.length === filteredAndSortedNotifications.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedNotifications.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedNotifications.length} selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {filteredAndSortedNotifications.length} notification{filteredAndSortedNotifications.length > 1 ? 's' : ''}
                  {filteredAndSortedNotifications.length !== notifications.length && (
                    <span className="text-gray-400"> of {notifications.length}</span>
                  )}
                </p>
          </div>

              {/* Notifications Display */}
              <div className={viewMode === 'cards' ? 'space-y-3' : 'space-y-0'}>
                {filteredAndSortedNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`bg-white transition-all duration-200 hover:shadow-md ${
                    !notification.read ? 'bg-orange-50/30' : ''
                  } ${
                    viewMode === 'cards' 
                      ? `rounded-lg shadow-sm border-l-4 border border-gray-200 p-6 ${getPriorityColor(notification.priority)}`
                      : 'border-b border-gray-200 p-4 hover:bg-gray-50'
                  }`}
                >
                                    <div className={`flex items-start ${viewMode === 'cards' ? 'space-x-4' : 'space-x-3'}`}>
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={() => toggleSelection(notification._id)}
                      className="mt-1 rounded border-gray-300"
                    />
                    
                    <div className="flex-shrink-0 mt-1">
                      <div className={`${viewMode === 'cards' ? 'p-2' : 'p-1.5'} rounded-full ${
                        notification.priority === 'urgent' ? 'bg-red-100' :
                        notification.priority === 'high' ? 'bg-orange-100' :
                        notification.priority === 'medium' ? 'bg-blue-100' :
                        'bg-green-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center justify-between ${viewMode === 'cards' ? 'mb-2' : 'mb-1'}`}>
                        <div className="flex items-center space-x-2">
                          <h3 className={`${viewMode === 'cards' ? 'text-sm' : 'text-xs'} font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            notification.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {notification.priority === 'urgent' ? '🔴' :
                             notification.priority === 'high' ? '🟠' :
                             notification.priority === 'medium' ? '🟡' : '🟢'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`${viewMode === 'cards' ? 'text-sm mb-3' : 'text-xs mb-2'} ${
                        !notification.read ? 'text-gray-700' : 'text-gray-600'
                      } ${viewMode === 'list' ? 'truncate' : ''}`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {notification.sender && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              <span>{notification.sender.name}</span>
                            </div>
                          )}
                          
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            notification.type.includes('ticket') ? 'bg-blue-100 text-blue-800' :
                            notification.type.includes('purchase') ? 'bg-green-100 text-green-800' :
                            notification.type.includes('quotation') ? 'bg-purple-100 text-purple-800' :
                            notification.type.includes('payment') ? 'bg-emerald-100 text-emerald-800' :
                            notification.type.includes('lead') ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                  </div>

                        <div className="flex items-center space-x-1">
                          {!notification.read && (
                      <button
                              onClick={() => handleMarkAsRead([notification._id])}
                              className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded transition-colors"
                              title="Mark as read"
                      >
                              <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                            onClick={() => handleDelete(notification._id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                            title="Delete notification"
                    >
                            <Trash2 className="h-3 w-3" />
                    </button>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </>
            )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;