import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, ExternalLink, FileText, Clock, ArrowRight, Loader2, AlertTriangle, ShoppingBag, IndianRupee, Calendar, User } from 'lucide-react';
import { getMyPurchases, getPaymentHistory } from '../../services/customerService';

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
const PendingPaymentCard = ({ purchase, onPayNow }) => (
  <div className="mobile-card-compact mobile-card-container bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-200">
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

    {/* Action Button */}
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
  </div>
);

// Mobile Card Component for Payment History
const PaymentHistoryCard = ({ payment, onViewProformaInvoice }) => {
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
  const navigate = useNavigate();

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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">Payment & Billing</h1>
          </div>
        </div>

        {/* Main Content Area - Contains pending payments and payment history */}
        <div className="space-y-6 sm:space-y-8">
          {/* Pending Payments Section */}
          <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
            {/* Section Header */}
            <div className="p-4 md:p-6 border-b border-fourth">
              <h3 className="text-lg sm:text-xl font-semibold text-secondary">Pending Payments</h3>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
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
                      {purchases.map((purchase) => (
                        <div
                          key={purchase._id}
                          className="border border-fourth rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 ease-in-out bg-white"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg text-secondary line-clamp-1">Order #{purchase.purchaseID || purchase.quotationId?.quotationNumber || 'N/A'}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Purchase Date: {formatDate(purchase.purchaseDate)}
                              </p>
                              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                <p className="text-gray-500">Total Amount:</p>
                                <p className="font-medium text-secondary">{formatCurrency(purchase.totalAmount)}</p>
                                
                                <p className="text-gray-500">Advance Paid:</p>
                                <p className="font-medium text-secondary">{formatCurrency(purchase.advancePaid)}</p>
                                
                                <p className="text-gray-500">Remaining:</p>
                                <p className="font-medium text-primary">{formatCurrency(purchase.remainingAmount)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleMakePayment(purchase._id)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-tertiary rounded-md text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto justify-center touch-target"
                            >
                              Pay Now
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {(purchase.totalAmount && purchase.totalAmount > 0) && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-gray-500">Payment Progress</span>
                                <span className="text-xs font-medium text-gray-500">
                                {Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%
                              </span>
                            </div>
                              <div className="w-full bg-fourth rounded-full h-2.5">
                              <div 
                                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
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
                      {purchases.map((purchase) => (
                        <PendingPaymentCard key={purchase._id} purchase={purchase} onPayNow={handleMakePayment} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment History Section */}
          <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
            {/* Section Header */}
            <div className="p-4 md:p-6 border-b border-fourth">
              <h3 className="text-lg sm:text-xl font-semibold text-secondary">Payment History</h3>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
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
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase ID</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation #</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                              <th className="hidden lg:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Date</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                              <th className="hidden xl:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proforma Invoice</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-fourth">
                            {payments.map((payment) => (
                              <tr key={payment._id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <div className="truncate max-w-32">{payment.purchaseID || 'N/A'}</div>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <div className="truncate max-w-32">{payment.quotationNumber || 'N/A'}</div>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {formatDate(payment.paidAt || payment.paymentDate)}
                                </td>
                                <td className="hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {formatDate(payment.purchaseDate)} 
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatCurrency(payment.amountPaid)}</td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <span className="capitalize truncate max-w-24 inline-block">{payment.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                                </td>
                                <td className="hidden xl:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                  <div className="truncate max-w-32">{payment.transactionId || 'N/A'}</div>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
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
                      {payments.map((payment) => (
                        <PaymentHistoryCard key={payment._id} payment={payment} onViewProformaInvoice={(id) => navigate(`/invoice/${id}`)} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 