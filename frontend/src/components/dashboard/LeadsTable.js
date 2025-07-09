import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Loader2, X, Phone, Mail, Building2, Calendar } from 'lucide-react';
import { getLeads, deleteLead } from '../../services/leadService';

const formatEnumValue = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function LeadsTable({ searchTerm = '', statusFilter = '' }) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchLeads = async () => {
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
    };

    fetchLeads();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const searchString = [
      lead.firstName,
      lead.lastName,
      lead.email,
      lead.phone,
      lead.businessName,
      formatEnumValue(lead.customerType),
      formatEnumValue(lead.status),
      formatEnumValue(lead.leadType)
    ].join(' ').toLowerCase();
    
    const formattedStatusFilter = statusFilter.toLowerCase().replace(/\s+/g, '_');
    
    const matchesSearch = searchTerm === '' || searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || lead.status === formattedStatusFilter;

    return matchesSearch && matchesStatus;
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
        setLeads(prevLeads => prevLeads.filter(l => 
          (l._id || l.id) !== (selectedLead._id || selectedLead.id)
        ));
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
  }, [selectedLead, isDeleting]);

  // Mobile Card Component
  const LeadCard = ({ lead }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {`${lead.firstName} ${lead.lastName}`}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Phone className="w-4 h-4" />
              <span>{lead.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-3">
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
          <span className="truncate">{lead.email}</span>
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
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Customer Type</p>
          <p className="text-sm text-gray-900">{formatEnumValue(lead.customerType)}</p>
        </div>
      </div>

      {/* Lead Type and Budget */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Lead Type</p>
          <p className="text-sm text-gray-900">{formatEnumValue(lead.leadType)}</p>
        </div>
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
          onClick={() => { setError(null); window.location.reload(); }}
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
                    { key: 'email', label: 'Email', width: 'w-48', hideOnXl: true },
                    { key: 'business', label: 'Business', width: 'w-36', hideOnXl: true },
                    { key: 'leadType', label: 'Lead Type', width: 'w-24 lg:w-32', hideOnLg: true },
                    { key: 'type', label: 'Customer Type', width: 'w-32', hideOnXl: true },
                    { key: 'status', label: 'Status', width: 'w-20 lg:w-24' },
                    { key: 'budget', label: 'Budget', width: 'w-24 lg:w-32' },
                    { key: 'date', label: 'Date', width: 'w-28', hideOnXl: true },
                    { key: 'actions', label: 'Actions', width: 'w-20 lg:w-24' }
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
                {currentLeads.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No leads found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  currentLeads.map((lead) => (
                    <tr
                      key={lead._id || lead.id}
                      className="hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                    >
                      <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm font-medium text-gray-900 w-32 lg:w-40">
                        <div className="truncate">
                          {`${lead.firstName} ${lead.lastName}`}
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                        <div className="truncate">{lead.phone}</div>
                      </td>
                      <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-48">
                        <div className="truncate">{lead.email}</div>
                      </td>
                      <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-36">
                        <div className="truncate">{lead.businessName}</div>
                      </td>
                      <td className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                        <div className="truncate">{formatEnumValue(lead.leadType)}</div>
                      </td>
                      <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-32">
                        <div className="truncate">{formatEnumValue(lead.customerType)}</div>
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
                      <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28">
                        <div className="truncate">
                          {new Date(lead.dateCollected).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 w-20 lg:w-24">
                        <div className="flex items-center justify-center space-x-1 lg:space-x-2">
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
          <div className="flex items-center space-x-2 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 px-2"> 
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
            >
              <ChevronRight className="w-4 h-4" />
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

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ease-out">
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
        </div>
      )}
    </div>
  );
} 