'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEnquiries, getSalespersons, assignEnquiryToSalesperson } from '../../services/enquiryService';
import { Loader2, AlertTriangle, Search, Filter, Eye, UserPlus, ChevronLeft, ChevronRight, Phone, Mail, MapPin, User, X, Calendar, FileText, ArrowLeft } from 'lucide-react';

// Custom styles for better mobile experience
const customStyles = `
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
  
  @media (max-width: 640px) {
    .touch-target {
      min-height: 48px;
      padding: 12px 16px;
    }
  }
`;

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

const formatAssignmentStatus = (status) => {
  if (!status) return 'N/A';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getStatusBadgeClass = (status) => {
    const classes = {
      pending_assignment: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      assigned: 'bg-blue-100 text-blue-700 border-blue-300',
      converted_to_lead: 'bg-green-100 text-green-700 border-green-300',
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border-gray-300';
};

const formatEnumValue = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Assignment Modal Component
const AssignEnquiryModal = ({ 
  enquiry, 
  salespersons, 
  onClose, 
  onAssign, 
  error, 
  isAssigning 
}) => {
  const [selectedSalesperson, setSelectedSalesperson] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSalesperson) return;
    
    onAssign({
      salespersonId: selectedSalesperson,
      notes: notes.trim()
    });
  };

  if (!enquiry) return null;

  return (
    <>
      <style>{customStyles}</style>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Assign Enquiry to Salesperson</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-target"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Enquiry Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 sm:mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Enquiry Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{enquiry.firstName} {enquiry.lastName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2 text-gray-900">{enquiry.phone}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900 break-all">{enquiry.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Lead Type:</span>
                  <span className="ml-2 text-gray-900">{formatEnumValue(enquiry.leadType)}</span>
                </div>
                {enquiry.productRequirements && (
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Requirements:</span>
                    <span className="ml-2 text-gray-900">{enquiry.productRequirements}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="salesperson" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Salesperson <span className="text-red-500">*</span>
                </label>
                <select
                  id="salesperson"
                  value={selectedSalesperson}
                  onChange={(e) => setSelectedSalesperson(e.target.value)}
                  required
                  className="block w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base touch-target appearance-none"
                >
                  <option value="">Choose a salesperson...</option>
                  {salespersons.map(person => (
                    <option key={person._id || person.id} value={person._id || person.id}>
                      {person.name} ({person.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information for the salesperson..."
                  className="block w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base touch-target resize-none"
                />
              </div>

              {error && (
                <div className="p-3 sm:p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-target"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedSalesperson}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] touch-target"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Assigning...
                    </>
                  ) : (
                    'Assign & Create Lead'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

// Mobile Card Component for Enquiries
const EnquiryCard = ({ enquiry, onAssign }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 shadow-sm">
    {/* Header with Name and Status */}
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {enquiry.firstName} {enquiry.lastName}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(enquiry.assignmentStatus)}`}>
            {formatAssignmentStatus(enquiry.assignmentStatus)}
          </span>
        </div>
      </div>
      {enquiry.assignmentStatus === 'pending_assignment' && (
        <button
          onClick={() => onAssign(enquiry)}
          className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors touch-target"
          title="Assign to Salesperson"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      )}
    </div>

    {/* Contact Information */}
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="break-all">{enquiry.phone}</span>
      </div>
      {enquiry.email && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="break-all">{enquiry.email}</span>
        </div>
      )}
      {enquiry.address && (
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="break-words">{enquiry.address}</span>
        </div>
      )}
    </div>

    {/* Lead Type and Requirements */}
    <div className="space-y-2">
      <div className="text-sm">
        <span className="font-medium text-gray-700">Lead Type:</span>
        <span className="ml-2 text-gray-900">{formatEnumValue(enquiry.leadType)}</span>
        {enquiry.customLeadType && (
          <span className="ml-1 text-gray-500">({enquiry.customLeadType})</span>
        )}
      </div>
      {enquiry.productRequirements && (
        <div className="text-sm">
          <span className="font-medium text-gray-700">Requirements:</span>
          <p className="mt-1 text-gray-900 text-xs bg-gray-50 p-2 rounded break-words">
            {enquiry.productRequirements}
          </p>
        </div>
      )}
    </div>

    {/* Meta Information */}
    <div className="pt-3 border-t border-gray-100 grid grid-cols-1 gap-3 text-xs text-gray-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Created: {formatDate(enquiry.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>{enquiry.createdBy?.name || 'N/A'}</span>
        </div>
      </div>
      {enquiry.assignedTo && (
        <div className="text-sm">
          <span className="font-medium text-gray-700">Assigned to:</span>
          <div className="mt-1">
            <div className="font-medium text-gray-900">{enquiry.assignedTo.name}</div>
            <div className="text-xs text-gray-500">{enquiry.assignedTo.email}</div>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default function LeadAssignmentPage() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [salespersons, setSalespersons] = useState([]);
  const [loadingSalespersons, setLoadingSalespersons] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEnquiryForAssignment, setSelectedEnquiryForAssignment] = useState(null);
  const [assignError, setAssignError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getEnquiries();
      if (response.success) {
        setEnquiries(response.data || []);
      } else {
        setError(response.message || 'Failed to fetch enquiries.');
      }
    } catch (err) {
      console.error('Error fetching enquiries:', err);
      setError(err.message || 'An error occurred while fetching enquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSalespersons = useCallback(async () => {
    try {
      setLoadingSalespersons(true);
      const response = await getSalespersons();
      if (response.success) {
        setSalespersons(response.data || []);
      } else {
        console.error(response.message || 'Failed to fetch salespersons.');
      }
    } catch (err) {
      console.error('Error fetching salespersons:', err);
    } finally {
      setLoadingSalespersons(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
    fetchSalespersons();
  }, [fetchEnquiries, fetchSalespersons]);

  const handleOpenAssignModal = (enquiry) => {
    setSelectedEnquiryForAssignment(enquiry);
    setAssignError('');
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedEnquiryForAssignment(null);
    setAssignError('');
  };

  const handleAssignEnquiry = async (assignmentData) => {
    if (!selectedEnquiryForAssignment || !selectedEnquiryForAssignment._id) {
      setAssignError('No enquiry selected for assignment.');
      return;
    }
    try {
      setIsAssigning(true);
      setAssignError('');
      const response = await assignEnquiryToSalesperson(selectedEnquiryForAssignment._id, assignmentData);
      if (response.success) {
        setShowAssignModal(false);
        setSelectedEnquiryForAssignment(null);
        await fetchEnquiries(); // Refresh the list
      } else {
        setAssignError(response.message || 'Failed to assign enquiry.');
      }
    } catch (err) {
      console.error('Error assigning enquiry:', err);
      setAssignError(err.message || 'An error occurred during assignment.');
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(enquiry => {
      const searchString = [
        enquiry.firstName,
        enquiry.lastName,
        enquiry.email,
        enquiry.phone,
        formatEnumValue(enquiry.leadType),
        enquiry.createdBy?.name
      ].join(' ').toLowerCase();
      
      const matchesSearch = searchTerm === '' || searchString.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || enquiry.assignmentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enquiries, searchTerm, statusFilter]);
  
  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
  const currentEnquiries = filteredEnquiries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const assignmentStatuses = [
    { value: 'pending_assignment', label: 'Pending Assignment' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'converted_to_lead', label: 'Converted to Lead' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gray-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-gray-700">Loading enquiries...</p>
      </div>
    );
  }

  if (error && enquiries.length === 0) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gray-50 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Enquiries</p>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchEnquiries}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity touch-target"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col flex-1 bg-gray-50 font-sans">
        {/* Header Section */}
        <div className="border-b border-gray-200 pb-4 sm:pb-5 mb-6 sm:mb-8 bg-white px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600 sm:hidden touch-target"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Lead Assignment
                </h1>
                <p className="mt-1 sm:mt-2 text-sm text-gray-600">
                  Assign enquiries to sales personnel and create leads
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6 mx-4 sm:mx-6 mb-4 sm:mb-6 flex flex-col">
          {/* Toolbar with Search and Filters */}
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 sm:max-w-md">
                <input
                  type="text"
                  placeholder="Search enquiries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 sm:py-2 w-full border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white touch-target"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <select
                  id="status-filter"
                  name="status-filter"
                  className="px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-gray-700 bg-white touch-target appearance-none min-w-0 sm:min-w-[180px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {assignmentStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
              <div>
                {filteredEnquiries.length > 0 ? (
                  <>
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredEnquiries.length)}</span> of{' '}
                    <span className="font-medium">{filteredEnquiries.length}</span> enquiries
                  </>
                ) : (
                  'No enquiries found'
                )}
              </div>
              {(searchTerm || statusFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setCurrentPage(1);
                  }}
                  className="text-primary hover:text-primary/80 font-medium text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {error && enquiries.length > 0 && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6 flex items-start gap-2" role="alert">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"/>
              <div>
                  <strong className="font-bold">An error occurred: </strong>
                  <span className="block sm:inline">{error}</span>
              </div>
              </div>
          )}
          
          {/* Content Area - Desktop Table / Mobile Cards */}
          <div className="flex-1 overflow-hidden">
            {currentEnquiries.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-xl font-medium text-gray-900 mb-2">No Enquiries Found</p>
                <p className="text-sm text-gray-500">
                  {searchTerm || statusFilter
                    ? "No enquiries match your current filters."
                    : "There are no enquiries to display."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-y-auto -mx-6 -mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enquiry Details</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentEnquiries.map((enquiry) => (
                        <tr key={enquiry._id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {enquiry.firstName} {enquiry.lastName}
                            </div>
                            {enquiry.productRequirements && (
                              <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                {enquiry.productRequirements}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {enquiry.phone}
                            </div>
                            {enquiry.email && (
                              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span className="truncate max-w-xs">{enquiry.email}</span>
                              </div>
                            )}
                            {enquiry.address && (
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span className="truncate max-w-xs">{enquiry.address}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatEnumValue(enquiry.leadType)}
                            {enquiry.customLeadType && (
                              <div className="text-xs text-gray-500">({enquiry.customLeadType})</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(enquiry.createdAt)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {enquiry.createdBy ? enquiry.createdBy.name : 'N/A'}
                            {enquiry.createdBy?.email && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">{enquiry.createdBy.email}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(enquiry.assignmentStatus)}`}>
                              {formatAssignmentStatus(enquiry.assignmentStatus)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {enquiry.assignedTo ? (
                              <div>
                                <div className="font-medium">{enquiry.assignedTo.name}</div>
                                <div className="text-xs text-gray-500 truncate max-w-xs">{enquiry.assignedTo.email}</div>
                              </div>
                            ) : (
                              'Not Assigned'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {enquiry.assignmentStatus === 'pending_assignment' && (
                                <button 
                                  onClick={() => handleOpenAssignModal(enquiry)} 
                                  className="p-2 rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors" 
                                  title="Assign to Salesperson"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="lg:hidden space-y-4 overflow-y-auto -mx-4 -mb-4 px-4 pb-4">
                  {currentEnquiries.map((enquiry) => (
                    <EnquiryCard
                      key={enquiry._id}
                      enquiry={enquiry}
                      onAssign={handleOpenAssignModal}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
              <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 sticky bottom-0 left-0 right-0 mt-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6">
                  <div className="text-sm text-gray-600 text-center sm:text-left">
                    <span className="hidden sm:inline">
                      Showing {filteredEnquiries.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredEnquiries.length)} of {filteredEnquiries.length} results
                    </span>
                    <span className="sm:hidden">
                      {filteredEnquiries.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredEnquiries.length)} of {filteredEnquiries.length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                        disabled={currentPage === 1} 
                        className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors touch-target"
                        aria-label="Previous page"
                      >
                          <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600 px-2"> 
                        <span className="hidden sm:inline">Page </span>{currentPage} of {totalPages}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                        disabled={currentPage === totalPages} 
                        className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors touch-target"
                        aria-label="Next page"
                      >
                          <ChevronRight className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          )}
        </div>

        {showAssignModal && selectedEnquiryForAssignment && (
          <AssignEnquiryModal
            enquiry={selectedEnquiryForAssignment}
            salespersons={salespersons}
            onClose={handleCloseAssignModal}
            onAssign={handleAssignEnquiry}
            error={assignError}
            isAssigning={isAssigning}
          />
        )}
      </div>
    </>
  );
} 