import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, ExternalLink } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch quotations with pending payments
      const response = await fetch('http://localhost:5000/api/quotations/pending-payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch payments');
      }

      const data = await response.json();
      if (data.success) {
        // Separate pending and completed payments
        const pending = data.data.filter(q => q.advancePaymentStatus === 'PENDING');
        const completed = data.data.filter(q => q.advancePaymentStatus === 'CONFIRMED');
        
        setPendingPayments(pending);
        setPayments(completed);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
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
      {pendingPayments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-4">Pending Payments</h3>
          <div className="space-y-4">
            {pendingPayments.map((quotation) => (
              <div
                key={quotation._id}
                className="border border-orange-200 bg-orange-50 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">Quotation #{quotation.quotationNumber}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Advance Payment Required: ₹{(quotation.total * 0.2).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Total Amount: ₹{quotation.total.toFixed(2)}
                    </p>
                  </div>
                  {quotation.razorpayPaymentLink && (
                    <a
                      href={quotation.razorpayPaymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Pay Now
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Quotation #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Transaction ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="px-4 py-3 text-sm">{payment.quotationNumber}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.advancePaymentConfirmedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">₹{payment.advancePaymentAmount?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Paid
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {payment.razorpayPaymentId || payment.offlineTransactionNo}
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