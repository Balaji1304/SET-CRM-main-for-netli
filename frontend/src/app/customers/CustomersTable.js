import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, X, Phone, Mail, Building2, Calendar, IndianRupee, User, ShoppingBag, Package, CreditCard, Users, MapPin, Clock, Info, FileText, Tag, AlertCircle, ChevronDown, ChevronUp, Eye, Truck } from 'lucide-react';
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomerForView, setSelectedCustomerForView] = useState(null);
  const [customerPurchases, setCustomerPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

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
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-lg font-semibold text-gray-900">
                {purchase.purchaseID}
              </h4>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPurchaseStatusColor(purchase.status)}`}>
                {formatEnumValue(purchase.status)}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Order Date: {formatDate(purchase.purchaseDate)}
            </p>
            {purchase.quotationId && (
              <p className="text-xs text-gray-500">
                Quotation: {purchase.quotationId.quotationNumber}
              </p>
            )}
          </div>
          <div className="text-right">
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
          </div>
        </div>

        {/* Purchase Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Payment Progress</span>
            <span className="text-sm text-gray-600">
              {purchase.isFullyPaid ? '100%' : `${Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${purchase.isFullyPaid ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${purchase.isFullyPaid ? 100 : Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Service Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-500">Service Status</p>
              <p className="font-medium text-gray-900">
                {formatEnumValue(purchase.serviceTaskStatus)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-500">Payment Method</p>
              <p className="font-medium text-gray-900">
                {formatEnumValue(purchase.paymentMethod)}
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
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {item.productId?.name || item.productName || 'Unknown Product'}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {item.quantity} x ₹{item.unitPrice?.toLocaleString('en-IN') || '0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#FF7300] to-[#FF8800] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Customer Details</h2>
                <p className="text-orange-100 text-sm">Complete customer information and purchase history</p>
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
              {/* Customer Name and Status */}
              <div className="border-b border-gray-100 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(customer.status)}`}>
                        {formatEnumValue(customer.status)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4" />
                        <span className="text-sm font-medium">Customer Type: {formatEnumValue(customer.customerType)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Customer Since: {formatDate(customer.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Purchase Value */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                      <IndianRupee className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Total Purchase Value</h4>
                      <p className="text-sm text-gray-600">Lifetime spending</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{customer.purchaseStats?.totalValue?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                  </div>
                </div>

                {/* Total Orders */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Total Orders</h4>
                      <p className="text-sm text-gray-600">Purchase orders</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {customer.purchaseStats?.totalPurchases || 0}
                  </div>
                </div>

                {/* Active Orders */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-purple-500 p-2 rounded-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Active Orders</h4>
                      <p className="text-sm text-gray-600">Ongoing orders</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {customer.purchaseStats?.activeCount || 0}
                  </div>
                </div>

                {/* Created By - Show only for sales heads */}
                {isSalesHead && customer.leadId?.createdBy && (
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
                      {customer.leadId.createdBy.name}
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
                      <span className="text-sm text-gray-900">{customer.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Email</span>
                      <span className="text-sm text-gray-900">{customer.email || 'N/A'}</span>
                    </div>
                    {customer.businessName && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Business Name</span>
                        <span className="text-sm text-gray-900">{customer.businessName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Info className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Customer Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Customer Type</span>
                      <span className="text-sm text-gray-900">{formatEnumValue(customer.customerType) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Status</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(customer.status)}`}>
                        {formatEnumValue(customer.status) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Customer Since</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(customer.createdAt)}
                      </span>
                    </div>
                    {customer.address && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Address</span>
                        <span className="text-sm text-gray-900 text-right max-w-48 truncate" title={customer.address}>
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
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => setActiveSection(activeSection === 'open' ? '' : 'open')}
                >
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      Active Purchase Orders ({activePurchases.length})
                    </h4>
                  </div>
                  {activeSection === 'open' ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                
                {activeSection === 'open' && (
                  <div className="px-5 pb-5">
                    {loadingPurchases ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-600">Loading purchases...</span>
                      </div>
                    ) : activePurchases.length > 0 ? (
                      <div className="space-y-4">
                        {activePurchases.map((purchase) => (
                          <PurchaseCard key={purchase._id} purchase={purchase} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No active purchase orders found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Past Purchase Orders Section */}
              <div className="bg-gray-50 rounded-xl border border-gray-200">
                <div 
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => setPastSection(pastSection === 'open' ? '' : 'open')}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      Past Purchase Orders ({pastPurchases.length})
                    </h4>
                  </div>
                  {pastSection === 'open' ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                
                {pastSection === 'open' && (
                  <div className="px-5 pb-5">
                    {loadingPurchases ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-600">Loading purchases...</span>
                      </div>
                    ) : pastPurchases.length > 0 ? (
                      <div className="space-y-4">
                        {pastPurchases.map((purchase) => (
                          <PurchaseCard key={purchase._id} purchase={purchase} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No completed purchase orders found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
              onClick={() => handleViewCustomer(customer)}
              className="p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150 touch-target"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
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
            <p className="text-sm text-gray-900">{formatEnumValue(customer.customerType)}</p>
          </div>
        </div>

        {/* Purchase Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Purchases</p>
            <p className="text-sm text-gray-900">{stats.totalPurchases} orders</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
            <div className="flex items-center space-x-1 text-sm font-medium text-gray-900">
              <span className="text-gray-600 font-semibold">₹</span>
              <span>
                {stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Purchase Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Active Orders</p>
            <p className="text-sm text-gray-900">{stats.activeCount}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Completed Orders</p>
            <p className="text-sm text-gray-900">{stats.fullyPaidCount}</p>
          </div>
        </div>

        {/* Sales Person and Date */}
        {isSalesHead && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created By</p>
              <p className="text-sm text-gray-900 truncate" title={customer.leadId && customer.leadId.createdBy ? customer.leadId.createdBy.name : 'Unknown'}>
                {customer.leadId && customer.leadId.createdBy ? customer.leadId.createdBy.name : 'Unknown'}
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
                              className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-orange-200"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
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

      {/* Customer Details Modal */}
      {showCustomerModal && selectedCustomerForView && (
        <CustomerDetailsModal 
          customer={selectedCustomerForView} 
          onClose={closeCustomerModal} 
        />
      )}
    </div>
  );
}