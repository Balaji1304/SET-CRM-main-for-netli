import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertCircle, ChevronDown, ExternalLink, ShoppingBag, FileText, Loader2, AlertTriangle, Search, User, Filter, Calendar, RotateCcw } from 'lucide-react';
import { getCustomerPurchasesByUser } from '../../services/purchaseOrderService';
import { useAuth } from '../../context/AuthContext';

export default function MyProductsPage() {
  const [quotations, setQuotations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchProducts();
  }, []);

  // Function to reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setPaymentStatusFilter('');
    setSortOrder('newest');
    setShowFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || paymentStatusFilter || sortOrder !== 'newest';

  // Count active filters (excluding sort order and search term for display)
  const activeFilterCount = [paymentStatusFilter].filter(Boolean).length;

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching customer purchases with token');

      const response = await getCustomerPurchasesByUser();

      console.log('Response received from service');

      if (response.success) {
        console.log('Received purchases:', response.data);
        
        // Group purchases by quotation number or purchase ID
        const quotationGroups = {};
        response.data.forEach(purchase => {
          const quotationNumber = purchase.quotationId?.quotationNumber || purchase.purchaseID;
          if (!quotationGroups[quotationNumber]) {
            quotationGroups[quotationNumber] = {
              quotationNumber: purchase.quotationId?.quotationNumber || '',
              purchaseId: purchase._id,
              purchaseID: purchase.purchaseID,
              purchaseDate: purchase.purchaseDate,
              quotationItems: purchase.quotationItems || [],
              totalAmount: purchase.totalAmount || 0,
              paymentStatus: purchase.isFullyPaid ? 'FULLY_PAID' : 'ADVANCE_PAID',
              advancePaymentAmount: purchase.advancePaid || 0,
              advancePaymentPercentage: purchase.quotationId?.advancePaymentPercentage || 20,
              remainingAmount: purchase.remainingAmount || 0,
              // Add customer details for admin
              customer: isAdmin && purchase.customerId ? {
                firstName: purchase.customerId.firstName,
                lastName: purchase.customerId.lastName,
                email: purchase.customerId.email,
                phone: purchase.customerId.phone,
                businessName: purchase.customerId.businessName
              } : null
            };
          }
        });
        
        setQuotations(quotationGroups);
      } else {
        throw new Error(response.message || 'Failed to fetch purchases');
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // useMemo for derived state based on search term and filters
  const filteredOrders = useMemo(() => {
    if (Object.keys(quotations).length === 0) return {};

    const filtered = {};

    Object.entries(quotations).forEach(([key, orderData]) => {
      // Apply search filter
      let matchesSearch = true;
      if (searchTerm.trim()) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        matchesSearch = 
          orderData.quotationNumber?.toLowerCase().includes(lowerSearchTerm) ||
          orderData.purchaseID?.toLowerCase().includes(lowerSearchTerm) ||
          // Search in customer details for admin
          (isAdmin && orderData.customer && (
            orderData.customer.firstName?.toLowerCase().includes(lowerSearchTerm) ||
            orderData.customer.lastName?.toLowerCase().includes(lowerSearchTerm) ||
            orderData.customer.email?.toLowerCase().includes(lowerSearchTerm) ||
            orderData.customer.phone?.toLowerCase().includes(lowerSearchTerm) ||
            orderData.customer.businessName?.toLowerCase().includes(lowerSearchTerm)
          )) ||
          // Search in product-level fields within this order
          orderData.quotationItems.some(item => {
            const product = item.productId || item.product;
            return product && (
              product.name?.toLowerCase().includes(lowerSearchTerm) ||
              product.description?.toLowerCase().includes(lowerSearchTerm) ||
              product.category?.toLowerCase().includes(lowerSearchTerm)
            );
          });
      }

      // Apply payment status filter
      let matchesPaymentStatus = true;
      if (paymentStatusFilter) {
        if (paymentStatusFilter === 'fully_paid') {
          matchesPaymentStatus = orderData.paymentStatus === 'FULLY_PAID';
        } else if (paymentStatusFilter === 'advance_paid') {
          matchesPaymentStatus = orderData.paymentStatus === 'ADVANCE_PAID';
        }
      }

      // Include if matches all filters
      if (matchesSearch && matchesPaymentStatus) {
        filtered[key] = orderData;
      }
    });
    return filtered;
  }, [quotations, searchTerm, paymentStatusFilter, isAdmin]);

  // useMemo for sorting orders by purchase date
  const sortedOrders = useMemo(() => {
    return Object.values(filteredOrders).sort((a, b) => {
      // Convert purchase dates to Date objects for comparison
      const dateA = new Date(a.purchaseDate);
      const dateB = new Date(b.purchaseDate);
      
      // Sort based on sortOrder state
      if (sortOrder === 'oldest') {
        return dateA - dateB; // Ascending order (oldest first)
      } else {
        return dateB - dateA; // Descending order (newest first)
      }
    });
  }, [filteredOrders, sortOrder]);

  const navigateToPayment = (quotationNumber) => {
    // Find the quotation in our data
    const quotation = quotations[quotationNumber];
    if (!quotation) {
      console.error('Cannot navigate to payment: Invalid quotation data');
      return;
    }
    
    // Get the purchase ID directly from the quotation object
    const purchaseId = quotation.purchaseId;
    if (!purchaseId) {
      console.error('Cannot navigate to payment: Purchase ID not found');
      return;
    }
    
    // Navigate to the payment page with the purchase ID
    window.location.href = `/dashboard/payments/remaining?purchase=${purchaseId}`;
  };

  const viewProformaInvoice = (customerPurchaseId) => {
    // Navigate to the proforma invoice page using customerPurchaseId
    // Ensure this ID is the MongoDB ObjectId for CustomerPurchase
    window.location.href = `/invoice/${customerPurchaseId}`;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-6 bg-tertiary">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading your products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-6 bg-tertiary text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Products</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - Page Title */}
      <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">
              {isAdmin ? 'All Customer Orders' : 'My Orders'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin ? 'View and manage all customer orders' : 'View and manage your orders'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <User className="w-4 h-4" />
              <span>Admin View</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Contains filters and orders */}
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Filter and Search Bar */}
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
                  placeholder={isAdmin ? "Search by Order #, Customer, Product..." : "Search by Order #, Product..."}
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
            </div>

            {/* Filters Section - Collapsible */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-3 space-y-3">
                {/* Filter Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {/* Sort Order */}
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="pl-6 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Payment Status Filter */}
                  <div className="relative">
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Payments</option>
                      <option value="advance_paid">Advance Paid</option>
                      <option value="fully_paid">Fully Paid</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders Content Area */}
        <div className="flex-1 space-y-6 p-4 md:p-6 overflow-y-auto">
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-tertiary rounded-lg border border-fourth shadow-sm text-center">
            <ShoppingBag className="h-16 w-16 mb-4 text-primary" />
            <p className="text-xl font-medium text-secondary mb-2">
              {hasActiveFilters ? 'No orders match your filters.' : (isAdmin ? 'No customer orders found' : 'No orders found')}
            </p>
            <p className="text-gray-600">
              {hasActiveFilters ? 'Try adjusting your search terms or filters.' : (isAdmin ? 'Customer orders will appear here when available.' : 'Your purchased products will appear here.')}
            </p>
          </div>
        ) : (
          sortedOrders.map((quotation) => (
            <div 
              key={quotation.quotationNumber} 
              className={`bg-tertiary rounded-lg border border-fourth shadow-sm overflow-hidden ${
                quotation.paymentStatus === 'FULLY_PAID' ? 'border-l-4 border-green-500' : 'border-l-4 border-orange-500'
              }`}
            >
              {/* Customer Info - Admin Only */}
              {isAdmin && quotation.customer && (
                <div className="bg-blue-50 border-b border-blue-100 p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="font-semibold text-blue-900 text-sm">Customer Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                    <div className="flex flex-wrap items-center">
                      <span className="text-blue-700 mr-1">Name:</span>
                      <span className="text-blue-900 font-medium">
                        {quotation.customer.firstName} {quotation.customer.lastName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center">
                      <span className="text-blue-700 mr-1">Email:</span>
                      <span className="text-blue-900 truncate">{quotation.customer.email}</span>
                    </div>
                    {quotation.customer.phone && (
                      <div className="flex flex-wrap items-center">
                        <span className="text-blue-700 mr-1">Phone:</span>
                        <span className="text-blue-900">{quotation.customer.phone}</span>
                      </div>
                    )}
                    {quotation.customer.businessName && (
                      <div className="flex flex-wrap items-center">
                        <span className="text-blue-700 mr-1">Business:</span>
                        <span className="text-blue-900 truncate">{quotation.customer.businessName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order header */}
              <div 
                className={`p-4 border-b border-fourth grid grid-cols-1 md:grid-cols-3 gap-4 ${
                  quotation.paymentStatus === 'FULLY_PAID' ? 'bg-green-50' : 'bg-orange-50'
                }`}
              >
                <div>
                  <p className="text-xs text-gray-500 uppercase">Order Placed</p>
                  <p className="font-medium text-secondary">{formatDate(quotation.purchaseDate)}</p>
                </div>
                <div>
                  {quotation.paymentStatus !== 'FULLY_PAID' && (
                    <>
                      <p className="text-xs text-gray-500 uppercase">Remaining Amount</p>
                      <p className="font-medium text-orange-600">{formatCurrency(quotation.remainingAmount)}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                  <div className='mb-2 md:mb-0'>
                    <p className="text-xs text-gray-500 uppercase">Order #</p>
                    <p className="font-medium text-secondary">{quotation.purchaseID || quotation.quotationNumber}</p>
                    {quotation.purchaseID && quotation.quotationNumber && quotation.purchaseID !== quotation.quotationNumber && (
                      <p className="text-xs text-gray-400">Quotation: {quotation.quotationNumber}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span 
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        quotation.paymentStatus === 'FULLY_PAID' 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-orange-100 text-orange-700 border border-orange-300'
                      }`}
                    >
                      {quotation.paymentStatus === 'FULLY_PAID' ? 'Fully Paid' : 'Advance Paid'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Payment progress indicator - at quotation level */}
              {quotation.paymentStatus !== 'FULLY_PAID' && (
              <div className="px-4 pt-4 pb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-secondary">Payment Progress</span>
                  <span className="text-sm text-gray-600">
                      {Math.round((quotation.advancePaymentAmount / quotation.totalAmount) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-fourth rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full"
                    style={{ 
                        width: `${Math.round((quotation.advancePaymentAmount / quotation.totalAmount) * 100)}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1 mb-3">
                  <span className='font-medium text-secondary'>{formatCurrency(quotation.advancePaymentAmount)} paid</span>
                  <span className='text-secondary'>Total: {formatCurrency(quotation.totalAmount)}</span>
                </div>
              </div>
              )}

              {/* Products list */}
              <div className="px-4 pb-4">
                <h3 className="text-lg font-semibold text-secondary my-4">Products in this Order</h3>
                <div className="space-y-4">
                  {quotation.quotationItems.map((item, index) => {
                    const productObj = item.productId || item.product;

                    if (!productObj) {
                      console.warn('Product object missing for item:', item);
                      return <div key={`missing-${index}`} className='text-sm text-red-500'>Product information unavailable.</div>;
                    }

                    // Handle different image URL structures
                    const imageUrl = productObj.imageUrl || (productObj.imageUrls && productObj.imageUrls[0]);
                    
                    return (
                    <div key={productObj._id || index} className="border-b border-fourth pb-4 last:border-b-0 last:pb-0">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        {/* Product image */}
                        <div className="w-full md:w-24 h-24 flex-shrink-0">
                            {imageUrl ? ( 
                  <img
                                src={imageUrl} 
                                alt={productObj.name || 'Product'}
                                className="w-full h-full object-cover rounded-md border border-fourth"
                  />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-md border border-fourth text-gray-400">
                              <Package className="h-10 w-10" />
                            </div>
                          )}
                        </div>
                        
                        {/* Product details */}
                        <div className="flex-1">
                            <h4 className="text-base font-semibold text-secondary">{productObj.name}</h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{productObj.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                            <div>
                              <span className="text-gray-500">Category: </span>
                                <span className="font-medium text-secondary">{productObj.category}</span>
                    </div>
                            <div>
                              <span className="text-gray-500">Qty: </span>
                              <span className="font-medium text-secondary">{item.quantity}</span>
                    </div>
                            <div>
                              <span className="text-gray-500">Unit Price: </span>
                              <span className="font-medium text-secondary">{formatCurrency(item.unitPrice)}</span>
                            </div>
                            {item.discount > 0 && (
                                <div>
                                    <span className="text-gray-500">Discount: </span>
                                    <span className="font-medium text-secondary">{item.discount}%</span>
                                </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="text-right md:text-base text-lg font-semibold text-primary pt-2 md:pt-0">
                            {formatCurrency(item.total || (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)))}
                          </div>
                        </div>
                    </div>
                    );
                  })}
                    </div>
                  </div>
              
              {/* Order footer */}
              <div className="bg-gray-50 p-4 border-t border-fourth flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className='text-center sm:text-left'>
                  <p className="text-sm font-medium text-secondary">Order Total: <span className="text-lg text-primary">{formatCurrency(quotation.totalAmount)}</span></p>
                  <p className="text-xs text-gray-600">
                    Advance Paid: <span className="font-medium text-secondary">{formatCurrency(quotation.advancePaymentAmount)}</span>
                    {quotation.paymentStatus !== 'FULLY_PAID' && quotation.remainingAmount > 0 && (
                         <span className='ml-2 text-orange-600'>(Remaining: {formatCurrency(quotation.remainingAmount)})</span>
                    )}
                    </p>
                </div>
                
                <div className="flex gap-3 flex-wrap items-center">
                {isAdmin ? (
                  // Admin View - Payment Status Indicator + Invoice Button (if paid)
                  <>
                    {/* Payment Status Indicator - Always shown for admin */}
                    {quotation.paymentStatus === 'FULLY_PAID' ? (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Payment Complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-700 bg-orange-50 px-3 py-2 rounded-md border border-orange-200">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium">Payment Pending</span>
                      </div>
                    )}
                    
                    {/* Invoice Button - Only shown for admin when payment is complete */}
                    {quotation.paymentStatus === 'FULLY_PAID' && (
                      <button 
                        onClick={() => viewProformaInvoice(quotation.purchaseId)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto justify-center"
                      >
                        <FileText className="h-4 w-4" />
                        View Proforma Invoice
                      </button>
                    )}
                  </>
                ) : (
                  // Customer View - Action Buttons
                  <>
                    {quotation.paymentStatus === 'FULLY_PAID' ? (
                      <button 
                        onClick={() => viewProformaInvoice(quotation.purchaseId)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto justify-center"
                      >
                        <FileText className="h-4 w-4" />
                        View Proforma Invoice
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigateToPayment(quotation.quotationNumber)}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-tertiary rounded-md flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto justify-center"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Complete Payment
                      </button>
                    )}
                  </>
                )}
                </div>
              </div>
          </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
} 