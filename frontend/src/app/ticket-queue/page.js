import React, { useEffect, useState, useMemo } from 'react';
import { Search, Filter, SortAsc, SortDesc, Calendar, User, Tag, AlertTriangle, Clock, CheckCircle, XCircle, MoreVertical, Download, RefreshCw, Users, Zap, Phone, Mail, Building2, Edit2, Trash2, Info, X, RotateCcw, ChevronDown, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllTickets, assignTicket, updateTicketMeta } from '../../services/ticketService';
import { getServiceEngineers } from '../../services/taskService';
import TicketDetailModal from '../../components/TicketDetailModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

// Custom styles for mobile responsive design
const customStyles = `
  .mobile-action-compact {
    padding: 6px !important;
    margin: 0 1px !important;
  }
  
  .mobile-action-buttons {
    gap: 2px !important;
  }
  
  .mobile-card-compact {
    padding: 12px;
    margin-bottom: 8px;
  }
  
  .mobile-card-container {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  
  .mobile-header-text {
    font-size: 16px !important;
    line-height: 1.4 !important;
    word-break: break-word;
  }
  
  .mobile-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  
  /* Improved table responsiveness */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Line clamping for multiline text */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  /* Improved modal responsiveness */
  .mobile-modal-content {
    max-height: 95vh;
    overflow-y: auto;
  }

  /* Extra small screens - below 480px */
  @media (max-width: 480px) {
    .mobile-card-compact {
      padding: 10px;
      margin-bottom: 6px;
    }
    
    .mobile-header-text {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
  }
  
  /* Very small screens - below 375px */
  @media (max-width: 375px) {
    .mobile-card-compact {
      padding: 8px;
      margin-bottom: 6px;
    }
    
    .mobile-header-text {
      font-size: 13px !important;
      line-height: 1.3 !important;
    }
    
    .mobile-action-buttons {
      gap: 1px !important;
    }
    
    .mobile-action-compact {
      padding: 4px !important;
      margin: 0 !important;
    }
  }

  /* Ultra small screens - below 320px */
  @media (max-width: 320px) {
    .mobile-card-compact {
      padding: 6px;
      margin-bottom: 4px;
    }
    
    .mobile-header-text {
      font-size: 12px !important;
      line-height: 1.2 !important;
    }
  }
  
  /* Mobile form input optimizations */
  @media (max-width: 640px) {
    .mobile-card-compact select,
    .mobile-card-compact input {
      font-size: 11px !important;
      padding: 4px 6px !important;
      min-height: 28px !important;
    }
  }
  
  @media (max-width: 480px) {
    .mobile-card-compact select,
    .mobile-card-compact input {
      font-size: 10px !important;
      padding: 3px 5px !important;
      min-height: 26px !important;
    }
  }
  
  @media (max-width: 375px) {
    .mobile-card-compact select,
    .mobile-card-compact input {
      font-size: 9px !important;
      padding: 2px 4px !important;
      min-height: 24px !important;
    }
  }
`;

const formatEnumValue = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const TicketQueuePage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState({ ticketId: null, engineerId: null, engineerName: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [t, e] = await Promise.all([getAllTickets(), getServiceEngineers()]);
      setTickets(t.data || []);
      setEngineers(e.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
      if (window.showToast) {
        window.showToast(err.message || 'Failed to load tickets', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    if (window.showToast) {
      window.showToast('Data refreshed successfully', 'success');
    }
  };

  const handleAssignmentChange = (ticketId, engineerId) => {
    // If no engineer selected (empty string), do nothing
    if (!engineerId) {
      return;
    }

    // If assigning an engineer, show confirmation
    const engineer = engineers.find(e => e._id === engineerId);
    setPendingAssignment({
      ticketId,
      engineerId,
      engineerName: engineer?.name || 'Unknown Engineer'
    });
    setShowAssignConfirm(true);
  };

  const confirmAssignment = async () => {
    try {
      const { ticketId, engineerId } = pendingAssignment;
      const response = await assignTicket(ticketId, engineerId);
      // Use the complete response data instead of manually constructing the update
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? response.data : t)));
      if (window.showToast) {
        window.showToast('Engineer assigned successfully', 'success');
      }
    } catch (e) {
      setError(e.message || 'Failed to assign');
      if (window.showToast) {
        window.showToast(e.message || 'Failed to assign', 'error');
      }
    } finally {
      setShowAssignConfirm(false);
      setPendingAssignment({ ticketId: null, engineerId: null, engineerName: '' });
    }
  };

  const cancelAssignment = () => {
    setShowAssignConfirm(false);
    setPendingAssignment({ ticketId: null, engineerId: null, engineerName: '' });
  };

  const onAssign = async (id, engineerId) => {
    // This function is kept for backward compatibility but now just calls handleAssignmentChange
    handleAssignmentChange(id, engineerId);
  };

  const onUpdateMeta = async (id, payload) => {
    try {
      const response = await updateTicketMeta(id, payload);
      // Use the complete response data instead of just merging payload
      setTickets((prev) => prev.map((t) => (t._id === id ? response.data : t)));
      if (window.showToast) {
        window.showToast('Ticket updated successfully', 'success');
      }
    } catch (e) {
      setError(e.message || 'Failed to update');
      if (window.showToast) {
        window.showToast(e.message || 'Failed to update', 'error');
      }
    }
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleTicketUpdate = (updatedTicket) => {
    setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
    // Also update the selectedTicket if it's the same one
    if (selectedTicket && selectedTicket._id === updatedTicket._id) {
      setSelectedTicket(updatedTicket);
    }
    if (window.showToast) {
      window.showToast('Ticket updated successfully', 'success');
    }
  };

  const handleBulkSelect = (ticketId) => {
    setBulkSelected(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleBulkAction = async (action, value) => {
    try {
      const responses = await Promise.all(bulkSelected.map(id => {
        if (action === 'assign') {
          return assignTicket(id, value);
        } else if (action === 'priority') {
          return updateTicketMeta(id, { priority: value });
        }
        return Promise.resolve();
      }));
      
      // Update local state with complete response data
      setTickets(prev => prev.map(t => {
        const responseIndex = bulkSelected.findIndex(id => id === t._id);
        if (responseIndex !== -1 && responses[responseIndex]?.data) {
          return responses[responseIndex].data;
        }
        return t;
      }));
      
      setBulkSelected([]);
      setShowBulkActions(false);
      if (window.showToast) {
        window.showToast(`Bulk ${action} completed successfully`, 'success');
      }
    } catch (e) {
      if (window.showToast) {
        window.showToast(`Bulk ${action} failed: ${e.message}`, 'error');
      }
    }
  };

  // Advanced filtering and sorting
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = tickets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user?.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    // Assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter(ticket => !ticket.assignedEngineerId);
      } else {
        filtered = filtered.filter(ticket => ticket.assignedEngineerId?._id === assigneeFilter);
      }
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        switch (dateFilter) {
          case 'today':
            return ticketDate >= today;
          case 'yesterday':
            return ticketDate >= yesterday && ticketDate < today;
          case 'week':
            return ticketDate >= weekAgo;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'assignee':
          aValue = a.assignedEngineerId?.name || 'zzzz'; // Unassigned goes to end
          bValue = b.assignedEngineerId?.name || 'zzzz';
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tickets, searchTerm, statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = filteredAndSortedTickets.slice(startIndex, endIndex);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-orange-100 text-orange-800 border-orange-200',
      assigned: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      awaiting_customer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
      reopened: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))];

  const exportTickets = () => {
    const csvContent = [
      ['Title', 'Status', 'Priority', 'Category', 'Customer', 'Assignee', 'Created'],
      ...filteredAndSortedTickets.map(t => [
        t.title,
        t.status,
        t.priority,
        t.category,
        t.user?.name || '',
        t.assignedEngineerId?.name || 'Unassigned',
        new Date(t.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    if (window.showToast) {
      window.showToast('Tickets exported successfully', 'success');
    }
  };

  // Mobile Card Component for Tickets
  const TicketCard = ({ ticket }) => (
    <div className="mobile-card-compact mobile-card-container rounded-lg border bg-white shadow-sm hover:shadow-md transition-all duration-200 space-y-3">
      {/* Header Section - Title and Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-start gap-1.5 mb-1">
            <div className="flex-shrink-0 mt-0.5">
              {getPriorityIcon(ticket.priority)}
            </div>
            <h3 
              className="mobile-header-text text-sm sm:text-base font-semibold cursor-pointer hover:text-[#FF7300] transition-colors duration-150 leading-tight text-gray-900"
              onClick={() => handleTicketClick(ticket)}
              title="Click to view details"
              style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {ticket.title}
            </h3>
          </div>
          <p className="text-xs text-gray-500 leading-tight" 
             title={ticket.description}
             style={{ 
               display: '-webkit-box',
               WebkitLineClamp: 2,
               WebkitBoxOrient: 'vertical',
               overflow: 'hidden'
             }}>
            {ticket.description || 'No description'}
          </p>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="checkbox"
            checked={bulkSelected.includes(ticket._id)}
            onChange={() => handleBulkSelect(ticket._id)}
            className="rounded border-gray-300"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => handleTicketClick(ticket)}
            className="mobile-action-compact p-1.5 rounded-md text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150"
            title="View Details"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Customer Information */}
      <div className="space-y-1.5">
        <div className="flex items-center space-x-1.5 text-xs text-gray-600">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {ticket.user?.name || 'Unknown Customer'}
          </span>
        </div>
        {ticket.user?.phone && (
          <div className="flex items-center space-x-1.5 text-xs text-gray-600">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{ticket.user.phone}</span>
          </div>
        )}
      </div>

      {/* Status and Priority Row */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)} max-w-full`}>
            <span className="truncate">{formatEnumValue(ticket.status)}</span>
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Priority</p>
          <select 
            value={ticket.priority} 
            onChange={(e) => onUpdateMeta(ticket._id, { priority: e.target.value })}
            className={`px-2 py-1 sm:px-2 sm:py-1 xs:px-1.5 xs:py-0.5 text-xs font-medium rounded border ${getPriorityColor(ticket.priority)} focus:ring-2 focus:ring-[#FF7300] focus:border-transparent w-full min-w-0`}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Category Input - Full Width */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Category</p>
        <input 
          value={ticket.category || ''} 
          onChange={(e) => onUpdateMeta(ticket._id, { category: e.target.value })}
          className="text-xs text-gray-600 border border-gray-300 rounded px-2 py-1.5 sm:px-2 sm:py-1.5 xs:px-1.5 xs:py-1 focus:ring-2 focus:ring-[#FF7300] focus:border-transparent w-full"
          placeholder="Enter category"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Assignment Section - Full Width */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Assignee</p>
        {ticket.assignedEngineerId ? (
          <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded border border-blue-200 min-w-0">
            <div className="h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="h-2.5 w-2.5 text-blue-600" />
            </div>
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              <span className="text-xs text-gray-700 font-medium truncate">
                {ticket.assignedEngineerId.name}
              </span>
              <Lock className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" title="Assignment is permanent" />
            </div>
          </div>
        ) : (
          <select 
            value="" 
            onChange={(e) => handleAssignmentChange(ticket._id, e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 sm:px-2 sm:py-1.5 xs:px-1.5 xs:py-1 text-xs hover:bg-gray-50 focus:ring-2 focus:ring-[#FF7300] focus:border-transparent w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Select Engineer</option>
            {engineers.map((eng) => (
              <option key={eng._id} value={eng._id}>{eng.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Created Date */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created</p>
        <div className="flex items-center space-x-1.5 text-xs text-gray-600">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{new Date(ticket.createdAt).toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* Action Buttons */}
      {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
        <div className="pt-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdateMeta(ticket._id, {action: 'close'});
            }}
            className="w-full px-3 py-2.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-150 font-medium"
          >
            Close Ticket
          </button>
        </div>
      )}
      
      {ticket.status === 'closed' && (
        <div className="pt-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdateMeta(ticket._id, {action: 'reopen'});
            }}
            className="w-full px-3 py-2.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-150 font-medium"
          >
            Reopen Ticket
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7300]"></div>
        <p className="text-gray-500 text-sm">Loading tickets...</p>
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header Section - Page Title */}
        <div className="border-b border-gray-200 pb-3 sm:pb-5 mb-4 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 mobile-truncate">Ticket Queue</h1>
            </div>
            <div className="flex items-center space-x-3">
              {bulkSelected.length > 0 && (
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <span className="text-sm text-blue-800 font-medium">{bulkSelected.length} selected</span>
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    Actions
                  </button>
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportTickets}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Export tickets"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">Export</span>
              </button>
            </div>
          </div>
        </div>
        
        {showBulkActions && bulkSelected.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">Bulk Actions:</span>
              <select
                onChange={(e) => {
                  const [action, value] = e.target.value.split(':');
                  if (action && value) handleBulkAction(action, value);
                }}
                className="px-3 py-1 border border-blue-300 rounded text-sm"
              >
                <option value="">Select action...</option>
                <option value="priority:high">Set High Priority</option>
                <option value="priority:medium">Set Medium Priority</option>
                <option value="priority:low">Set Low Priority</option>
                {engineers.map(eng => (
                  <option key={eng._id} value={`assign:${eng._id}`}>Assign to {eng.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setBulkSelected([]);
                  setShowBulkActions(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area - Contains filters and table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="px-4 py-3 bg-red-50 border-l-4 border-red-400 text-red-700">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
          {/* Filter and Action Bar */}
          <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
            {/* Filter Status Indicator */}
            {(statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all') && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {[statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter].filter(f => f !== 'all').length} filter{[statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter].filter(f => f !== 'all').length > 1 ? 's' : ''} active
                  </span>
                </div>
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setAssigneeFilter('all');
                    setCategoryFilter('all');
                    setDateFilter('all');
                    setSearchTerm('');
                    setShowFilters(false);
                  }}
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
                    placeholder="Search tickets, customers, phone numbers, categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-1 focus:ring-[#FF7300] focus:border-[#FF7300] transition-colors duration-150 ease-in-out text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
                
                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center p-2 border rounded-md transition-colors duration-150 ease-in-out ${
                    showFilters || (statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all')
                      ? 'border-[#FF7300] bg-[#FF7300] text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                  {(statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all') && (
                    <span className="ml-1 text-xs font-medium">
                      {[statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter].filter(f => f !== 'all').length}
                    </span>
                  )}
                </button>
              </div>

              {/* Filters Section - Collapsible */}
              {showFilters && (
                <div className="border-t border-gray-200 pt-3 space-y-3">
                  {/* Filter Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {/* Status Filter */}
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-[#FF7300] focus:border-[#FF7300] appearance-none"
                      >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="awaiting_customer">Awaiting Customer</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                        <option value="reopened">Reopened</option>
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>

                    {/* Priority Filter */}
                    <div className="relative">
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-[#FF7300] focus:border-[#FF7300] appearance-none"
                      >
                        <option value="all">All Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>

                    {/* Assignee Filter */}
                    <div className="relative">
                      <select
                        value={assigneeFilter}
                        onChange={(e) => setAssigneeFilter(e.target.value)}
                        className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-[#FF7300] focus:border-[#FF7300] appearance-none"
                      >
                        <option value="all">All Engineers</option>
                        <option value="unassigned">Unassigned</option>
                        {engineers.map(eng => (
                          <option key={eng._id} value={eng._id}>{eng.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-[#FF7300] focus:border-[#FF7300] appearance-none"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>

                    {/* Date Filter */}
                    <div className="relative">
                      <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-6 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-[#FF7300] focus:border-[#FF7300] appearance-none"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">This Week</option>
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        {/* Mobile Card View */}
        <div className="md:hidden">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Loading tickets...</div>
            </div>
          ) : currentTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all' 
                ? 'No tickets match your filters' 
                : 'No tickets found'}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
              {currentTickets.map(ticket => (
                <TicketCard
                  key={ticket._id}
                  ticket={ticket}
                  isSelected={bulkSelected.includes(ticket._id)}
                  onSelect={(id, selected) => {
                    if (selected) {
                      setBulkSelected([...bulkSelected, id]);
                    } else {
                      setBulkSelected(bulkSelected.filter(bid => bid !== id));
                    }
                  }}
                  onClick={() => handleTicketClick(ticket)}
                  onUpdate={handleTicketUpdate}
                  userRole={user?.role}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
          <div className="overflow-x-auto flex-1 relative">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      <input
                        type="checkbox"
                        checked={bulkSelected.length === currentTickets.length && currentTickets.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelected(currentTickets.map(t => t._id));
                          } else {
                            setBulkSelected([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-72">
                      <button 
                        onClick={() => handleSort('title')}
                        className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      >
                        <span>Ticket Details</span>
                        {getSortIcon('title')}
                      </button>
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Customer</th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      <button 
                        onClick={() => handleSort('status')}
                        className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      >
                        <span>Status</span>
                        {getSortIcon('status')}
                      </button>
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                      <button 
                        onClick={() => handleSort('priority')}
                        className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      >
                        <span>Priority</span>
                        {getSortIcon('priority')}
                      </button>
                    </th>
                    <th scope="col" className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Category</th>
                    <th scope="col" className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      <button 
                        onClick={() => handleSort('assignee')}
                        className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      >
                        <span>Assignment</span>
                        {getSortIcon('assignee')}
                      </button>
                    </th>
                    <th scope="col" className="hidden 2xl:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      <button 
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      >
                        <span>Created</span>
                        {getSortIcon('createdAt')}
                      </button>
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                  </tr>
                    </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        Loading tickets...
                      </td>
                    </tr>
                  ) : currentTickets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all' 
                          ? 'No tickets match your filters' 
                          : 'No tickets found'}
                      </td>
                    </tr>
                  ) : (
                    currentTickets.map((ticket) => (
                      <tr
                        key={ticket._id}
                        className="transition-colors duration-150 ease-in-out hover:bg-gray-50 cursor-pointer group"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <td className="px-2 lg:px-4 xl:px-6 py-4 w-16" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={bulkSelected.includes(ticket._id)}
                            onChange={() => handleBulkSelect(ticket._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm w-72">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getPriorityIcon(ticket.priority)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div 
                                className="font-medium text-gray-900 hover:text-[#FF7300] transition-colors duration-150 cursor-pointer line-clamp-2 leading-tight"
                                onClick={() => handleTicketClick(ticket)}
                                title={ticket.title}
                              >
                                {ticket.title.length > 60 ? `${ticket.title.substring(0, 60)}...` : ticket.title}
                              </div>
                              <div className="text-gray-500 text-xs mt-1 line-clamp-1 max-w-xs" title={ticket.description}>
                                {ticket.description && ticket.description.length > 80 ? `${ticket.description.substring(0, 80)}...` : ticket.description || 'No description'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm w-48">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-9 w-9 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-gray-900 font-medium text-sm truncate" title={ticket.user?.name || 'Unknown Customer'}>
                                {ticket.user?.name || 'Unknown Customer'}
                              </div>
                              <div className="text-gray-500 text-xs truncate mt-0.5" title={ticket.user?.phone || ''}>
                                {ticket.user?.phone || 'No phone'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 w-32">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 w-36" onClick={(e) => e.stopPropagation()}>
                          <select 
                            value={ticket.priority} 
                            onChange={(e) => onUpdateMeta(ticket._id, { priority: e.target.value })}
                            className={`px-2 py-1 text-xs font-medium rounded border focus:ring-2 focus:ring-[#FF7300] focus:border-transparent ${getPriorityColor(ticket.priority)} w-full`}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </td>
                        <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm w-28" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            <Tag className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <input 
                              value={ticket.category} 
                              onChange={(e) => onUpdateMeta(ticket._id, { category: e.target.value })}
                              className="text-sm text-gray-500 border-none bg-transparent hover:bg-gray-50 focus:bg-white focus:border focus:border-gray-300 focus:ring-2 focus:ring-[#FF7300] rounded px-2 py-1 flex-1 truncate"
                              placeholder="Category"
                            />
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm w-48" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            {ticket.assignedEngineerId ? (
                              <div className="flex items-center space-x-2 w-full p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Users className="h-3 w-3 text-blue-600" />
                                </div>
                                <div className="flex items-center space-x-1 flex-1">
                                  <span className="text-xs text-gray-700 font-medium truncate">
                                    {ticket.assignedEngineerId.name}
                                  </span>
                                  <Lock className="h-3 w-3 text-gray-400" title="Assignment is permanent" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 w-full">
                                <select 
                                  value="" 
                                  onChange={(e) => handleAssignmentChange(ticket._id, e.target.value)}
                                  className="border border-gray-300 rounded px-2 py-1 text-xs hover:bg-gray-50 focus:ring-2 focus:ring-[#FF7300] focus:border-transparent w-full"
                                >
                                  <option value="">Select Engineer</option>
                                  {engineers.map((eng) => (
                                    <option key={eng._id} value={eng._id}>{eng.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="hidden 2xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm w-32">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-500 truncate">
                              {new Date(ticket.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 w-32" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleTicketClick(ticket)}
                              className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md border border-transparent hover:border-orange-200"
                              title="View Details"
                            >
                              <Info className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            </button>
                            {ticket.status !== 'closed' && (
                              <button 
                                onClick={() => onUpdateMeta(ticket._id, {action: 'close'})}
                                className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md border border-transparent hover:border-red-200"
                                title="Close ticket"
                              >
                                <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                              </button>
                            )}
                            {ticket.status === 'closed' && (
                              <button 
                                onClick={() => onUpdateMeta(ticket._id, {action: 'reopen'})}
                                className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                                title="Reopen ticket"
                              >
                                <RotateCcw className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0">
            <div className="text-sm text-gray-600 order-2 sm:order-1">
              Showing {Math.min(startIndex + 1, filteredAndSortedTickets.length)} to {Math.min(endIndex, filteredAndSortedTickets.length)} of {filteredAndSortedTickets.length} results
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

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userRole={user?.role}
        onUpdate={handleTicketUpdate}
      />

      {/* Assignment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showAssignConfirm}
        onClose={cancelAssignment}
        onConfirm={confirmAssignment}
        title="Confirm Engineer Assignment"
        message={`Are you sure you want to assign "${pendingAssignment.engineerName}" to this ticket? Once assigned, the engineer cannot be unassigned.`}
      />
    </div>
    </>
  );
};

export default TicketQueuePage;


