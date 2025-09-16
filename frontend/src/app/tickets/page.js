import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Plus, Eye, Calendar, User, Tag, AlertTriangle, Clock, CheckCircle, XCircle, MessageCircle, Paperclip, X, Upload, FileText, Image, ChevronDown } from 'lucide-react';
import { getMyTickets, createTicket } from '../../services/ticketService';
import TicketDetailModal from '../../components/TicketDetailModal';
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
  
  /* Improved modal responsiveness */
  .mobile-modal-content {
    max-height: 95vh;
    overflow-y: auto;
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
  }
`;

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [uploadPreview, setUploadPreview] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyTickets();
        setTickets(res.data || []);
        setFilteredTickets(res.data || []);
      } catch (e) {
        setError(e.message || 'Failed to load tickets');
        if (window.showToast) {
          window.showToast(e.message || 'Failed to load tickets', 'error');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCreateModal]);

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

  // Function to reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setShowFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || priorityFilter !== 'all';

  // Count active filters (excluding search term for display)
  const activeFilterCount = [
    statusFilter !== 'all' ? statusFilter : null, 
    priorityFilter !== 'all' ? priorityFilter : null
  ].filter(Boolean).length;

  const validateForm = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (!form.category.trim()) errors.category = 'Category is required';
    if (form.title.length > 100) errors.title = 'Title must be less than 100 characters';
    if (form.description.length > 1000) errors.description = 'Description must be less than 1000 characters';
    
    // File validation
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    for (let file of attachments) {
      if (file.size > maxFileSize) {
        errors.attachments = 'Files must be smaller than 5MB';
        break;
      }
      if (!allowedTypes.includes(file.type)) {
        errors.attachments = 'Only images, PDF, text, and Word documents are allowed';
        break;
      }
    }
    
    if (attachments.length > 3) {
      errors.attachments = 'Maximum 3 files allowed';
    }
    
    return errors;
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = [...attachments, ...files].slice(0, 3); // Limit to 3 files
    setAttachments(newFiles);
    
    // Create previews
    const previews = newFiles.map(file => {
      const preview = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: null
      };
      
      if (file.type.startsWith('image/')) {
        preview.url = URL.createObjectURL(file);
      }
      
      return preview;
    });
    
    setUploadPreview(previews);
  };

  const removeFile = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    const newPreviews = uploadPreview.filter((_, i) => i !== index);
    
    // Revoke object URL to prevent memory leaks
    if (uploadPreview[index]?.url) {
      URL.revokeObjectURL(uploadPreview[index].url);
    }
    
    setAttachments(newAttachments);
    setUploadPreview(newPreviews);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    return <FileText className="h-4 w-4" />;
  };

  const submitCreate = async () => {
    const errors = validateForm();
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      if (window.showToast) {
        window.showToast('Please fix the form errors', 'warning');
      }
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      
      // Append files
      attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
      
      const res = await createTicket(formData);
      setTickets((prev) => [res.data, ...prev]);
      
      // Clear form and files
      setShowCreateModal(false);
      setForm({ title: '', description: '', category: '' });
      setFormErrors({});
      setAttachments([]);
      setUploadPreview([]);
      
      // Clean up object URLs
      uploadPreview.forEach(preview => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
      
      if (window.showToast) {
        window.showToast('Ticket created successfully', 'success');
      }
    } catch (e) {
      setError(e.message || 'Failed to create ticket');
      if (window.showToast) {
        window.showToast(e.message || 'Failed to create ticket', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleTicketUpdate = (updatedTicket) => {
    setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
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
      open: 'bg-orange-100 text-orange-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      awaiting_customer: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      reopened: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case 'assigned':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-purple-500" />;
      case 'awaiting_customer':
        return <MessageCircle className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'reopened':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const ticketDate = new Date(date);
    const diffInHours = Math.floor((now - ticketDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return ticketDate.toLocaleDateString();
  };

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header Section - Page Title */}
        <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">My Support Tickets</h1>
            {/* Optional: Subtitle if needed, can be text-gray-500 */}
            {/* <p className="text-sm text-gray-500 mt-1">Track and manage your support requests</p> */}
          </div>
        </div>

        {/* Main Content Area - Contains filters and tickets */}
        <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
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
                    placeholder="Search tickets..."
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

                {/* Create Ticket Button - Desktop Position */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="hidden sm:inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </button>
              </div>

              {/* Create Ticket Button - Mobile Only */}
              <div className="w-full sm:hidden">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
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
                        <option value="open">Open</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="awaiting_customer">Awaiting Customer</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
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

          {/* Tickets Content Area */}
          <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 animate-pulse mobile-card-container">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 lg:py-12">
                <div className="mx-auto h-16 w-16 lg:h-24 lg:w-24 text-gray-400 mb-4">
                  <Tag className="h-full w-full" />
                </div>
                <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                    ? 'No tickets match your filters' 
                    : 'No tickets yet'}
                </h3>
                <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-6 px-4">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'Create your first support ticket to get started.'}
                </p>
                {!(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center space-x-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors min-h-[44px]"
                  >
                    <Plus className="h-4 w-4 lg:h-5 lg:w-5" />
                    <span>Create Your First Ticket</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className={`rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer group mobile-card-container ${
                      ticket.status === 'closed' 
                        ? 'bg-gray-50 border-gray-300' 
                        : 'bg-white border-gray-200'
                    }`}
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <div className="p-3 sm:p-4 lg:p-6 mobile-card-compact">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex items-center space-x-2">
                          {getPriorityIcon(ticket.priority)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(ticket.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Title and Description */}
                      <div className="mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors mobile-header-text line-clamp-2">
                          {ticket.title}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-3">
                          {ticket.description}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-2 mb-3 sm:mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Tag className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="mobile-truncate">{ticket.category}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="mobile-truncate">Created {getTimeAgo(ticket.createdAt)}</span>
                        </div>
                        {ticket.assignedEngineerId && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="mobile-truncate">Assigned to {ticket.assignedEngineerId.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-3 sm:space-x-4 text-xs text-gray-500">
                          {ticket.comments && ticket.comments.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <MessageCircle className="h-3 w-3" />
                              <span>{ticket.comments.length}</span>
                            </div>
                          )}
                          {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Paperclip className="h-3 w-3" />
                              <span>{ticket.attachments.length}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTicketClick(ticket);
                          }}
                          className="flex items-center space-x-1 text-orange-600 hover:text-orange-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">View</span>
                        </button>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        {/* Create Ticket Modal */}
        {showCreateModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[9999]">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto mobile-modal-content">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Create Support Ticket</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setForm({ title: '', description: '', category: '' });
                    setFormErrors({});
                    setAttachments([]);
                    setUploadPreview([]);
                    // Clean up object URLs
                    uploadPreview.forEach(preview => {
                      if (preview.url) {
                        URL.revokeObjectURL(preview.url);
                      }
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); submitCreate(); }} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    formErrors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Brief description of your issue"
                  maxLength={100}
                />
                {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
                <p className="text-gray-500 text-xs mt-1">{form.title.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    formErrors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a category</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="Billing">Billing</option>
                  <option value="Product Issue">Product Issue</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Installation">Installation</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
                {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${
                    formErrors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
                  maxLength={1000}
                />
                {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                <p className="text-gray-500 text-xs mt-1">{form.description.length}/1000 characters</p>
              </div>

                            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments (Optional)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-center w-full">
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      attachments.length >= 3 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                    }`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          Images, PDF, DOC (Max 5MB, up to 3 files)
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        disabled={attachments.length >= 3}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {formErrors.attachments && (
                    <p className="text-red-500 text-sm">{formErrors.attachments}</p>
                  )}
                  
                  {uploadPreview.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                      {uploadPreview.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            {file.url ? (
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                {getFileIcon(file.type)}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Priority Assignment</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Priority will be assigned by our product team based on the issue severity and business impact. 
                      We'll review your ticket and assign the appropriate priority level.
                    </p>
        </div>
      </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setForm({ title: '', description: '', category: '' });
                    setFormErrors({});
                    setAttachments([]);
                    setUploadPreview([]);
                    // Clean up object URLs
                    uploadPreview.forEach(preview => {
                      if (preview.url) {
                        URL.revokeObjectURL(preview.url);
                      }
                    });
                  }}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[44px]"
                >
                  {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{loading ? 'Creating...' : 'Create Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Ticket Detail Modal */}
      {showModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          userRole={user?.role}
          onUpdate={handleTicketUpdate}
        />
      )}
        </div>
      </>
    );
  };

  export default TicketsPage; 