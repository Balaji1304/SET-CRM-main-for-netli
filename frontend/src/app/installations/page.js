import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Eye, ChevronLeft, ChevronRight, Calendar, User, Package, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments, acceptAssignment, startWork } from '../../services/installationService';
import { toast } from 'react-toastify';

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
  
  /* Modal enhancements for mobile devices */
  @media (max-width: 640px) {
    .mobile-modal-content {
      max-height: 90vh;
      margin: 0;
    }
    
    .mobile-modal-content .space-y-6 > * + * {
      margin-top: 1rem !important;
    }
    
    .mobile-modal-content .flex.flex-col.sm\\:flex-row {
      flex-direction: column !important;
    }
    
    .mobile-modal-content input,
    .mobile-modal-content textarea {
      font-size: 16px !important; /* Prevents zoom on iOS */
    }
  }
  
  /* Prevent body scroll when modal is open */
  .modal-open {
    overflow: hidden !important;
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

const InstallationDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showStartWorkModal, setShowStartWorkModal] = useState(false);
  const [acceptData, setAcceptData] = useState({
    estimatedArrival: '',
    notes: ''
  });
  const [startWorkData, setStartWorkData] = useState({
    notes: ''
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // Helper function to sort assignments by relevant timestamps
  const sortAssignmentsByTime = (assignments) => {
    return assignments.sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.installationDate || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.installationDate || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  };

  // Filter assignments based on search and filters
  useEffect(() => {
    let filtered = [...assignments];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(assignment => 
        assignment.purchaseID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${assignment.customerId?.firstName} ${assignment.customerId?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.customerId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.customerId?.phone?.includes(searchTerm) ||
        assignment.products?.some(product => product.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assignment => assignment.installationStatus === statusFilter);
    }

    // Sort filtered results
    const sortedFiltered = sortAssignmentsByTime(filtered);
    setFilteredAssignments(sortedFiltered);
  }, [assignments, searchTerm, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssignments = filteredAssignments.slice(startIndex, endIndex);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Function to reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setShowFilters(false);
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter !== 'all';

  // Count active filters (excluding search term for display)
  const activeFilterCount = [
    statusFilter !== 'all' ? statusFilter : null
  ].filter(Boolean).length;

  // Simplified engineer badge mapping
  const getEngineerBadge = (status) => {
    const mapping = {
      assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-800' },
      in_progress: { label: 'Work in progress', color: 'bg-purple-100 text-purple-800' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
      issues: { label: 'Issues reported', color: 'bg-red-100 text-red-800' }
    };
    return mapping[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  useEffect(() => {
    if (user?.role === 'service_engineer') {
      fetchAssignments();
    }
  }, [user]);

  // Prevent background scroll when modals are open
  useEffect(() => {
    if (showAcceptModal || showStartWorkModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showAcceptModal, showStartWorkModal]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getMyAssignments();
      const list = Array.isArray(response.data) ? response.data : [];
      // Sort latest to oldest using relevant timestamps
      const sorted = sortAssignmentsByTime(list);
      setAssignments(sorted);
      // filteredAssignments will be set by useEffect
    } catch (error) {
      toast.error('Failed to fetch assignments');
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAssignment = async (assignment) => {
    setSelectedAssignment(assignment);
    setAcceptData({
      estimatedArrival: '',
      notes: ''
    });
    setShowAcceptModal(true);
  };

  const handleModalBackdropClick = (e, modalType) => {
    if (e.target === e.currentTarget) {
      if (modalType === 'accept') {
        setShowAcceptModal(false);
      } else if (modalType === 'startWork') {
        setShowStartWorkModal(false);
      }
    }
  };

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showAcceptModal) {
          setShowAcceptModal(false);
        } else if (showStartWorkModal) {
          setShowStartWorkModal(false);
        }
      }
    };

    if (showAcceptModal || showStartWorkModal) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAcceptModal, showStartWorkModal]);

  const submitAcceptance = async () => {
    try {
      await acceptAssignment(selectedAssignment._id, acceptData);
      toast.success('Assignment accepted successfully!');
      setShowAcceptModal(false);
      await fetchAssignments();
    } catch (error) {
      toast.error('Failed to accept assignment');
      console.error('Error accepting assignment:', error);
    }
  };

  const handleStartWork = (assignment) => {
    setSelectedAssignment(assignment);
    setStartWorkData({
      notes: ''
    });
    setShowStartWorkModal(true);
  };

  const submitStartWork = async () => {
    try {
      await startWork(selectedAssignment._id, startWorkData);
      toast.success('Work started successfully!');
      setShowStartWorkModal(false);
      await fetchAssignments();
    } catch (error) {
      toast.error('Failed to start work');
      console.error('Error starting work:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Assignment Card Component
  const AssignmentCard = ({ assignment }) => (
    <div className="mobile-card-compact mobile-card-container rounded-lg border space-y-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="mobile-header-text font-semibold text-gray-900 line-clamp-1">
              Order #{assignment.purchaseID}
            </h3>
            {(() => { const b = getEngineerBadge(assignment.installationStatus); return (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.color} flex-shrink-0`}>
                {b.label}
              </span>
            ); })()}
          </div>
        </div>
        <div className="mobile-action-buttons flex items-center gap-1 flex-shrink-0">
          <button
            className="mobile-action-compact p-1.5 rounded-md text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="mobile-truncate font-medium text-gray-900">
            {assignment.customerId.firstName} {assignment.customerId.lastName}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="w-4 h-4 flex items-center justify-center">📧</span>
          <span className="mobile-truncate">{assignment.customerId.email}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="w-4 h-4 flex items-center justify-center">📱</span>
          <span className="mobile-truncate">{assignment.customerId.phone}</span>
        </div>
        {assignment.customerId.address && (
          <div className="flex items-start space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{assignment.customerId.address}</span>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-2 mb-2">
          <Package className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Products to Install</span>
        </div>
        <div className="space-y-1">
          {assignment.products?.slice(0, 2).map((product, index) => (
            <div key={index} className="text-sm text-gray-600 flex items-center space-x-1">
              <span className="font-medium text-gray-900">{product.quantity}x</span>
              <span className="line-clamp-1">{product.name}</span>
              {product.modelNumber && (
                <span className="text-gray-400 text-xs">({product.modelNumber})</span>
              )}
            </div>
          ))}
          {assignment.products?.length > 2 && (
            <div className="text-xs text-gray-500">
              +{assignment.products.length - 2} more product{assignment.products.length - 2 !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Installation Date */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-2 mb-1">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Scheduled Date</span>
        </div>
        <p className="text-sm text-gray-900">
          {formatDate(assignment.installationDate)}
        </p>
      </div>

      {/* Notes */}
      {assignment.serviceAssignmentNotes && (
        <div className="pt-2 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-700 block mb-1">Notes</span>
          <p className="text-sm text-gray-600 line-clamp-2">{assignment.serviceAssignmentNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        {assignment.installationStatus === 'assigned' && (
          <button
            onClick={() => handleAcceptAssignment(assignment)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
          >
            Accept Assignment
          </button>
        )}
        {assignment.installationStatus === 'accepted' && (
          <button
            onClick={() => handleStartWork(assignment)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
          >
            Start Work
          </button>
        )}
        {assignment.installationStatus === 'in_progress' && (
          <button
            onClick={() => window.location.href = `/dashboard/installations/${assignment._id}/complete`}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
          >
            Complete Installation
          </button>
        )}
        {assignment.installationStatus === 'completed' && (
          <button
            onClick={() => window.location.href = `/dashboard/installations/${assignment._id}/completed`}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
          >
            View Completion
          </button>
        )}
      </div>
    </div>
  );

  if (user?.role !== 'service_engineer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to service engineers.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header Section - Page Title */}
        <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary">Installation Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500 hidden sm:block">
                Manage your installation assignments and track progress
              </p>
            </div>
            
            {/* Assignment Summary - Right Side */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {assignments.length} Total Assignment{assignments.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
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
                    placeholder="Search assignments..."
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
                </button>
              </div>

              {/* Filters Row - Collapsible */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-fourth">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 text-secondary"
                    >
                      <option value="all">All Status</option>
                      <option value="assigned">Assigned</option>
                      <option value="accepted">Accepted</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="issues">Issues</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <div className="p-4 md:p-6 h-full">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading assignments...</span>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {hasActiveFilters ? 'No matching assignments' : 'No assignments'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {hasActiveFilters 
                      ? 'Try adjusting your search or filter criteria.' 
                      : 'You don\'t have any installation assignments at the moment.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Cards View */}
                  <div className="block sm:hidden space-y-4">
                    {currentAssignments.map((assignment) => (
                      <AssignmentCard key={assignment._id} assignment={assignment} />
                    ))}
                  </div>

                  {/* Desktop Grid View */}
                  <div className="hidden sm:block">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {currentAssignments.map((assignment) => (
                        <AssignmentCard key={assignment._id} assignment={assignment} />
                      ))}
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(endIndex, filteredAssignments.length)}</span> of{' '}
                            <span className="font-medium">{filteredAssignments.length}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            {[...Array(totalPages)].map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentPage(index + 1)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                                  currentPage === index + 1
                                    ? 'bg-primary text-white ring-primary'
                                    : 'text-gray-900'
                                }`}
                              >
                                {index + 1}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      {/* Accept Assignment Modal */}
      {showAcceptModal && createPortal(
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => handleModalBackdropClick(e, 'accept')}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto mobile-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Accept Assignment
                </h3>
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Arrival Time
                  </label>
                  <input
                    type="datetime-local"
                    value={acceptData.estimatedArrival}
                    onChange={(e) => setAcceptData(prev => ({ ...prev, estimatedArrival: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={acceptData.notes}
                    onChange={(e) => setAcceptData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm"
                    placeholder="Any additional notes about the assignment..."
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAcceptance}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Accept Assignment
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Start Work Modal */}
      {showStartWorkModal && createPortal(
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => handleModalBackdropClick(e, 'startWork')}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto mobile-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Start Work on Installation
                </h3>
                <button
                  onClick={() => setShowStartWorkModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={startWorkData.notes}
                    onChange={(e) => setStartWorkData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm"
                    placeholder="Any notes about starting the installation work..."
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={() => setShowStartWorkModal(false)}
                  className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitStartWork}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Start Work
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </>
  );
};

export default InstallationDashboard;
