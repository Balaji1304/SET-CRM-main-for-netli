import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Loader2, X } from 'lucide-react';
import { getLeads, deleteLead } from '../../services/leadService';

const formatEnumValue = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function LeadsTable({ searchTerm = '', statusFilter = '', sourceFilter = '' }) {
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
      formatEnumValue(lead.source)
    ].join(' ').toLowerCase();
    
    const formattedStatusFilter = statusFilter.toLowerCase().replace(/\s+/g, '_');
    const formattedSourceFilter = sourceFilter.toLowerCase().replace(/\s+/g, '_');
    
    const matchesSearch = searchTerm === '' || searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || lead.status === formattedStatusFilter;
    const matchesSource = sourceFilter === '' || lead.source === formattedSourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
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
          className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="overflow-x-auto flex-1 relative">
        <table className="min-w-full divide-y divide-fourth">
          <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {[
                      'Full Name',
                      'Phone Number',
                      'Email',
                      'Business Name',
                      'Customer Type',
                      'Status',
                      'Source',
                'Budget (Est.)',
                      'Created Date',
                      'Actions'
                    ].map((header) => (
                      <th
                        key={header}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
          <tbody className="bg-tertiary divide-y divide-fourth">
            {currentLeads.length === 0 && !loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-secondary">
                  No leads found matching your criteria.
                </td>
              </tr>
            ) : (
              currentLeads.map((lead) => (
                    <tr
                  key={lead._id || lead.id}
                  className="hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                    >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">
                        {`${lead.firstName} ${lead.lastName}`}
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.businessName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatEnumValue(lead.customerType)}
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${ lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800'
                       : lead.status === 'closed' ? 'bg-green-100 text-green-800'
                       : lead.status === 'active' || lead.status === 'in_progress' ? 'bg-blue-100 text-blue-800'
                       : 'bg-gray-100 text-gray-800'
                          }`}>
                          {formatEnumValue(lead.status)}
                        </span>
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatEnumValue(lead.source)}
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹{lead.products?.reduce((total, product) => 
                      total + ((parseFloat(product.quantity) || 0) * (parseFloat(product.price) || 0)), 
                    0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(lead.dateCollected).toLocaleDateString('en-GB')}
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEdit(lead)}
                        className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors duration-150 ease-in-out"
                            title="Edit Lead"
                          >
                        <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead)}
                        className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors duration-150 ease-in-out"
                            title="Delete Lead"
                          >
                        <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
              ))
            )}
                </tbody>
              </table>
            </div>

      {totalPages > 0 && (
         <div className="px-6 py-3 border-t border-fourth bg-tertiary flex items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm">
          <div className="text-sm text-gray-600">
            Showing {Math.min(startIndex + 1, filteredLeads.length)} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} results
          </div>
          <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              className="p-2 border border-fourth rounded-md text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fourth transition-colors duration-150 ease-in-out"
              >
              <ChevronLeft className="w-4 h-4" />
              </button>
            <span className="text-sm text-gray-600"> 
              Page {currentPage} of {totalPages}
            </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              className="p-2 border border-fourth rounded-md text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fourth transition-colors duration-150 ease-in-out"
              >
              <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
      )}

          {showSuccessToast && (
        <div className="fixed bottom-5 right-5 bg-primary text-tertiary px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ease-in-out z-50">
          {successMessage}
            </div>
          )}

          {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-tertiary p-6 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ease-out">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-secondary">Confirm Delete</h3>
                <button onClick={() => { setIsDeleteModalOpen(false); setError(null); }} className="p-1 rounded-full hover:bg-fourth">
                    <X className="w-5 h-5 text-gray-500"/>
                </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to delete this lead? This action cannot be undone.
                </p>
            {error && <p className="text-sm text-red-600 mb-3 text-center">{error}</p>}
            <div className="flex justify-end space-x-3">
                  <button
                onClick={() => { setIsDeleteModalOpen(false); setError(null); }}
                className="px-4 py-2 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors duration-150 ease-in-out"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                className={`px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]`}
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