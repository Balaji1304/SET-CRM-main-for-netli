import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, AlertCircle, Clock, User, Package, FileText, DollarSign, X, Settings, Zap, Star, Archive, RefreshCw, Eye, EyeOff, ChevronDown, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getNotifications, getNotificationCounts, markAsRead, markAllAsRead, deleteNotification } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Function to reset all filters
  const resetFilters = () => {
    setFilterType('all');
    setShowUnreadOnly(false);
    setSearchTerm('');
    setPriorityFilter('all');
    setSortBy('newest');
    setShowFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = filterType !== 'all' || priorityFilter !== 'all' || showUnreadOnly || sortBy !== 'newest';

  // Count active filters (excluding search term and sort for display)
  const activeFilterCount = [
    filterType !== 'all' ? filterType : null,
    priorityFilter !== 'all' ? priorityFilter : null,
    showUnreadOnly ? 'unread' : null
  ].filter(Boolean).length;

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

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if not already read
      if (!notification.read) {
        await handleMarkAsRead([notification._id]);
      }

      // Navigate to the appropriate page based on redirect URL
      const redirectUrl = notification.data?.redirectUrl;
      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        // Fallback: generate redirect URL based on notification type
        const fallbackUrl = generateFallbackRedirectUrl(notification.type, notification.data);
        if (fallbackUrl) {
          navigate(fallbackUrl);
        }
      }
    } catch (e) {
      console.error('Error handling notification click:', e);
      if (window.showToast) {
        window.showToast('Failed to navigate to notification', 'error');
      }
    }
  };

  // Fallback function to generate redirect URLs for older notifications without redirectUrl
  const generateFallbackRedirectUrl = (type, data = {}) => {
    switch (type) {
      case 'ticket_created':
      case 'ticket_assigned':
      case 'ticket_status_changed':
      case 'ticket_commented':
        return '/dashboard/ticket-queue';
      
      case 'purchase_order_created':
      case 'purchase_order_updated':
      case 'order_update':
        return '/dashboard/orders';
      
      case 'quotation_created':
      case 'quotation_updated':
      case 'quotation_approved':
      case 'quotation_rejected':
      case 'quotation_expired':
        return data.quotationId ? `/dashboard/quotations/${data.quotationId}` : '/dashboard/quotations';
      
      case 'payment_received':
      case 'payment_failed':
      case 'payment_pending':
        return '/dashboard/payments';
      
      case 'lead_created':
      case 'lead_assigned':
      case 'lead_updated':
      case 'lead_follow_up':
        return '/dashboard/leads';
      
      case 'enquiry_created':
      case 'enquiry_assigned':
      case 'enquiry_converted':
        return '/dashboard/enquiry';
      
      case 'engineer_assigned':
      case 'assignment_accepted':
      case 'installation_completed':
      case 'installation_scheduled':
      case 'installation_rescheduled':
      case 'customer_approved':
      case 'customer_rejected':
      case 'issue_reported':
        return '/dashboard/installations';
      
      case 'task_reminder':
        return '/dashboard/performance';
      case 'performance_alert':
      case 'sla_breach':
        return '/dashboard/reports';
      
      default:
        return '/dashboard/notifications';
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
    const allIds = currentNotifications.map(n => n._id);
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
        { value: 'ticket_created', label: 'New Tickets' },
        { value: 'ticket_assigned', label: 'Ticket Assignments' },
        { value: 'ticket_status_changed', label: 'Ticket Updates' },
        { value: 'ticket_commented', label: 'Ticket Comments' },
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
        { value: 'installation_started', label: 'Work Started' },
        { value: 'assignment_accepted', label: 'Assignment Confirmations' },
        { value: 'customer_approved', label: 'Customer Feedback' },
        { value: 'customer_rejected', label: 'Installation Issues' },
        { value: 'issue_reported', label: 'Issue Reports' }
      ],
      accounts_department: [
        { value: 'payment_received', label: 'Payments Received' },
        { value: 'payment_failed', label: 'Payment Failures' },
        { value: 'payment_pending', label: 'Pending Payments' },
        { value: 'quotation_created', label: 'New Quotations' },
        { value: 'quotation_approved', label: 'Approved Quotes' },
        { value: 'purchase_order_created', label: 'Purchase Orders' }
      ],
      marketing_coordinator: [
        { value: 'quotation_created', label: 'New Quotations' },
        { value: 'quotation_updated', label: 'Quotation Updates' },
        { value: 'quotation_expired', label: 'Expired Quotations' },
        { value: 'quotation_approved', label: 'Approved Quotations' },
        { value: 'quotation_rejected', label: 'Rejected Quotations' },
        { value: 'lead_created', label: 'New Leads' },
        { value: 'lead_updated', label: 'Lead Updates' },
        { value: 'purchase_order_created', label: 'New Orders' },
        { value: 'installation_scheduled', label: 'Installation Scheduling' },
        { value: 'installation_rescheduled', label: 'Schedule Changes' }
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = filteredAndSortedNotifications.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - Page Title */}
      <div className="border-b border-gray-200 pb-3 sm:pb-5 mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="h-6 w-6 text-orange-500" />
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">Notifications</h1>
              {counts.unread > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  You have {counts.unread} unread notification{counts.unread > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh notifications"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Contains filters and notifications */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Filter and Action Bar */}
        <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
          {/* Filter Status Indicator */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                </span>
              </div>
              <button
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-150"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Main Controls Row */}
          <div className="flex flex-col gap-3">
            {/* Search and Filter Toggle Row */}
            <div className="flex gap-2 items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-150 ease-in-out text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              
              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center justify-center p-2 border rounded-md transition-colors duration-150 ease-in-out ${
                  showFilters || activeFilterCount > 0
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Toggle filters"
              >
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="ml-1 text-xs font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filters Section - Collapsible */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-3 space-y-3">
                {/* Filter Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {/* Sort Order */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="priority">By Priority</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Type Filter */}
                  <div className="relative">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                    >
                      <option value="all">All Types</option>
                      {getRoleSpecificTypes(user?.role).map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Priority Filter */}
                  <div className="relative">
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                    >
                      <option value="all">All Priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Unread Filter Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                      className={`px-2 py-1.5 rounded text-xs font-medium transition-colors w-full ${
                        showUnreadOnly 
                          ? 'bg-orange-500 text-white hover:bg-orange-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      {showUnreadOnly ? 'Show All' : 'Unread Only'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons Row */}
            {counts.unread > 0 && (
              <div className="w-full">
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500 transition-colors duration-150 ease-in-out whitespace-nowrap w-full"
                >
                  Mark All Read
                </button>
              </div>
            )}
          </div>
        </div>


        {/* Notifications Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
                <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Error Loading Notifications</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={loadNotifications}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Try Again
                </button>
              </div>
            ) : filteredAndSortedNotifications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <Bell className="mx-auto h-16 w-16 text-gray-400 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-3">No notifications found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchTerm || filterType !== 'all' || priorityFilter !== 'all' || showUnreadOnly
                    ? 'No notifications match your current filters. Try adjusting your search or filter criteria.'
                    : "You're all caught up! No new notifications to display."}
                </p>
              </div>
            ) : (
              <>
                {/* Selection Controls */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={selectedNotifications.length === currentNotifications.length ? clearSelection : selectAll}
                    className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                  >
                    {selectedNotifications.length === currentNotifications.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedNotifications.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedNotifications.length} selected
                    </span>
                  )}
                </div>

                {/* Notifications Display */}
                <div className="space-y-2 lg:space-y-3">
                  {currentNotifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`
                        bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer
                        ${!notification.read ? 'border-orange-200 bg-orange-50/30' : ''}
                      `}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Mobile Layout */}
                      <div className="flex items-start p-3 gap-3 lg:hidden">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center
                            ${notification.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                              notification.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                              notification.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                              'bg-green-100 text-green-600'
                            }
                          `}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-sm font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                              )}
                            </div>
                            
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {/* Metadata Tags */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`
                                text-xs px-1.5 py-0.5 rounded font-medium
                                ${notification.type.includes('quotation') ? 'bg-purple-100 text-purple-700' :
                                  notification.type.includes('ticket') ? 'bg-blue-100 text-blue-700' :
                                  notification.type.includes('purchase') ? 'bg-green-100 text-green-700' :
                                  notification.type.includes('payment') ? 'bg-emerald-100 text-emerald-700' :
                                  notification.type.includes('lead') ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'
                                }
                              `}>
                                {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              
                              {notification.priority && notification.priority !== 'low' && (
                                <span className={`
                                  text-xs px-1.5 py-0.5 rounded font-medium
                                  ${notification.priority === 'urgent' ? 'bg-red-500 text-white' :
                                    notification.priority === 'high' ? 'bg-orange-500 text-white' :
                                    'bg-blue-500 text-white'
                                  }
                                `}>
                                  {notification.priority === 'urgent' ? 'Urgent' :
                                   notification.priority === 'high' ? 'High' :
                                   'Medium'}
                                </span>
                              )}
                            </div>
                            
                            {/* Mobile Actions */}
                            <div className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={selectedNotifications.includes(notification._id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelection(notification._id);
                                }}
                                className="h-3 w-3 rounded border-gray-300 text-orange-500 focus:ring-orange-500 focus:ring-1 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead([notification._id]);
                                  }}
                                  className="p-1 text-gray-400 hover:text-green-600"
                                  title="Mark as read"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification._id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden lg:flex items-start p-6 gap-4">
                        {/* Checkbox */}
                        <div className="flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={selectedNotifications.includes(notification._id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelection(notification._id);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 focus:ring-1 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center
                            ${notification.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                              notification.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                              notification.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                              'bg-green-100 text-green-600'
                            }
                          `}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className={`text-base font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                {notification.message}
                              </p>
                              
                              {/* Metadata */}
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">
                                  {getTimeAgo(notification.createdAt)}
                                </span>
                                
                                <span className={`
                                  text-xs px-2 py-1 rounded-full font-medium
                                  ${notification.type.includes('quotation') ? 'bg-purple-100 text-purple-700' :
                                    notification.type.includes('ticket') ? 'bg-blue-100 text-blue-700' :
                                    notification.type.includes('purchase') ? 'bg-green-100 text-green-700' :
                                    notification.type.includes('payment') ? 'bg-emerald-100 text-emerald-700' :
                                    notification.type.includes('lead') ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-700'
                                  }
                                `}>
                                  {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                
                                {notification.priority && notification.priority !== 'low' && (
                                  <span className={`
                                    text-xs px-2 py-1 rounded font-medium
                                    ${notification.priority === 'urgent' ? 'bg-red-500 text-white' :
                                      notification.priority === 'high' ? 'bg-orange-500 text-white' :
                                      'bg-blue-500 text-white'
                                    }
                                  `}>
                                    {notification.priority === 'urgent' ? 'Urgent' :
                                     notification.priority === 'high' ? 'High' :
                                     'Medium'}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead([notification._id]);
                                  }}
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification._id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete notification"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bulk Actions */}
                {selectedNotifications.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 font-medium">
                        {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleBulkActions('markRead')}
                          className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          Mark Read
                        </button>
                        <button
                          onClick={() => handleBulkActions('delete')}
                          className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0">
            <div className="text-sm text-gray-600 order-2 sm:order-1">
              Showing {Math.min(startIndex + 1, filteredAndSortedNotifications.length)} to {Math.min(endIndex, filteredAndSortedNotifications.length)} of {filteredAndSortedNotifications.length} results
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-xs sm:text-sm text-gray-600 px-3 py-2 min-w-[80px] text-center"> 
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;