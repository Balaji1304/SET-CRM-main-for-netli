import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, X, Phone, Mail, Building2, Calendar, IndianRupee, User, ShoppingBag, Package, CreditCard, Users, MapPin, Clock, Info, FileText, Tag, AlertCircle, ChevronDown, ChevronUp, Eye, Truck } from 'lucide-react';
import { getAllCustomers } from '../../services/customerService';
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
    
    .mobile-action-compact {
      padding: 4px !important;
      margin: 0 !important;
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomerForView, setSelectedCustomerForView] = useState(null);
  const [customerPurchases, setCustomerPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const itemsPerPage = 10;
  const isSalesHead = user?.role === 'sales_head' || user?.role === 'marketing_coordinator' || user?.role === 'admin';

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

  // Function to handle viewing customer details
  const handleViewCustomer = async (customer) => {
    setSelectedCustomerForView(customer);
    setShowCustomerModal(true);
    setLoadingPurchases(true);
    
    try {
      // Fetch customer purchases
      const response = await fetch(`/api/customer-purchases/customer/${customer._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomerPurchases(data.data || []);
      } else {
        console.error('API response not ok:', response.status);
        setCustomerPurchases([]);
      }
    } catch (error) {
      console.error('Error fetching customer purchases:', error);
      setCustomerPurchases([]);
    } finally {
      setLoadingPurchases(false);
    }
  };

  // Function to close customer modal
  const closeCustomerModal = () => {
    setShowCustomerModal(false);
    setSelectedCustomerForView(null);
    setCustomerPurchases([]);
  };

  // Customer Details Modal Component
  const CustomerDetailsModal = ({ customer, onClose }) => {
    const [activeSection, setActiveSection] = useState('');
    const [pastSection, setPastSection] = useState('');

    const getStatusColor = (status) => {
      const colors = {
        'active': 'bg-green-100 text-green-800 border-green-200',
        'inactive': 'bg-gray-100 text-gray-800 border-gray-200'
      };
      return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    // Separate active and completed purchases
    const activePurchases = customerPurchases.filter(purchase => purchase.status === 'active');
    const pastPurchases = customerPurchases.filter(purchase => purchase.status === 'completed');

    const getPurchaseStatusColor = (status) => {
      const colors = {
        'active': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800'
      };
      return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const PurchaseCard = ({ purchase }) => (
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 space-y-2 sm:space-y-0">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 sm:mb-1">
              <h4 className="text-lg font-semibold text-gray-900">
                {purchase.purchaseID}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPurchaseStatusColor(purchase.status)}`}>
                  {formatEnumValue(purchase.status)}
                </span>
                {purchase.isFullyPaid && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    ✓ Fully Paid
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Order Date: {formatDate(purchase.purchaseDate)}
              </p>
              {purchase.quotationId && (
                <p className="text-xs text-gray-500">
                  Quotation: {purchase.quotationId.quotationNumber}
                </p>
              )}
            </div>
          </div>
          <div className="text-left sm:text-right mt-2 sm:mt-0 sm:ml-4">
            <p className="text-lg font-bold text-gray-900">
              ₹{purchase.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">
              Paid: ₹{purchase.advancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {!purchase.isFullyPaid && (
              <p className="text-sm text-orange-600 font-medium">
                Pending: ₹{purchase.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            {purchase.isFullyPaid && (
              <p className="text-sm text-green-600 font-medium">
                ✓ Payment Complete
              </p>
            )}
          </div>
        </div>

        {/* Purchase Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Payment Progress</span>
            <span className={`text-sm font-medium ${purchase.isFullyPaid ? 'text-green-600' : 'text-gray-600'}`}>
              {purchase.isFullyPaid ? '100% - Complete' : `${Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}% - Partial`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${purchase.isFullyPaid ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${purchase.isFullyPaid ? 100 : Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%` }}
            ></div>
          </div>
          {purchase.isFullyPaid && (
            <p className="text-xs text-green-600 mt-1 font-medium">All payments received</p>
          )}
        </div>

        {/* Service Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-xs">Service Status</p>
              <p className="font-medium text-gray-900 truncate">
                {formatEnumValue(purchase.serviceTaskStatus)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-xs">Payment Method</p>
              <p className="font-medium text-gray-900 truncate">
                {formatEnumValue(purchase.paymentMethod)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:col-span-2 lg:col-span-1">
            <div className={`h-4 w-4 rounded-full flex-shrink-0 ${purchase.isFullyPaid ? 'bg-green-500' : 'bg-orange-500'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-xs">Payment Status</p>
              <p className={`font-medium truncate ${purchase.isFullyPaid ? 'text-green-700' : 'text-orange-700'}`}>
                {purchase.isFullyPaid ? 'Fully Paid' : 'Pending Payment'}
              </p>
            </div>
          </div>
        </div>

        {purchase.installationDate && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-sm">
              <Truck className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Installation Date</p>
                <p className="font-medium text-gray-900">
                  {formatDate(purchase.installationDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Items if available */}
        {purchase.quotationItems && purchase.quotationItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Products</h5>
            <div className="space-y-2">
              {purchase.quotationItems.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 mb-1 sm:mb-0">
                    <span className="text-sm font-medium text-gray-900 block">
                      {item.productId?.name || item.productName || 'Unknown Product'}
                    </span>
                    {(item.productId?.model || item.productModel) && (
                      <span className="text-xs text-gray-500">
                        {item.productId?.model || item.productModel}
                      </span>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-sm text-gray-900 font-medium">
                      {item.quantity} x ₹{item.unitPrice?.toLocaleString('en-IN') || '0'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // Prevent scroll when modal is open
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }, []);

    return createPortal(
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out mobile-modal-content">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#FF7300] to-[#FF8800] px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-6 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-lg md:text-xl font-semibold text-white truncate">Customer Details</h2>
                <p className="text-orange-100 text-xs sm:text-sm hidden sm:block">Complete customer information and purchase history</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors duration-150 touch-target flex-shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="max-h-[calc(95vh-80px)] sm:max-h-[calc(90vh-120px)] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
              {/* Customer Name and Status */}
              <div className="border-b border-gray-100 pb-3 sm:pb-4 md:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border w-fit ${getStatusColor(customer.status)}`}>
                        {formatEnumValue(customer.status)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium">Customer Type: {formatEnumValue(customer.customerType)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">Customer Since: {formatDate(customer.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {/* Total Purchase Value */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="bg-blue-500 p-1.5 sm:p-2 rounded-lg">
                      <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900">Total Purchase Value</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Lifetime spending</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    ₹{customer.purchaseStats?.totalValue?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                  </div>
                </div>

                {/* Total Orders */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="bg-green-500 p-1.5 sm:p-2 rounded-lg">
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900">Total Orders</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Purchase orders</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    {customer.purchaseStats?.totalPurchases || 0}
                  </div>
                </div>

                {/* Active Orders */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="bg-purple-500 p-1.5 sm:p-2 rounded-lg">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900">Active Orders</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Ongoing orders</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    {customer.purchaseStats?.activeCount || 0}
                  </div>
                </div>

                {/* Created By - Show only for sales heads */}
                {isSalesHead && customer.leadId?.createdBy && (
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 sm:p-4 rounded-xl border border-orange-200 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                      <div className="bg-orange-500 p-1.5 sm:p-2 rounded-lg">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900">Created By</h4>
                        <p className="text-xs sm:text-sm text-gray-600">Sales person</p>
                      </div>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900">
                      {customer.leadId.createdBy.name}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Contact Information</h4>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 sm:py-2 border-b border-gray-200 last:border-b-0 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Phone</span>
                      <span className="text-xs sm:text-sm text-gray-900 break-words">{customer.phone || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 sm:py-2 border-b border-gray-200 last:border-b-0 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Email</span>
                      <span className="text-xs sm:text-sm text-gray-900 break-words">{customer.email || 'N/A'}</span>
                    </div>
                    {customer.businessName && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 sm:py-2 space-y-1 sm:space-y-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Business Name</span>
                        <span className="text-xs sm:text-sm text-gray-900 break-words">{customer.businessName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Customer Information</h4>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 sm:py-2 border-b border-gray-200 last:border-b-0 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Customer Type</span>
                      <span className="text-xs sm:text-sm text-gray-900">{formatEnumValue(customer.customerType) || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 sm:py-2 border-b border-gray-200 last:border-b-0 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Status</span>
                      <span className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-full w-fit ${getStatusColor(customer.status)}`}>
                        {formatEnumValue(customer.status) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 sm:py-2 border-b border-gray-200 last:border-b-0 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Customer Since</span>
                      <span className="text-xs sm:text-sm text-gray-900">
                        {formatDate(customer.createdAt)}
                      </span>
                    </div>
                    {customer.address && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start py-1.5 sm:py-2 space-y-1 sm:space-y-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Address</span>
                        <span className="text-xs sm:text-sm text-gray-900 text-left sm:text-right max-w-full sm:max-w-48 break-words" title={customer.address}>
                          {customer.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Purchase Orders Section */}
              <div className="bg-gray-50 rounded-xl border border-gray-200">
                <div 
                  className="flex items-center justify-between p-3 sm:p-4 md:p-5 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => setActiveSection(activeSection === 'open' ? '' : 'open')}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">
                      Active Purchase Orders ({activePurchases.length})
                    </h4>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {activeSection === 'open' ? (
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    )}
                  </div>
                </div>
                
                {activeSection === 'open' && (
                  <div className="px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5">
                    {loadingPurchases ? (
                      <div className="flex items-center justify-center py-6 sm:py-8">
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm sm:text-base text-gray-600">Loading purchases...</span>
                      </div>
                    ) : activePurchases.length > 0 ? (
                      <div className="space-y-3 sm:space-y-4">
                        {activePurchases.map((purchase) => (
                          <PurchaseCard key={purchase._id} purchase={purchase} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-8">
                        <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
                        <p className="text-sm sm:text-base text-gray-500">No active purchase orders found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Past Purchase Orders Section */}
              <div className="bg-gray-50 rounded-xl border border-gray-200">
                <div 
                  className="flex items-center justify-between p-3 sm:p-4 md:p-5 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => setPastSection(pastSection === 'open' ? '' : 'open')}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">
                      Past Purchase Orders ({pastPurchases.length})
                    </h4>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {pastSection === 'open' ? (
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    )}
                  </div>
                </div>
                
                {pastSection === 'open' && (
                  <div className="px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5">
                    {loadingPurchases ? (
                      <div className="flex items-center justify-center py-6 sm:py-8">
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm sm:text-base text-gray-600">Loading purchases...</span>
                      </div>
                    ) : pastPurchases.length > 0 ? (
                      <div className="space-y-3 sm:space-y-4">
                        {pastPurchases.map((purchase) => (
                          <PurchaseCard key={purchase._id} purchase={purchase} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-8">
                        <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
                        <p className="text-sm sm:text-base text-gray-500">No completed purchase orders found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Mobile Card Component
  const CustomerCard = ({ customer }) => {
    const stats = customer.purchaseStats;

    return (
      <div className={`mobile-card-compact mobile-card-container rounded-lg border space-y-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white border-gray-200`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-1 sm:gap-2">
          <div className="flex-1 min-w-0 max-w-[calc(100%-80px)] sm:max-w-[calc(100%-100px)]">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`mobile-header-text text-base sm:text-lg font-semibold cursor-pointer hover:text-[#FF7300] transition-colors duration-150 line-clamp-2 leading-tight text-gray-900`}
                  onClick={() => handleViewCustomer(customer)}
                  title="Click to view details">
                {customer.firstName} {customer.lastName}
              </h3>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
              <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="mobile-truncate">{customer.phone}</span>
            </div>
          </div>
          <div className="mobile-action-buttons flex items-center gap-0.5 sm:gap-1 flex-shrink-0 w-[80px] sm:w-[100px] justify-end">
            <button
              onClick={() => handleViewCustomer(customer)}
              className="mobile-action-compact p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150"
              title="View Details"
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          {customer.email && (
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="mobile-truncate">{customer.email}</span>
            </div>
          )}
          {customer.businessName && (
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="mobile-truncate">{customer.businessName}</span>
            </div>
          )}
        </div>

        {/* Status and Customer Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
              ${customer.status === 'active' ? 'bg-green-100 text-green-800'
              : customer.status === 'inactive' ? 'bg-gray-100 text-gray-800'
              : 'bg-gray-100 text-gray-800'
              }`}>
              {formatEnumValue(customer.status)}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Customer Type</p>
            <p className="text-xs sm:text-sm text-gray-900">{formatEnumValue(customer.customerType)}</p>
          </div>
        </div>

        {/* Purchase Stats - First Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Purchases</p>
            <p className="text-xs sm:text-sm text-gray-900">{stats.totalPurchases} orders</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
            <div className="flex items-center space-x-1 text-xs sm:text-sm font-medium text-gray-900">
              <span className="text-gray-600 font-semibold">₹</span>
              <span className="mobile-truncate">
                {stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Purchase Stats - Second Row */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Active Orders</p>
            <p className="text-xs sm:text-sm text-gray-900">{stats.activeCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-xs sm:text-sm text-gray-900">{stats.fullyPaidCount}</p>
          </div>
        </div>

        {/* Sales Person and Date for Sales Head */}
        {isSalesHead && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created By</p>
              <p className="text-xs sm:text-sm text-gray-900 mobile-truncate" title={customer.leadId && customer.leadId.createdBy ? customer.leadId.createdBy.name : 'Unknown'}>
                {customer.leadId && customer.leadId.createdBy ? customer.leadId.createdBy.name : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Customer Since</p>
              <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="mobile-truncate">{new Date(customer.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Date for non-sales head */}
        {!isSalesHead && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Customer Since</p>
            <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="mobile-truncate">{new Date(customer.createdAt).toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main component conditional returns and rendering
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
    <>
      <style>{customStyles}</style>
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
                    { key: 'type', label: 'Customer Type', width: 'w-24 lg:w-32', hideOnXl: true },
                    { key: 'status', label: 'Status', width: 'w-20 lg:w-24' },
                    { key: 'purchases', label: 'Purchase Stats', width: 'w-24 lg:w-32' },
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
                    <td colSpan={isSalesHead ? 10 : 9} className="px-6 py-12 text-center text-gray-500">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  currentCustomers.map((customer) => {
                    const stats = customer.purchaseStats;
                    
                    return (
                      <tr key={customer._id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm font-medium w-32 lg:w-40">
                          <div className="flex items-center gap-2">
                            <div 
                              className="truncate cursor-pointer hover:text-[#FF7300] transition-colors duration-150 text-gray-900"
                              title="Customer name"
                            >
                              {customer.firstName} {customer.lastName}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                          <div className="truncate">{customer.phone}</div>
                        </td>
                        <td className="hidden 2xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-48">
                          <div className="truncate">
                            {customer.email || 'N/A'}
                          </div>
                        </td>
                        <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-36">
                          <div className="truncate">{customer.businessName || 'N/A'}</div>
                        </td>
                        <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                          <div className="truncate">{formatEnumValue(customer.customerType)}</div>
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 w-20 lg:w-24">
                          <span className={`inline-flex items-center px-1.5 lg:px-2 py-1 rounded-full text-xs font-medium truncate
                            ${customer.status === 'active' ? 'bg-green-100 text-green-800'
                            : customer.status === 'inactive' ? 'bg-gray-100 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {formatEnumValue(customer.status)}
                          </span>
                        </td>
                        <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                          <div className="truncate">
                            ₹{stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                        </td>
                        {isSalesHead && (
                          <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28">
                            <div className="truncate" title={customer.leadId && customer.leadId.createdBy ? customer.leadId.createdBy.name : 'Unknown'}>
                              {customer.leadId && customer.leadId.createdBy ? customer.leadId.createdBy.name : 'N/A'}
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
                              onClick={() => handleViewCustomer(customer)}
                              className="mobile-action-btn text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-all duration-200 ease-in-out border border-transparent hover:border-orange-200"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
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
        <div className="p-2 sm:p-4 space-y-2 sm:space-y-4 w-full">
          {currentCustomers.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm sm:text-base">No customers found matching your criteria.</p>
            </div>
          ) : (
            currentCustomers.map((customer) => (
              <div key={customer._id} className="w-full max-w-full">
                <CustomerCard customer={customer} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="px-2 sm:px-4 lg:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-2 sm:space-y-0">
          <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
            Showing {Math.min(startIndex + 1, filteredCustomers.length)} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} results
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

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-5 right-5 bg-primary text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ease-in-out z-50">
          {successMessage}
        </div>
      )}

      {/* Customer Details Modal */}
      {showCustomerModal && selectedCustomerForView && (
        <CustomerDetailsModal 
          customer={selectedCustomerForView} 
          onClose={closeCustomerModal} 
        />
      )}
      </div>
    </>
  );
}