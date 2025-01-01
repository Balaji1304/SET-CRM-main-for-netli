import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [isDeleting, setIsDeleting] = useState(false);

  const itemsPerPage = 10;

  // Fetch leads from the backend
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await getLeads();
        if (response.success) {
          setLeads(response.data);
        } else {
          setError('Failed to fetch leads');
        }
      } catch (err) {
        setError('An error occurred while fetching leads');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  // Filter leads based on search and filters
  const filteredLeads = leads.filter(lead => {
    // Create a comprehensive search string including all searchable fields
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
    
    // Format filter values to match the data format
    const formattedStatusFilter = statusFilter.toLowerCase().replace(' ', '_');
    const formattedSourceFilter = sourceFilter.toLowerCase().replace(' ', '_');
    
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
      // Get the lead ID, ensuring it's a string
      const leadId = lead._id?.toString() || lead.id?.toString();
      
      if (!leadId) {
        console.error('No valid ID found for lead:', lead);
        return;
      }
      
      // Format the lead data
      const formattedLead = {
        ...lead,
        id: leadId,
        products: Array.isArray(lead.products) ? lead.products : [
          {
            id: Date.now(),
            category: '',
            name: '',
            quantity: '',
            price: ''
          }
        ]
      };

      // Use navigate with the correct path
      navigate(`/dashboard/edit-lead/${leadId}`, {
        state: { lead: formattedLead }
      });
    } catch (error) {
      console.error('Error navigating to edit page:', error);
    }
  };

  const handleDelete = useCallback((lead) => {
    setSelectedLead(lead);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedLead || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await deleteLead(selectedLead._id || selectedLead.id);
      if (response.success) {
        setLeads(prevLeads => prevLeads.filter(lead => 
          (lead._id || lead.id) !== (selectedLead._id || selectedLead.id)
        ));
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        throw new Error(response.message || 'Failed to delete lead');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      setError('Failed to delete lead. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setSelectedLead(null);
    }
  }, [selectedLead, isDeleting]);

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-600">Loading leads...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-red-600">{error}</div>
        </div>
      ) : (
        <>
          <div className="overflow-auto flex-1 relative">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead className="bg-orange-500 border-b border-input sticky top-0 z-10 shadow-sm">
                  <tr>
                    {[
                      'Full Name',
                      'Phone Number',
                      'Email',
                      'Business Name',
                      'Customer Type',
                      'Status',
                      'Source',
                      'Budget',
                      'Created Date',
                      'Actions'
                    ].map((header) => (
                      <th
                        key={header}
                        className={`px-4 py-3 text-left text-sm font-medium text-white ${
                          header === 'Full Name' ? 'min-w-[200px]' : ''
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-input">
                  {currentLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-orange-50/50 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm text-foreground whitespace-normal">
                        {`${lead.firstName} ${lead.lastName}`}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{lead.phone}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{lead.email}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{lead.businessName}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatEnumValue(lead.customerType)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${
                            lead.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : lead.status === 'closed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                          {formatEnumValue(lead.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatEnumValue(lead.source)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        ${lead.products?.reduce((total, product) => 
                          total + (parseFloat(product.quantity) * parseFloat(product.price) || 0), 
                        0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(lead.dateCollected).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(lead)}
                            className="p-1 hover:bg-orange-50 rounded-md transition-colors"
                            title="Edit Lead"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600 hover:text-orange-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead)}
                            className="p-1 hover:bg-orange-50 rounded-md transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4 text-gray-600 hover:text-orange-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-input bg-white sticky left-0 right-0 bottom-0 shadow-sm">
            <div className="flex items-center text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-input rounded-md disabled:opacity-50 hover:bg-orange-50"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-input rounded-md disabled:opacity-50 hover:bg-orange-50"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Success Toast */}
          {showSuccessToast && (
            <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
              Lead deleted successfully
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {isDeleteModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full">
                <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete this lead? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 border border-input rounded-lg text-sm font-medium hover:bg-orange-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 