import React, { useEffect, useState } from 'react';
import { Search, Filter, Eye, MessageCircle, Clock, User, Tag, AlertTriangle, ChevronDown, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAssignedTickets, updateTicketStatus, addComment } from '../../services/ticketService';
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
  }
  
  .mobile-header-text {
    font-size: 16px !important;
    line-height: 1.4 !important;
  }
  
  .mobile-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  /* Line clamping for multiline text */
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

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
  
  /* Mobile status summary improvements */
  @media (max-width: 320px) {
    .mobile-status-compact {
      font-size: 10px !important;
      gap: 1px !important;
    }
    
    .mobile-status-compact span {
      white-space: nowrap;
    }
  }
  
  @media (max-width: 375px) {
    .mobile-card-compact {
      padding: 8px;
    }
    
    .mobile-header-text {
      font-size: 14px !important;
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
`;

const CasesPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Status progression validation
  const STATUS_ORDER = ['open', 'assigned', 'in_progress', 'awaiting_customer', 'resolved', 'closed'];
  
  const isValidStatusTransition = (fromStatus, toStatus) => {
    const fromIndex = STATUS_ORDER.indexOf(fromStatus);
    const toIndex = STATUS_ORDER.indexOf(toStatus);
    return toIndex >= fromIndex;
  };

  // Helper function to sort tickets by assignment time
  const sortTicketsByAssignmentTime = (tickets) => {
    return tickets.sort((a, b) => {
      // Use assignedAt if available, otherwise fall back to updatedAt or createdAt
      const dateA = new Date(a.assignedAt || a.updatedAt || a.createdAt);
      const dateB = new Date(b.assignedAt || b.updatedAt || b.createdAt);
      return dateB - dateA; // Latest first (descending order)
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await getAssignedTickets();
        // Sort tickets by assignedAt timestamp (latest first)
        const sortedTickets = sortTicketsByAssignmentTime(res.data || []);
        
        setTickets(sortedTickets);
        setFilteredTickets(sortedTickets);
      } catch (e) {
        setError(e.message || 'Failed to load cases');
        if (window.showToast) {
          window.showToast(e.message || 'Failed to load cases', 'error');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter tickets based on search and filters
  useEffect(() => {
    let filtered = tickets;

    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = filteredTickets.slice(startIndex, endIndex);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  // Function to reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setShowFilters(false);
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || priorityFilter !== 'all';

  // Count active filters (excluding search term for display)
  const activeFilterCount = [
    statusFilter !== 'all' ? statusFilter : null, 
    priorityFilter !== 'all' ? priorityFilter : null
  ].filter(Boolean).length;

  const onStatusChange = (ticketId, newStatus) => {
    // Find the ticket to check current status
    const ticket = tickets.find(t => t._id === ticketId);
    if (!ticket) return;

    // Validate status transition
    if (!isValidStatusTransition(ticket.status, newStatus)) {
      setError('Cannot move ticket to an earlier state');
      if (window.showToast) {
        window.showToast('Cannot move ticket to an earlier state', 'error');
      }
      return;
    }

    // Show confirmation dialog
    const statusLabels = {
      'in_progress': 'In Progress',
      'awaiting_customer': 'Awaiting Customer',
      'resolved': 'Resolved'
    };

    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Status Change',
      message: `Are you sure you want to change the ticket status to "${statusLabels[newStatus] || newStatus}"?`,
      onConfirm: () => confirmStatusChange(ticketId, newStatus)
    });
  };

  const confirmStatusChange = async (id, status) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    
    try {
      await updateTicketStatus(id, status);
      setTickets((prev) => {
        const updatedTickets = prev.map((t) => (t._id === id ? { ...t, status } : t));
        // Re-sort tickets to maintain assignment time order
        return sortTicketsByAssignmentTime(updatedTickets);
      });
      if (window.showToast) {
        window.showToast('Status updated successfully', 'success');
      }
    } catch (e) {
      setError(e.message || 'Failed to update status');
      if (window.showToast) {
        window.showToast(e.message || 'Failed to update status', 'error');
      }
    }
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleTicketUpdate = (updatedTicket) => {
    setTickets(prev => {
      const updatedTickets = prev.map(t => t._id === updatedTicket._id ? updatedTicket : t);
      // Re-sort tickets to maintain assignment time order
      return sortTicketsByAssignmentTime(updatedTickets);
    });
    // Also update selectedTicket if it's the same ticket being updated
    if (selectedTicket && selectedTicket._id === updatedTicket._id) {
      setSelectedTicket(updatedTicket);
    }
    if (window.showToast) {
      window.showToast('Ticket updated successfully', 'success');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      awaiting_customer: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      reopened: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const formatEnumValue = (value) => {
    if (!value) return '';
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Mobile Card Component
  const TicketCard = ({ ticket }) => (
    <div className={`mobile-card-compact mobile-card-container rounded-lg border space-y-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white border-gray-200`}>
      {/* Header with title and action buttons */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              ticket.priority === 'high' ? 'bg-red-400' :
              ticket.priority === 'medium' ? 'bg-yellow-400' :
              'bg-green-400'
            }`}></div>
            <h3 className={`mobile-header-text font-semibold cursor-pointer hover:text-[#FF7300] transition-colors duration-150 line-clamp-2 leading-tight text-gray-900`}
                onClick={() => handleTicketClick(ticket)}
                title="Click to view details">
              {ticket.title}
            </h3>
          </div>
          
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
            {ticket.description}
          </p>
        </div>
        <div className="mobile-action-buttons flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleTicketClick(ticket)}
            className="mobile-action-compact p-1.5 rounded-md text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status and Priority badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
            {formatEnumValue(ticket.status)}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Category and Customer info */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
          <Tag className="w-4 h-4 flex-shrink-0" />
          <span className="mobile-truncate">{ticket.category}</span>
        </div>
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="mobile-truncate">{ticket.user?.name || 'Unknown'}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        {(ticket.status === 'assigned' || ticket.status === 'reopened') && (
          <button 
            className="flex-1 px-3 py-2 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center" 
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(ticket._id, 'in_progress');
            }}
          >
            {ticket.status === 'reopened' ? 'Restart' : 'Start Work'}
          </button>
        )}
        {ticket.status === 'in_progress' && (
          <>
            <button 
              className="flex-1 px-3 py-2 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600 transition-colors flex items-center justify-center" 
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(ticket._id, 'awaiting_customer');
              }}
            >
              Wait for Customer
            </button>
            <button 
              className="flex-1 px-3 py-2 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors flex items-center justify-center" 
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(ticket._id, 'resolved');
              }}
            >
              Mark Resolved
            </button>
          </>
        )}
        {ticket.status === 'awaiting_customer' && (
          <button 
            className="flex-1 px-3 py-2 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors flex items-center justify-center" 
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(ticket._id, 'resolved');
            }}
          >
            Mark Resolved
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
      {/* Header Section - Page Title */}
      <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary">Assigned Cases</h1>
          </div>
          
          {/* Status Summary - Right Side */}
          <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span>Assigned: {tickets.filter(t => t.status === 'assigned').length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
              <span>In Progress: {tickets.filter(t => t.status === 'in_progress').length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
              <span>Reopened: {tickets.filter(t => t.status === 'reopened').length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span>Resolved: {tickets.filter(t => t.status === 'resolved').length}</span>
            </div>
          </div>
        </div>
        
        {/* Mobile Status Summary */}
        <div className="sm:hidden mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 mobile-status-compact">
          <div className="flex items-center space-x-1 min-w-0">
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full flex-shrink-0"></div>
            <span className="truncate">Assigned: {tickets.filter(t => t.status === 'assigned').length}</span>
          </div>
          <div className="flex items-center space-x-1 min-w-0">
            <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full flex-shrink-0"></div>
            <span className="truncate">In Progress: {tickets.filter(t => t.status === 'in_progress').length}</span>
          </div>
          <div className="flex items-center space-x-1 min-w-0">
            <div className="w-2.5 h-2.5 bg-orange-400 rounded-full flex-shrink-0"></div>
            <span className="truncate">Reopened: {tickets.filter(t => t.status === 'reopened').length}</span>
          </div>
          <div className="flex items-center space-x-1 min-w-0">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full flex-shrink-0"></div>
            <span className="truncate">Resolved: {tickets.filter(t => t.status === 'resolved').length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area - Contains filters and table */}
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        {error && <div className="px-4 py-2 text-red-600 text-sm bg-red-50 border-b border-red-200">{error}</div>}
        
        {/* Filter and Action Bar */}
        <div className="p-4 md:p-6 border-b border-fourth sticky top-0 bg-tertiary z-20">
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
                  placeholder="Search cases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400"
                />
              </div>
              
              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center justify-center p-2 border rounded-md transition-colors duration-150 ease-in-out ${
                  showFilters || activeFilterCount > 0
                    ? 'border-primary bg-primary text-white'
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="all">All Status</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="awaiting_customer">Awaiting Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="reopened">Reopened</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Priority Filter */}
                  <div className="relative">
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="all">All Priority</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
            <div className="overflow-x-auto flex-1 relative">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {[
                        { key: 'case', label: 'Case', width: 'w-64 lg:w-80' },
                        { key: 'status', label: 'Status', width: 'w-24 lg:w-32' },
                        { key: 'priority', label: 'Priority', width: 'w-20 lg:w-24' },
                        { key: 'category', label: 'Category', width: 'w-28 lg:w-32', hideOnLg: true },
                        { key: 'customer', label: 'Customer', width: 'w-32 lg:w-40', hideOnXl: true },
                        { key: 'actions', label: 'Actions', width: 'w-32 lg:w-40' }
                      ].map((header) => (
                        <th
                          key={header.key}
                          scope="col"
                          className={`px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${header.width} 
                            ${header.hideOnLg ? 'hidden lg:table-cell' : ''} 
                            ${header.hideOnXl ? 'hidden xl:table-cell' : ''}`}
                        >
                          {header.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-center text-sm text-gray-500" colSpan={6}>
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="ml-2">Loading cases...</span>
                          </div>
                        </td>
                      </tr>
                    ) : currentTickets.length === 0 ? (
                      <tr>
                        <td className="px-2 lg:px-4 xl:px-6 py-8 text-center text-sm text-gray-500" colSpan={6}>
                          <div className="flex flex-col items-center">
                            <Tag className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-900 mb-2">
                              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                                ? 'No cases match your filters' 
                                : 'No cases assigned yet'}
                            </p>
                            <p className="text-gray-600">
                              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                                ? 'Try adjusting your search criteria or filters.'
                                : 'Cases will appear here when assigned by the Product Head.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentTickets.map((t) => (
                        <tr 
                          key={t._id} 
                          className="hover:bg-orange-50/50 transition-colors cursor-pointer group" 
                          onClick={() => handleTicketClick(t)}
                        >
                          <td className="px-2 lg:px-4 xl:px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                t.priority === 'high' ? 'bg-red-400' :
                                t.priority === 'medium' ? 'bg-yellow-400' :
                                'bg-green-400'
                              }`}></div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                                  {t.title}
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-2 max-w-xs lg:max-w-sm">
                                  {t.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(t.status)}`}>
                              {formatEnumValue(t.status)}
                            </span>
                          </td>
                          <td className="px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(t.priority)}`}>
                              {t.priority?.toUpperCase()}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Tag className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-500 truncate">{t.category}</span>
                            </div>
                          </td>
                          <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-500 truncate">{t.user?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 items-center justify-start" onClick={(e) => e.stopPropagation()}>
                              {(t.status === 'assigned' || t.status === 'reopened') && (
                                <button 
                                  className="px-2 lg:px-3 py-1 lg:py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center" 
                                  onClick={() => onStatusChange(t._id, 'in_progress')}
                                >
                                  {t.status === 'reopened' ? 'Restart' : 'Start'}
                                </button>
                              )}
                              {t.status === 'in_progress' && (
                                <>
                                  <button 
                                    className="px-2 lg:px-3 py-1 lg:py-1.5 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600 transition-colors flex items-center justify-center" 
                                    onClick={() => onStatusChange(t._id, 'awaiting_customer')}
                                  >
                                    Wait
                                  </button>
                                  <button 
                                    className="px-2 lg:px-3 py-1 lg:py-1.5 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors flex items-center justify-center" 
                                    onClick={() => onStatusChange(t._id, 'resolved')}
                                  >
                                    Resolve
                                  </button>
                                </>
                              )}
                              {t.status === 'awaiting_customer' && (
                                <button 
                                  className="px-2 lg:px-3 py-1 lg:py-1.5 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors flex items-center justify-center" 
                                  onClick={() => onStatusChange(t._id, 'resolved')}
                                >
                                  Resolve
                                </button>
                              )}
                              <button
                                onClick={() => handleTicketClick(t)}
                                className="p-1 lg:p-1.5 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                                title="View Details"
                              >
                                <Eye className="h-3 w-3 lg:h-4 lg:w-4 text-gray-400" />
                              </button>
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

          {/* Mobile Cards View - Hidden on desktop */}
          <div className="md:hidden flex-1 overflow-y-auto">
            <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-sm text-gray-600">Loading cases...</span>
                </div>
              ) : currentTickets.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 text-gray-300 mb-4 mx-auto" />
                  <p className="text-base font-medium text-gray-900 mb-2">
                    {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                      ? 'No cases match your filters' 
                      : 'No cases assigned yet'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? 'Try adjusting your search criteria or filters.'
                      : 'Cases will appear here when assigned by the Product Head.'}
                  </p>
                </div>
              ) : (
                currentTickets.map((ticket) => (
                  <div key={ticket._id} className="w-full max-w-full">
                    <TicketCard ticket={ticket} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="px-2 sm:px-4 lg:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-2 sm:space-y-0">
          <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
            Showing {Math.min(startIndex + 1, filteredTickets.length)} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} results
          </div>
          <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="text-xs sm:text-sm text-gray-600 px-2 sm:px-3 py-2 min-w-[60px] sm:min-w-[80px] text-center"> 
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 rounded-lg"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Case Detail Modal */}
      {showModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          userRole={user?.role}
          onUpdate={handleTicketUpdate}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
    </>
  );
};

export default CasesPage;


