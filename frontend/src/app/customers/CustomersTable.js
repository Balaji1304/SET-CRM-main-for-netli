import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, X, Phone, Mail, Building2, Calendar, IndianRupee, User, ShoppingBag, Package, CreditCard, Users, MapPin, Clock, Info } from 'lucide-react';
import { getAllCustomers } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';

const formatEnumValue = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function CustomersTable({ 
  searchTerm = '', 
  sortOrder = 'newest',
  customerTypeFilter = '',
  creatorFilter = '',
  purchaseStatusFilter = ''
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const itemsPerPage = 10;
  const isSalesHead = user?.role === 'sales_head' || user?.role === 'marketing_coordinator';

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllCustomers();
      if (response.success) {
        setCustomers(response.data);
        setError(null);
      } else {
        setError(response.message || 'Failed to fetch customers');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching customers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sort customers based on sortOrder prop
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const dateA = new Date(a.createdAt || '1970-01-01');
      const dateB = new Date(b.createdAt || '1970-01-01');
      
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
  }, [customers, sortOrder]);

  // Initial data fetch
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle location state changes (e.g., returning from other pages with success message)
  useEffect(() => {
    if (location.state?.toastMessage) {
      setSuccessMessage(location.state.toastMessage);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      // Refresh customers data after successful operation
      fetchCustomers();
      
      // Clear the location state to prevent repeated notifications
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, fetchCustomers]);

  const filteredCustomers = sortedCustomers.filter(customer => {
    const matchesSearch = searchTerm === '' || 
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.businessName && customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCustomerType = customerTypeFilter === '' || customer.customerType === customerTypeFilter;

    const matchesCreator = creatorFilter === '' || 
      (customer.leadId && customer.leadId.createdBy && customer.leadId.createdBy._id === creatorFilter);

    const matchesPurchaseStatus = (() => {
      if (purchaseStatusFilter === '') return true;
      
      const stats = customer.purchaseStats;
      switch (purchaseStatusFilter) {
        case 'has_purchases':
          return stats.totalPurchases > 0;
        case 'no_purchases':
          return stats.totalPurchases === 0;
        case 'active_purchases':
          return stats.activeCount > 0;
        case 'completed_purchases':
          return stats.fullyPaidCount > 0;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesCustomerType && matchesCreator && matchesPurchaseStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Mobile Card Component
  const CustomerCard = ({ customer }) => {
    const stats = customer.purchaseStats;

    return (
      <div className="rounded-lg border p-4 space-y-4 shadow-sm hover:shadow-md transition-all duration-200 bg-white border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold cursor-pointer hover:text-[#FF7300] transition-colors duration-150 text-gray-900"
                  title="Customer name">
                {customer.firstName} {customer.lastName}
              </h3>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>{customer.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-3">
            <button
              className="p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150 touch-target"
              title="View Details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          {customer.email && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          {customer.businessName && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span className="truncate">{customer.businessName}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Customer Type</p>
            <p className="text-sm text-gray-900">{formatEnumValue(customer.customerType)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Purchases</p>
            <p className="text-sm text-gray-900">{stats.totalPurchases} orders</p>
          </div>
        </div>

        {/* Purchase Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
            <div className="flex items-center space-x-1 text-sm font-medium text-gray-900">
              <span className="text-gray-600 font-semibold">₹</span>
              <span>
                {stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Active Orders</p>
            <p className="text-sm text-gray-900">{stats.activeCount}</p>
          </div>
        </div>

        {/* Sales Person and Date */}
        {isSalesHead && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created By</p>
              <p className="text-sm text-gray-900 truncate" title={customer.leadId && customer.leadId.createdBy ? `${customer.leadId.createdBy.firstName} ${customer.leadId.createdBy.lastName}` : 'Unknown'}>
                {customer.leadId && customer.leadId.createdBy ? `${customer.leadId.createdBy.firstName} ${customer.leadId.createdBy.lastName}` : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Customer Since</p>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(customer.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Date for non-sales head */}
        {!isSalesHead && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Customer Since</p>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date(customer.createdAt).toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading customers...</span>
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Customers</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
        <button 
          onClick={() => { setError(null); fetchCustomers(); }}
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
                    { key: 'name', label: 'Customer', width: 'w-32 lg:w-40' },
                    { key: 'contact', label: 'Contact Info', width: 'w-48' },
                    { key: 'type', label: 'Type & Business', width: 'w-36', hideOnXl: true },
                    { key: 'purchases', label: 'Purchase Stats', width: 'w-32 lg:w-36' },
                    ...(isSalesHead ? [{ key: 'createdBy', label: 'Created By', width: 'w-28', hideOnXl: true }] : []),
                    { key: 'date', label: 'Customer Since', width: 'w-28', hideOn2Xl: true },
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
                {currentCustomers.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={isSalesHead ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  currentCustomers.map((customer) => {
                    const stats = customer.purchaseStats;
                    
                    return (
                      <tr key={customer._id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm font-medium text-secondary w-32 lg:w-40">
                          <div className="truncate">
                            {customer.firstName} {customer.lastName}
                          </div>
                          {customer.leadId && (
                            <div className="text-xs text-gray-500 truncate">
                              Lead: {customer.leadId.leadNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-48">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm truncate">
                              <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                              {customer.phone}
                            </div>
                            {customer.email && (
                              <div className="flex items-center text-xs text-gray-500 truncate">
                                <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-36">
                          <div className="truncate">
                            {formatEnumValue(customer.customerType)}
                          </div>
                          {customer.businessName && (
                            <div className="text-xs text-gray-500 truncate">
                              {customer.businessName}
                            </div>
                          )}
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-32 lg:w-36">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-blue-600 font-medium">
                                {stats.totalPurchases} orders
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              ₹{stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                          </div>
                        </td>
                        {isSalesHead && (
                          <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28">
                            <div className="truncate" title={customer.leadId && customer.leadId.createdBy ? `${customer.leadId.createdBy.firstName} ${customer.leadId.createdBy.lastName}` : 'Unknown'}>
                              {customer.leadId && customer.leadId.createdBy ? `${customer.leadId.createdBy.firstName} ${customer.leadId.createdBy.lastName}` : 'N/A'}
                            </div>
                          </td>
                        )}
                        <td className="hidden 2xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28">
                          <div className="truncate">
                            {new Date(customer.createdAt).toLocaleDateString('en-GB')}
                          </div>
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 w-24 lg:w-32">
                          <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                            <button
                              className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-orange-200"
                              title="View Details"
                            >
                              <Info className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {currentCustomers.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No customers found matching your criteria.</p>
            </div>
          ) : (
            currentCustomers.map((customer) => (
              <CustomerCard key={customer._id} customer={customer} />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0">
          <div className="text-sm text-gray-600 order-2 sm:order-1">
            Showing {Math.min(startIndex + 1, filteredCustomers.length)} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} results
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
    </div>
  );
}
