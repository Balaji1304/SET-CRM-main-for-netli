import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, ExternalLink, FileText, Clock, ArrowRight, Loader2, AlertTriangle, ShoppingBag } from 'lucide-react';
import { getCustomerPurchases, getPaymentHistory } from '../../services/customerService';

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
        getCustomerPurchases(),
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
    <div className="flex flex-col flex-1 bg-tertiary font-sans space-y-8">
      <div className="border-b border-fourth pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-secondary">Payment & Billing</h1>
      </div>

      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm p-6">
        <h3 className="text-xl font-semibold text-secondary mb-6">Pending Payments</h3>
        {purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-secondary">
            <Clock className="h-16 w-16 mb-4 text-primary" />
            <p className="text-xl font-medium text-secondary mb-2">No Pending Payments</p>
            <p className="text-gray-600">All your dues are cleared. Great job!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <div
                key={purchase._id}
                className="border border-fourth rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 ease-in-out bg-white"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-semibold text-lg text-secondary">Order #{purchase.purchaseID || purchase.quotationId?.quotationNumber || 'N/A'}</h4>
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-tertiary rounded-md text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto justify-center mt-3 sm:mt-0"
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
        )}
      </div>

      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm p-6">
        <h3 className="text-xl font-semibold text-secondary mb-6">Payment History</h3>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-secondary">
            <CreditCard className="h-16 w-16 mb-4 text-primary" />
            <p className="text-xl font-medium text-secondary mb-2">No Payment History</p>
            <p className="text-gray-600">Your past transactions will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-fourth">
            <table className="min-w-full divide-y divide-fourth">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-fourth">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{payment.purchaseID || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{payment.quotationNumber || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(payment.paidAt || payment.paymentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(payment.purchaseDate)} 
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatCurrency(payment.amountPaid)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="capitalize">{payment.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {payment.transactionId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                                  className="text-primary hover:text-primary/80 hover:underline flex items-center gap-1.5 text-sm transition-colors"
                                >
                                  <FileText size={16} /> View Invoice
                                </button>
                              );
                            } else {
                              return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-300">Invoice N/A</span>; 
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
        )}
      </div>
    </div>
  );
} 