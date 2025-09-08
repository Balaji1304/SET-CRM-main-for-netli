import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Edit2, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Loader2, X, Phone, Mail, Building2, Calendar, FileText, AlertCircle, Info, ShoppingCart, Tag, Users, MapPin, IndianRupee, Clock, User } from 'lucide-react';
import { getLeads, deleteLead } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';

const formatEnumValue = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function LeadsTable({ 
  searchTerm = '', 
  statusFilter = '', 
  sortOrder = 'newest',
  completionFilter = '',
  sourceFilter = '',
  creatorFilter = ''
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLeadForView, setSelectedLeadForView] = useState(null);

  const itemsPerPage = 10;
  const isSalesHead = user?.role === 'sales_head' || user?.role === 'marketing_coordinator';

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getLeads();
      if (response.success) {
        setLeads(response.data);
        setError(null);
      } else {
        setError(response.message || 'Failed to fetch leads');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching leads');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sort leads based on sortOrder prop
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dateCollected || '1970-01-01');
      const dateB = new Date(b.createdAt || b.dateCollected || '1970-01-01');
      
      let timeDiff;
      if (sortOrder === 'oldest') {
        timeDiff = dateA.getTime() - dateB.getTime(); // Ascending order (oldest first)
      } else {
        timeDiff = dateB.getTime() - dateA.getTime(); // Descending order (newest first)
      }
      
      // If dates are the same, use ObjectId comparison as tiebreaker
      if (timeDiff === 0) {
        if (sortOrder === 'oldest') {
          return (a._id || '').localeCompare(b._id || '');
        } else {
          return (b._id || '').localeCompare(a._id || '');
        }
      }
      
      return timeDiff;
    });
  }, [leads, sortOrder]);

  // Initial data fetch
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle location state changes (e.g., returning from edit with success message)
  useEffect(() => {
    if (location.state?.toastMessage) {
      setSuccessMessage(location.state.toastMessage);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      // Refresh leads data after successful operation
      fetchLeads();
      
      // Clear the location state to prevent repeated notifications
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, fetchLeads]);

  // Handle scroll prevention when delete modal is open
  useEffect(() => {
    if (isDeleteModalOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll
      document.body.style.overflow = '';
    }

    // Cleanup function to ensure styles are reset if component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDeleteModalOpen]);

  const filteredLeads = sortedLeads.filter(lead => {
    const searchString = [
      lead.firstName,
      lead.lastName,
      lead.email,
      lead.phone,
      lead.businessName,
      formatEnumValue(lead.leadSource),
      formatEnumValue(lead.leadType),
      formatEnumValue(lead.status),
      // Include creator name in search for sales heads
      ...(isSalesHead && lead.createdBy ? [lead.createdBy.name] : [])
    ].join(' ').toLowerCase();
    
    const formattedStatusFilter = statusFilter.toLowerCase().replace(/\s+/g, '_');
    
    // Search filter
    const matchesSearch = searchTerm === '' || searchString.includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === '' || lead.status === formattedStatusFilter;
    
    // Completion status filter
    const matchesCompletion = completionFilter === '' || 
      (completionFilter === 'complete' && (
        // For enquiry-based leads, check leadCompletionStatus
        (lead.createdFromEnquiry && lead.leadCompletionStatus === 'complete') ||
        // For normal leads (not from enquiry), they are considered complete by default
        (!lead.createdFromEnquiry)
      )) ||
      (completionFilter === 'incomplete' && lead.createdFromEnquiry && lead.leadCompletionStatus === 'incomplete');
    
    // Source filter (enquiry vs direct)
    const matchesSource = sourceFilter === '' ||
      (sourceFilter === 'enquiry' && lead.createdFromEnquiry === true) ||
      (sourceFilter === 'direct' && !lead.createdFromEnquiry);
    
    // Creator filter (others vs specific sales persons)
    const matchesCreator = creatorFilter === '' ||
      (creatorFilter === 'others' && (!lead.createdBy || lead.createdBy._id !== user?.id)) ||
      // Check if it's a specific sales person ID
      (lead.createdBy && lead.createdBy._id === creatorFilter);

    return matchesSearch && matchesStatus && matchesCompletion && matchesSource && matchesCreator;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  const handleEdit = (lead) => {
    try {
      const leadId = lead._id?.toString() || lead.id?.toString();
      if (!leadId) {
        console.error('No valid ID found for lead:', lead);
        setError('Cannot edit lead: Invalid ID.');
        return;
      }
      
      const formattedLead = {
        ...lead,
        id: leadId,
        products: Array.isArray(lead.products) && lead.products.length > 0 ? lead.products : [
          { id: Date.now().toString(), category: '', name: '', quantity: 1, price: 0 }
        ]
      };

      navigate(`/dashboard/edit-lead/${leadId}`, {
        state: { lead: formattedLead }
      });
    } catch (error) {
      console.error('Error navigating to edit page:', error);
      setError('Could not open edit page. Please try again.');
    }
  };

  const handleDelete = useCallback((lead) => {
    setSelectedLead(lead);
    setError(null);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedLead || isDeleting) return;
    
    setIsDeleting(true);
    setError(null);
    try {
      const response = await deleteLead(selectedLead._id || selectedLead.id);
      if (response.success) {
        // Refresh the entire leads list to ensure data consistency
        await fetchLeads();
        setSuccessMessage('Lead deleted successfully');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        setIsDeleteModalOpen(false);
        setSelectedLead(null);
      } else {
        throw new Error(response.message || 'Failed to delete lead');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      setError(error.message || 'Failed to delete lead. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedLead, isDeleting, fetchLeads]);

  // Function to handle viewing lead details
  const handleViewLead = (lead) => {
    setSelectedLeadForView(lead);
    setShowLeadModal(true);
  };

  // Function to close lead modal
  const closeLeadModal = () => {
    setShowLeadModal(false);
    setSelectedLeadForView(null);
  };

  // Lead Details Modal Component
  const LeadDetailsModal = ({ lead, onClose }) => {
    const getStatusColor = (status) => {
      const colors = {
        'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'active': 'bg-blue-100 text-blue-800 border-blue-200',
        'closed_won': 'bg-green-100 text-green-800 border-green-200',
        'closed_lost': 'bg-red-100 text-red-800 border-red-200',
        'on_hold': 'bg-orange-100 text-orange-800 border-orange-200'
      };
      return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const totalBudget = lead.products?.reduce((total, product) => 
      total + ((parseFloat(product.quantity) || 0) * (parseFloat(product.unitPrice) || parseFloat(product.price) || 0)), 
    0) || 0;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#FF7300] to-[#FF8800] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Lead Details</h2>
                <p className="text-orange-100 text-sm">Complete lead information and status</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-150 touch-target"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Lead Name and Status */}
              <div className="border-b border-gray-100 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {`${lead.firstName} ${lead.lastName}`}
                      </h3>
                      {lead.createdFromEnquiry && (
                        <span className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded-md">
                          From Enquiry Form
                        </span>
                      )}
                      {lead.createdFromEnquiry && lead.leadCompletionStatus === 'incomplete' && (
                        <AlertTriangle 
                          className="w-5 h-5 text-orange-500" 
                          title="Lead information incomplete - requires completion by salesperson"
                        />
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4" />
                        <span className="text-sm font-medium">Lead Source: {formatEnumValue(lead.leadSource)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm">Lead Type: {formatEnumValue(lead.leadType)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(lead.status)}`}>
                      {formatEnumValue(lead.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Budget */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                      <IndianRupee className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Total Budget</h4>
                      <p className="text-sm text-gray-600">Estimated value</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{totalBudget.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Products Count */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Products</h4>
                      <p className="text-sm text-gray-600">Interested items</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {lead.products?.length || 0}
                  </div>
                </div>

                {/* Date Created */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-purple-500 p-2 rounded-lg">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Date Created</h4>
                      <p className="text-sm text-gray-600">Lead collected</p>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {lead.dateCollected ? new Date(lead.dateCollected).toLocaleDateString('en-GB') : 'N/A'}
                  </div>
                </div>

                {/* Created By - Show only for sales heads */}
                {isSalesHead && lead.createdBy && (
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-orange-500 p-2 rounded-lg">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Created By</h4>
                        <p className="text-sm text-gray-600">Sales person</p>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {lead.createdBy.name}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {lead.createdBy.role?.replace('_', ' ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Contact Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Phone</span>
                      <span className="text-sm text-gray-900">{lead.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Email</span>
                      <span className="text-sm text-gray-900">
                        {lead.email || (lead.createdFromEnquiry && lead.leadCompletionStatus === 'incomplete' 
                          ? <span className="text-gray-400 italic">To be provided by salesperson</span>
                          : 'N/A'
                        )}
                      </span>
                    </div>
                    {(lead.businessName || true) && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Business Name</span>
                        <span className="text-sm text-gray-900">{lead.businessName || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lead Information */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Info className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Lead Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Lead Source</span>
                      <span className="text-sm text-gray-900">{formatEnumValue(lead.leadSource) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Lead Type</span>
                      <span className="text-sm text-gray-900">{formatEnumValue(lead.leadType) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Status</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(lead.status)}`}>
                        {formatEnumValue(lead.status) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-600">Date Collected</span>
                      <span className="text-sm text-gray-900">
                        {lead.dateCollected ? new Date(lead.dateCollected).toLocaleDateString('en-IN', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : 'N/A'}
                      </span>
                    </div>
                    {isSalesHead && lead.createdBy && (
                      <div className="flex justify-between items-center py-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Created By</span>
                        <div className="text-right">
                          <div className="text-sm text-gray-900">{lead.createdBy.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{lead.createdBy.role?.replace('_', ' ')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Products List */}
              {lead.products && lead.products.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <ShoppingCart className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Products of Interest</h4>
                  </div>
                  <div className="space-y-3">
                    {lead.products.map((product, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {product.name || 'N/A'}
                          </div>
                          {(product.category || true) && (
                            <div className="text-sm text-gray-500">{product.category || 'N/A'}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500">Quantity</div>
                            <div className="text-lg font-semibold text-gray-900">{product.quantity || 1}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500">Unit Price</div>
                            <div className="text-lg font-semibold text-[#FF7300]">
                              ₹{((parseFloat(product.unitPrice) || parseFloat(product.price) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }))}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500">Total</div>
                            <div className="text-lg font-semibold text-gray-900">
                              ₹{((parseFloat(product.quantity) || 0) * (parseFloat(product.unitPrice) || parseFloat(product.price) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h4 className="text-lg font-semibold text-gray-900">Additional Information</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-1">Address</span>
                    <p className="text-sm text-gray-900">{lead.address || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-1">Description</span>
                    <p className="text-sm text-gray-900">{lead.description || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-1">Notes</span>
                    <p className="text-sm text-gray-900">{lead.notes || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      handleEdit(lead);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF7300] text-white rounded-lg font-medium hover:bg-[#FF8800] transition-colors duration-150 touch-target"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Lead
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mobile Card Component
  const LeadCard = ({ lead }) => (
    <div className={`rounded-lg border p-4 space-y-4 shadow-sm hover:shadow-md transition-all duration-200 ${
      lead.createdFromEnquiry 
        ? 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-400' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-lg font-semibold cursor-pointer hover:text-[#FF7300] transition-colors duration-150 ${lead.createdFromEnquiry ? 'text-blue-800' : 'text-gray-900'}`}
                onClick={() => handleViewLead(lead)}
                title="Click to view details">
              {`${lead.firstName} ${lead.lastName}`}
            </h3>
            {lead.createdFromEnquiry && lead.leadCompletionStatus === 'incomplete' && (
              <AlertTriangle 
                className="w-5 h-5 text-orange-500 flex-shrink-0" 
                title="Lead information incomplete - requires completion by salesperson"
              />
            )}
          </div>
          
          {lead.createdFromEnquiry && (
            <div className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded-md inline-block mb-2">
              From Enquiry Form
            </div>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Phone className="w-4 h-4" />
              <span>{lead.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-3">
          <button
            onClick={() => handleViewLead(lead)}
            className="p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150 touch-target"
            title="View Details"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(lead)}
            className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors duration-150 touch-target"
            title="Edit Lead"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(lead)}
            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 touch-target"
            title="Delete Lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Mail className="w-4 h-4" />
          <span className="truncate">
            {lead.email || (lead.createdFromEnquiry && lead.leadCompletionStatus === 'incomplete' 
              ? <span className="text-gray-400 italic">To be provided by salesperson</span>
              : 'N/A'
            )}
          </span>
        </div>
        {lead.businessName && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{lead.businessName}</span>
          </div>
        )}
      </div>

      {/* Status and Details */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
            ${lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800'
            : lead.status === 'closed_won' ? 'bg-green-100 text-green-800'
            : lead.status === 'closed_lost' ? 'bg-red-100 text-red-800'
            : lead.status === 'active' ? 'bg-blue-100 text-blue-800'
            : lead.status === 'on_hold' ? 'bg-orange-100 text-orange-800'
            : 'bg-gray-100 text-gray-800'
            }`}>
            {formatEnumValue(lead.status)}
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Lead Type</p>
          <p className="text-sm text-gray-900">{formatEnumValue(lead.leadType)}</p>
        </div>
      </div>

      {/* Lead Source and Budget */}
      <div className={`grid ${isSalesHead ? 'grid-cols-1' : 'grid-cols-2'} gap-3 pt-3 border-t border-gray-100`}>
        {!isSalesHead && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Lead Source</p>
            <p className="text-sm text-gray-900">{formatEnumValue(lead.leadSource)}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Budget</p>
          <div className="flex items-center space-x-1 text-sm font-medium text-gray-900">
            <span className="text-gray-600 font-semibold">₹</span>
            <span>
              {lead.products?.reduce((total, product) => 
                total + ((parseFloat(product.quantity) || 0) * (parseFloat(product.unitPrice) || parseFloat(product.price) || 0)), 
              0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Additional info for sales head */}
      {isSalesHead && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Lead Source</p>
            <p className="text-sm text-gray-900">{formatEnumValue(lead.leadSource)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created By</p>
            <p className="text-sm text-gray-900 truncate" title={lead.createdBy?.name || 'Unknown'}>
              {lead.createdBy?.name || 'Unknown'}
            </p>
          </div>
        </div>
      )}

      {/* Date */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created</p>
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{new Date(lead.dateCollected).toLocaleDateString('en-GB')}</span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading leads...</p>
      </div>
    );
  }

  if (error && !isDeleteModalOpen && leads.length === 0) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Leads</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
        <button 
          onClick={() => { setError(null); fetchLeads(); }}
          className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity touch-target"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
        <div className="overflow-x-auto flex-1 relative">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {[
                    { key: 'name', label: 'Full Name', width: 'w-32 lg:w-40' },
                    { key: 'phone', label: 'Phone', width: 'w-24 lg:w-32' },
                    { key: 'email', label: 'Email', width: 'w-48', hideOn2Xl: true },
                    { key: 'business', label: 'Business', width: 'w-36', hideOnXl: true },
                    { key: 'leadSource', label: 'Lead Source', width: 'w-24 lg:w-32', hideOnXl: true },
                    { key: 'status', label: 'Status', width: 'w-20 lg:w-24' },
                    { key: 'budget', label: 'Budget', width: 'w-24 lg:w-32' },
                    ...(isSalesHead ? [{ key: 'createdBy', label: 'Created By', width: 'w-28', hideOnXl: true }] : []),
                    { key: 'date', label: 'Date', width: 'w-28', hideOn2Xl: true },
                    { key: 'actions', label: 'Actions', width: 'w-24 lg:w-32' }
                  ].map((header) => (
                    <th
                      key={header.key}
                      scope="col"
                      className={`px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${header.width} 
                        ${header.hideOnLg ? 'hidden lg:table-cell' : ''} 
                        ${header.hideOnXl ? 'hidden xl:table-cell' : ''} 
                        ${header.hideOn2Xl ? 'hidden 2xl:table-cell' : ''}`}
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentLeads.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={isSalesHead ? 10 : 9} className="px-6 py-12 text-center text-gray-500">
                      No leads found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  currentLeads.map((lead) => (
                    <tr
                      key={lead._id || lead.id}
                      className={`transition-colors duration-150 ease-in-out ${
                        lead.createdFromEnquiry 
                          ? 'bg-blue-50/50 hover:bg-blue-50 border-l-4 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm font-medium w-32 lg:w-40">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`truncate cursor-pointer hover:text-[#FF7300] transition-colors duration-150 ${lead.createdFromEnquiry ? 'text-blue-800' : 'text-gray-900'}`}
                            onClick={() => handleViewLead(lead)}
                            title="Click to view details"
                          >
                            {`${lead.firstName} ${lead.lastName}`}
                          </div>
                          {lead.createdFromEnquiry && lead.leadCompletionStatus === 'incomplete' && (
                            <AlertTriangle 
                              className="w-4 h-4 text-orange-500 flex-shrink-0" 
                              title="Lead information incomplete - requires completion by salesperson"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                        <div className="truncate">{lead.phone}</div>
                      </td>
                      <td className="hidden 2xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-48">
                        <div className="truncate">
                          {lead.email || (lead.createdFromEnquiry && lead.leadCompletionStatus === 'incomplete' 
                            ? <span className="text-gray-400 italic">To be provided by salesperson</span>
                            : 'N/A'
                          )}
                        </div>
                      </td>
                      <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-36">
                        <div className="truncate">{lead.businessName || 'N/A'}</div>
                      </td>
                      <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                        <div className="truncate">{formatEnumValue(lead.leadSource)}</div>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 w-20 lg:w-24">
                        <span className={`inline-flex items-center px-1.5 lg:px-2 py-1 rounded-full text-xs font-medium truncate
                          ${lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800'
                          : lead.status === 'closed_won' ? 'bg-green-100 text-green-800'
                          : lead.status === 'closed_lost' ? 'bg-red-100 text-red-800'
                          : lead.status === 'active' ? 'bg-blue-100 text-blue-800'
                          : lead.status === 'on_hold' ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {formatEnumValue(lead.status)}
                        </span>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                        <div className="truncate">
                          ₹{lead.products?.reduce((total, product) => 
                            total + ((parseFloat(product.quantity) || 0) * (parseFloat(product.unitPrice) || parseFloat(product.price) || 0)), 
                          0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                        </div>
                      </td>
                      {isSalesHead && (
                        <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28">
                          <div className="truncate" title={lead.createdBy?.name || 'Unknown'}>
                            {lead.createdBy?.name || 'Unknown'}
                          </div>
                        </td>
                      )}
                      <td className="hidden 2xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28">
                        <div className="truncate">
                          {new Date(lead.dateCollected).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 w-24 lg:w-32">
                        <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                          <button
                            onClick={() => handleViewLead(lead)}
                            className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-orange-200"
                            title="View Details"
                          >
                            <Info className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(lead)}
                            className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                            title="Edit Lead"
                          >
                            <Edit2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead)}
                            className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-red-200"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
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

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {currentLeads.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No leads found matching your criteria.</p>
            </div>
          ) : (
            currentLeads.map((lead) => (
              <LeadCard key={lead._id || lead.id} lead={lead} />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0">
          <div className="text-sm text-gray-600 order-2 sm:order-1">
            Showing {Math.min(startIndex + 1, filteredLeads.length)} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} results
          </div>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="mobile-action-btn border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="mobile-text-sm text-gray-600 px-3 py-2 min-w-[80px] text-center"> 
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="mobile-action-btn border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-5 right-5 bg-primary text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ease-in-out z-50">
          {successMessage}
        </div>
      )}

      {/* Lead Details Modal */}
      {showLeadModal && selectedLeadForView && (
        <LeadDetailsModal 
          lead={selectedLeadForView} 
          onClose={closeLeadModal} 
        />
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            // Close modal when clicking overlay
            if (e.target === e.currentTarget) {
              setIsDeleteModalOpen(false);
              setError(null);
            }
          }}
        >
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto transform transition-all duration-300 ease-out">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Confirm Delete</h3>
              <button 
                onClick={() => { setIsDeleteModalOpen(false); setError(null); }} 
                className="p-1 rounded-full hover:bg-gray-100 touch-target"
              >
                <X className="w-5 h-5 text-gray-500"/>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this lead? This action cannot be undone.
            </p>
            {error && <p className="text-sm text-red-600 mb-3 text-center">{error}</p>}
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setError(null); }}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className={`w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] touch-target`}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 