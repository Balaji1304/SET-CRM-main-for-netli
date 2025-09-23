import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, ExternalLink, FileText, Clock, ArrowRight, Loader2, AlertTriangle, ShoppingBag, IndianRupee, Calendar, User, ChevronDown, Search } from 'lucide-react';
import { getMyPurchases, getPaymentHistory } from '../../services/customerService';
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
  
  /* Touch target improvements for mobile */
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
  
  /* Extra small screen optimizations */
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
  
  /* Ultra small screens */
  @media (max-width: 320px) {
    .mobile-card-compact {
      padding: 6px;
      margin-bottom: 6px;
    }
    
    .mobile-header-text {
      font-size: 13px !important;
      line-height: 1.3 !important;
    }
  }
`;

// Mobile Card Component for Pending Payments
const PendingPaymentCard = ({ purchase, onPayNow, isAdmin }) => (
  <div className="mobile-card-compact mobile-card-container bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-200">
    {/* Customer Info - Admin Only */}
    {isAdmin && (purchase.customer || purchase.customerId) && (
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 -mx-1">
        <div className="flex items-center space-x-2 mb-2">
          <User className="h-3 w-3 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-blue-900 text-xs">Customer</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700">Name:</span>
            <span className="text-xs font-medium text-blue-900 truncate ml-2">
              {(purchase.customer?.firstName || purchase.customerId?.firstName) || 'N/A'} {(purchase.customer?.lastName || purchase.customerId?.lastName) || ''}
            </span>
          </div>
          {(purchase.customer?.phone || purchase.customerId?.phone) && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700">Phone:</span>
              <span className="text-xs text-blue-800 truncate ml-2">{purchase.customer?.phone || purchase.customerId?.phone}</span>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Header */}
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <h3 className="mobile-header-text font-semibold text-gray-900 mb-1 line-clamp-1">
          Order #{purchase.purchaseID || purchase.quotationId?.quotationNumber || 'N/A'}
        </h3>
        <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="mobile-truncate">{purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString('en-GB') : 'N/A'}</span>
        </div>
      </div>
    </div>

    {/* Amount Details */}
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Amount</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 mobile-truncate">
            {purchase.totalAmount !== undefined ? `₹${purchase.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Remaining</p>
          <p className="text-sm sm:text-base font-bold text-primary mobile-truncate">
            {purchase.remainingAmount !== undefined ? `₹${purchase.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
          </p>
        </div>
      </div>
    </div>

    {/* Progress Bar */}
    {(purchase.totalAmount && purchase.totalAmount > 0) && (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">Payment Progress</span>
          <span className="text-xs font-medium text-gray-500">
            {Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%
          </span>
        </div>
        <div className="w-full bg-fourth rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%` }}
          ></div>
        </div>
      </div>
    )}

  {/* Action Button - hidden for admin */}
  {!isAdmin && (
    <div className="pt-2 border-t border-gray-100">
      <button
        onClick={() => onPayNow(purchase._id)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity touch-target"
      >
        <IndianRupee className="w-4 h-4" />
        Pay Now
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )}
  </div>
);

// Mobile Card Component for Payment History
const PaymentHistoryCard = ({ payment, onViewProformaInvoice, isAdmin }) => {
  const getStatusBadge = () => {
    if (!payment.isFullyPaid) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300">Pending Balance</span>;
    } else {
      const wasThisTheAdvancePayment = 
        typeof payment._purchaseAdvancePaid === 'number' &&
        payment.amountPaid === payment._purchaseAdvancePaid &&
        payment._purchaseAdvancePaid > 0 &&
        typeof payment._purchaseTotalAmount === 'number' &&
        payment._purchaseAdvancePaid < payment._purchaseTotalAmount;

      if (wasThisTheAdvancePayment) {
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-300">Advance Cleared</span>;
      } else {
        if (payment.customerPurchaseId) {
          return (
            <button
              onClick={() => onViewProformaInvoice(payment.customerPurchaseId)}
              className="text-primary hover:text-primary/80 hover:underline flex items-center gap-1.5 text-xs transition-colors touch-target"
            >
              <FileText size={14} /> View Proforma Invoice
            </button>
          );
        } else {
          return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-300">Proforma Invoice N/A</span>; 
        }
      }
    }
  };

  return (
    <div className="mobile-card-compact mobile-card-container bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Customer Info - Admin Only */}
      {isAdmin && payment.customer && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 -mx-1">
          <div className="flex items-center space-x-2 mb-2">
            <User className="h-3 w-3 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-blue-900 text-xs">Customer</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700">Name:</span>
              <span className="text-xs font-medium text-blue-900 truncate ml-2">
                {payment.customer.firstName} {payment.customer.lastName}
              </span>
            </div>
            {payment.customer.phone && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700">Phone:</span>
                <span className="text-xs text-blue-800 truncate ml-2">{payment.customer.phone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="mobile-header-text font-semibold text-gray-900 mb-1 line-clamp-1">
            {payment.purchaseID || payment.quotationNumber || 'N/A'}
          </h3>
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="mobile-truncate">
              {payment.paidAt || payment.paymentDate ? new Date(payment.paidAt || payment.paymentDate).toLocaleDateString('en-GB') : 'N/A'}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <p className="text-sm sm:text-base font-bold text-gray-900">
            {payment.amountPaid !== undefined ? `₹${payment.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
          </p>
        </div>
      </div>

      {/* Payment Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Method</p>
          <p className="text-xs sm:text-sm text-gray-900 mobile-truncate capitalize">
            {payment.paymentMethod?.replace('_', ' ') || 'N/A'}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Transaction ID</p>
          <p className="text-xs sm:text-sm text-gray-500 mobile-truncate font-mono">
            {payment.transactionId || 'N/A'}
          </p>
        </div>
      </div>

      {/* Status/Action */}
      <div className="pt-2 border-t border-gray-100 flex justify-center">
        {getStatusBadge()}
      </div>
    </div>
  );
};

export default function PaymentsPage() {
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPending, setShowPending] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [pendingSearch, setPendingSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please login.');
        setLoading(false);
        return;
      }

      const [purchasesResponse, paymentsResponse] = await Promise.all([
        getMyPurchases(),
        getPaymentHistory()
      ]);

      if (purchasesResponse.success && paymentsResponse.success) {
        const allPurchases = purchasesResponse.data;
        const pendingPurchases = allPurchases.filter(p => !p.isFullyPaid);
        setPurchases(pendingPurchases);

        const purchasesMap = new Map(allPurchases.map(p => [p._id, p]));

        const enhancedPayments = paymentsResponse.data.map(payment => {
          const purchaseDetails = purchasesMap.get(payment.customerPurchaseId);
          return {
            ...payment,
            purchaseDate: purchaseDetails?.purchaseDate,
            isFullyPaid: purchaseDetails?.isFullyPaid || false,
            _purchaseTotalAmount: purchaseDetails?.totalAmount,
            _purchaseAdvancePaid: purchaseDetails?.advancePaid,
          };
        });
        
        setPayments(enhancedPayments);
      } else {
        let errorMessage = 'Failed to fetch payment data.';
        if (!purchasesResponse.success) {
          errorMessage += ` Purchases: ${purchasesResponse.message || 'Unknown error'}`;
        }
        if (!paymentsResponse.success) {
          errorMessage += ` Payments: ${paymentsResponse.message || 'Unknown error'}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = (purchaseId) => {
    navigate(`/dashboard/payments/remaining?purchase=${purchaseId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString || new Date(dateString).toString() === 'Invalid Date') {
      return 'N/A';
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] bg-tertiary">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading payment information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] bg-tertiary text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Payments</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
        <button 
          onClick={fetchPaymentData} 
          className="mt-4 px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          Try Again
        </button>
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">
                {isAdmin ? 'All Customer Payments & Billing' : 'Payment & Billing'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isAdmin ? 'Monitor and manage all customer payment activities' : 'Manage your payments and billing information'}
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

        {/* Main Content Area - Contains pending payments and payment history */}
        <div className="space-y-6 sm:space-y-8">
          {/* Pending Payments Section */}
          <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
            {/* Section Header */}
            <div className="p-4 md:p-6 border-b border-fourth">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-semibold text-secondary">
                  {isAdmin ? 'All Customer Pending Payments' : 'Pending Payments'}
                </h3>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  {showPending && (
                    <div className="relative min-w-0 flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder={isAdmin ? 'Search order, customer...' : 'Search order...'}
                        value={pendingSearch}
                        onChange={(e) => setPendingSearch(e.target.value)}
                        className="pl-9 pr-3 py-2 w-full sm:w-56 md:w-64 border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary text-sm text-secondary placeholder-gray-400"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPending(!showPending)}
                    className="flex-shrink-0 self-start sm:self-auto"
                    aria-expanded={showPending}
                    aria-controls="pending-section"
                  >
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${showPending ? '' : '-rotate-90'}`} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            {showPending && (
            <div id="pending-section" className="flex-1 overflow-hidden">
              {purchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-secondary p-4">
                  <Clock className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary" />
                  <p className="text-lg sm:text-xl font-medium text-secondary mb-2">No Pending Payments</p>
                  <p className="text-sm sm:text-base text-gray-600">All your dues are cleared. Great job!</p>
                </div>
              ) : (
                <>
                  {/* Desktop/Tablet View */}
                  <div className="hidden md:block p-4 md:p-6">
                    <div className="space-y-4 sm:space-y-6">
                      {purchases.filter((purchase) => {
                        if (!pendingSearch.trim()) return true;
                        const q = pendingSearch.toLowerCase();
                        const id = (purchase.purchaseID || purchase.quotationId?.quotationNumber || '').toLowerCase();
                        const name = `${purchase.customer?.firstName || purchase.customerId?.firstName || ''} ${purchase.customer?.lastName || purchase.customerId?.lastName || ''}`.toLowerCase();
                        const phone = (purchase.customer?.phone || purchase.customerId?.phone || '').toLowerCase();
                        return id.includes(q) || name.includes(q) || phone.includes(q);
                      }).map((purchase) => (
                        <div
                          key={purchase._id}
                          className="border border-fourth rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 ease-in-out bg-white"
                        > 
                          {/* Customer Info - Admin Only */}
                          {isAdmin && (purchase.customer || purchase.customerId) && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span className="font-semibold text-blue-900 text-sm">Customer Information</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-blue-700">Name: </span>
                                  <span className="text-blue-900 font-medium">
                                    {(purchase.customer?.firstName || purchase.customerId?.firstName) || 'N/A'} {(purchase.customer?.lastName || purchase.customerId?.lastName) || ''}
                                  </span>
                                </div>
                                {(purchase.customer?.phone || purchase.customerId?.phone) && (
                                  <div>
                                    <span className="text-blue-700">Phone: </span>
                                    <span className="text-blue-800">{purchase.customer?.phone || purchase.customerId?.phone}</span>
                                  </div>
                                )}
                                {(purchase.customer?.email || purchase.customerId?.email) && (
                                  <div>
                                    <span className="text-blue-700">Email: </span>
                                    <span className="text-blue-800 truncate">{purchase.customer?.email || purchase.customerId?.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base md:text-lg text-secondary line-clamp-1">Order #{purchase.purchaseID || purchase.quotationId?.quotationNumber || 'N/A'}</h4>
                              <p className="text-xs md:text-sm text-gray-500 mt-1">
                                Purchase Date: {formatDate(purchase.purchaseDate)}
                              </p>
                              <div className="mt-2 md:mt-3 grid grid-cols-2 gap-x-4 md:gap-x-6 gap-y-1 text-xs md:text-sm">
                                <p className="text-gray-500 truncate">Total Amount:</p>
                                <p className="font-medium text-secondary truncate">{formatCurrency(purchase.totalAmount)}</p>
                                
                                <p className="text-gray-500 truncate">Advance Paid:</p>
                                <p className="font-medium text-secondary truncate">{formatCurrency(purchase.advancePaid)}</p>
                                
                                <p className="text-gray-500 truncate">Remaining:</p>
                                <p className="font-medium text-primary truncate">{formatCurrency(purchase.remainingAmount)}</p>
                              </div>
                            </div>
                            {!isAdmin && (
                              <button
                                onClick={() => handleMakePayment(purchase._id)}
                                className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-primary text-tertiary rounded-md text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto justify-center touch-target"
                              >
                                Pay Now
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
                          {(purchase.totalAmount && purchase.totalAmount > 0) && (
                          <div className="mt-3 md:mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-gray-500">Payment Progress</span>
                                <span className="text-xs font-medium text-gray-500">
                                {Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%
                              </span>
                            </div>
                              <div className="w-full bg-fourth rounded-full h-2 md:h-2.5">
                              <div 
                                  className="bg-primary h-2 md:h-2.5 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden flex-1 overflow-y-auto">
                    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                      {purchases.filter((purchase) => {
                        if (!pendingSearch.trim()) return true;
                        const q = pendingSearch.toLowerCase();
                        const id = (purchase.purchaseID || purchase.quotationId?.quotationNumber || '').toLowerCase();
                        const name = `${purchase.customer?.firstName || purchase.customerId?.firstName || ''} ${purchase.customer?.lastName || purchase.customerId?.lastName || ''}`.toLowerCase();
                        const phone = (purchase.customer?.phone || purchase.customerId?.phone || '').toLowerCase();
                        return id.includes(q) || name.includes(q) || phone.includes(q);
                      }).map((purchase) => (
                        <PendingPaymentCard key={purchase._id} purchase={purchase} onPayNow={handleMakePayment} isAdmin={isAdmin} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            )}
          </div>

          {/* Payment History Section */}
          <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
            {/* Section Header */}
            <div className="p-4 md:p-6 border-b border-fourth">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-semibold text-secondary">
                  {isAdmin ? 'All Customer Payment History' : 'Payment History'}
                </h3>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  {showHistory && (
                    <div className="relative min-w-0 flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder={isAdmin ? 'Search customer, purchase...' : 'Search purchase...'}
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="pl-9 pr-3 py-2 w-full sm:w-56 md:w-64 border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary text-sm text-secondary placeholder-gray-400"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex-shrink-0 self-start sm:self-auto"
                    aria-expanded={showHistory}
                    aria-controls="history-section"
                  >
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${showHistory ? '' : '-rotate-90'}`} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            {showHistory && (
            <div id="history-section" className="flex-1 overflow-hidden">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-secondary p-4">
                  <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary" />
                  <p className="text-lg sm:text-xl font-medium text-secondary mb-2">No Payment History</p>
                  <p className="text-sm sm:text-base text-gray-600">Your past transactions will appear here.</p>
                </div>
              ) : (
                <>
                  {/* Desktop/Tablet Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <div className="p-4 md:p-6">
                      <div className="overflow-x-auto rounded-md border border-fourth">
                        <table className="min-w-full divide-y divide-fourth">
                          <thead className="bg-gray-50">
                            <tr>
                              {isAdmin && (
                                <>
                                  <th className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 lg:w-40">Customer Name</th>
                                  <th className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Phone</th>
                                </>
                              )}
                              <th className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 lg:w-36">Purchase ID</th>
                              <th className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Quotation #</th>
                              <th className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Payment Date</th>
                              {/* Purchase Date removed on desktop to save space */}
                              <th className="hidden md:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 lg:w-28">Amount</th>
                              <th className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Method</th>
                              <th className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Transaction ID</th>
                              <th className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Proforma Invoice</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-fourth">
                            {payments.filter((payment) => {
                              if (!historySearch.trim()) return true;
                              const q = historySearch.toLowerCase();
                              const purchaseId = (payment.purchaseID || '').toLowerCase();
                              const quotation = (payment.quotationNumber || '').toLowerCase();
                              const name = `${payment.customer?.firstName || ''} ${payment.customer?.lastName || ''}`.toLowerCase();
                              const phone = (payment.customer?.phone || '').toLowerCase();
                              return purchaseId.includes(q) || quotation.includes(q) || name.includes(q) || phone.includes(q);
                            }).map((payment) => (
                              <tr key={payment._id} className="hover:bg-gray-50 transition-colors duration-150">
                                {isAdmin && (
                                  <>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      <div className="truncate max-w-32">
                                        {payment.customer ? 
                                          `${payment.customer.firstName} ${payment.customer.lastName}` : 
                                          'N/A'
                                        }
                                      </div>
                                    </td>
                                    <td className="hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      <div className="truncate max-w-32">{payment.customer?.phone || 'N/A'}</div>
                                    </td>
                                  </>
                                )}
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <div className="truncate max-w-32">{payment.purchaseID || 'N/A'}</div>
                                </td>
                                <td className="hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <div className="truncate max-w-32">{payment.quotationNumber || 'N/A'}</div>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {formatDate(payment.paidAt || payment.paymentDate)}
                                </td>
                                {/* Purchase Date cell removed on desktop */}
                                <td className="hidden md:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatCurrency(payment.amountPaid)}</td>
                                <td className="hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <span className="capitalize truncate max-w-24 inline-block">{payment.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                                </td>
                                <td className="hidden xl:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                  <div className="truncate max-w-32">{payment.transactionId || 'N/A'}</div>
                                </td>
                                <td className="hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                                  {(() => {
                                    if (!payment.isFullyPaid) {
                                      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300">Pending Balance</span>;
                                    } else {
                                      const wasThisTheAdvancePayment = 
                                        typeof payment._purchaseAdvancePaid === 'number' &&
                                        payment.amountPaid === payment._purchaseAdvancePaid &&
                                        payment._purchaseAdvancePaid > 0 &&
                                        typeof payment._purchaseTotalAmount === 'number' &&
                                        payment._purchaseAdvancePaid < payment._purchaseTotalAmount;

                                      if (wasThisTheAdvancePayment) {
                                        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-300">Advance Cleared</span>;
                                      } else {
                                        if (payment.customerPurchaseId) {
                                          return (
                                            <button
                                              onClick={() => navigate(`/invoice/${payment.customerPurchaseId}`)}
                                              className="text-primary hover:text-primary/80 hover:underline flex items-center gap-1.5 text-sm transition-colors touch-target"
                                            >
                                              <FileText size={16} /> View Proforma Invoice
                                            </button>
                                          );
                                        } else {
                                          return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-300">Proforma Invoice N/A</span>; 
                                        }
                                      }
                                    }
                                  })()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden flex-1 overflow-y-auto">
                    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                      {payments.filter((payment) => {
                        if (!historySearch.trim()) return true;
                        const q = historySearch.toLowerCase();
                        const purchaseId = (payment.purchaseID || '').toLowerCase();
                        const quotation = (payment.quotationNumber || '').toLowerCase();
                        const name = `${payment.customer?.firstName || ''} ${payment.customer?.lastName || ''}`.toLowerCase();
                        const phone = (payment.customer?.phone || '').toLowerCase();
                        return purchaseId.includes(q) || quotation.includes(q) || name.includes(q) || phone.includes(q);
                      }).map((payment) => (
                        <PaymentHistoryCard key={payment._id} payment={payment} onViewProformaInvoice={(id) => navigate(`/invoice/${id}`)} isAdmin={isAdmin} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 