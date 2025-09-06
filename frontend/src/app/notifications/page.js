import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, AlertCircle, Clock, User, Package, FileText, DollarSign, X, Settings, Zap, Star, Archive, RefreshCw, Eye, EyeOff, ChevronDown } from 'lucide-react';
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
      inventory_manager: [
        { value: 'purchase_order_created', label: 'New Purchase Orders' },
        { value: 'purchase_order_updated', label: 'Order Updates' }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-gray-600" />
              <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
              {counts.unread > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white">
                  {counts.unread} new
                </span>
              )}
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
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">

                {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative z-10">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none bg-white border border-orange-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-orange-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none min-w-[120px]"
                style={{ backgroundColor: filterType !== 'all' ? '#fff7ed' : 'white' }}
              >
                <option value="all">Filters</option>
                {getRoleSpecificTypes(user?.role).map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-500 pointer-events-none" />
            </div>
          </div>
          
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showUnreadOnly 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread
          </button>
        </div>


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
              {/* Notifications Display */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {filteredAndSortedNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`
                      border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer
                      ${!notification.read ? 'bg-blue-50/30' : ''}
                    `}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start px-4 py-4 gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 pr-3">
                            <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'} mb-1`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                          
                          {/* Right side actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead([notification._id]);
                              }}
                              className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification._id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Bottom metadata row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            
                            <span className={`
                              text-xs px-2 py-0.5 rounded-full font-medium
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
                          </div>
                          
                          {notification.priority && notification.priority !== 'low' && (
                            <span className={`
                              text-xs px-2 py-0.5 rounded font-medium
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
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={selectedNotifications.length === filteredAndSortedNotifications.length ? clearSelection : selectAll}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Select All
                </button>
                
                {counts.unread > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    Mark All Read
                  </button>
                )}
              </div>
            </>
            )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;