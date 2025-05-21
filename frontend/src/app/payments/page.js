import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, ExternalLink, FileText, Clock, ArrowRight } from 'lucide-react';
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <AlertCircle className="h-12 w-12 mb-2" />
        <p>{error}</p>
        <button 
          onClick={fetchPaymentData} 
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Payment & Billing</h2>
        <p className="text-muted-foreground mt-1">Manage your payments and view billing history</p>
      </div>

      {/* Pending Payments Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-4">Pending Payments</h3>
        {purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mb-2" />
            <p>No pending payments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div
                key={purchase._id}
                className="border rounded-lg p-4 hover:border-orange-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">Order #{purchase.purchaseID || purchase.quotationId.quotationNumber}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Purchase Date: {formatDate(purchase.purchaseDate)}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <p className="text-gray-600">Total Amount:</p>
                      <p className="font-medium">{formatCurrency(purchase.totalAmount)}</p>
                      
                      <p className="text-gray-600">Advance Paid:</p>
                      <p className="font-medium">{formatCurrency(purchase.advancePaid)}</p>
                      
                      <p className="text-gray-600">Remaining:</p>
                      <p className="font-medium text-orange-600">{formatCurrency(purchase.remainingAmount)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleMakePayment(purchase._id)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                  >
                    Pay Now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Payment Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Payment Progress</span>
                    <span className="text-xs text-gray-500">
                      {Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${Math.round((purchase.advancePaid / purchase.totalAmount) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mb-2" />
            <p>No payment history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Purchase ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Quotation #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Payment Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Purchase Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Payment Method</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="px-4 py-3 text-sm">{payment.purchaseID || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{payment.quotationNumber}</td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(payment.paidAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(payment.purchaseDate)} 
                    </td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(payment.amountPaid)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="capitalize">{payment.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {payment.transactionId || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        if (!payment.isFullyPaid) {
                          return <span className="text-gray-500 italic">Payment pending</span>;
                        } else {
                          const wasThisTheAdvancePayment = 
                            typeof payment._purchaseAdvancePaid === 'number' &&
                            payment.amountPaid === payment._purchaseAdvancePaid &&
                            payment._purchaseAdvancePaid > 0 &&
                            typeof payment._purchaseTotalAmount === 'number' &&
                            payment._purchaseAdvancePaid < payment._purchaseTotalAmount;

                          if (wasThisTheAdvancePayment) {
                            return <span className="text-gray-500 italic">Advance Cleared</span>;
                          } else {
                            if (payment.customerPurchaseId) {
                              return (
                                <button
                                  onClick={() => navigate(`/invoice/${payment.customerPurchaseId}`)}
                                  className="text-orange-600 hover:text-orange-800 hover:underline flex items-center gap-1"
                                >
                                  <FileText size={16} /> View Invoice
                                </button>
                              );
                            } else {
                              return <span className="text-gray-500 italic">Invoice link error</span>; 
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