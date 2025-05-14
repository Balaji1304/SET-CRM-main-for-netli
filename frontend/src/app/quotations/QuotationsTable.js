import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, FileText, Send, Check, X, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';

export default function QuotationsTable({ searchTerm, statusFilter }) {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    transactionNo: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loadingQuotations, setLoadingQuotations] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchQuotations();
  }, [navigate]);

  const getAuthHeaders = (contentType = false) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    if (contentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  const fetchQuotations = async () => {
    try {
      const response = await fetch('https://set-crm-main-for-netli.onrender.com/api/quotations', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setQuotations(data.data);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-purple-100 text-purple-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const handleWebSocketMessage = useCallback((message) => {
    const { quotationId, status } = message;
    if (quotationId && status) {
      setQuotations(prevQuotations =>
        prevQuotations.map(q =>
          q._id === quotationId
            ? { ...q, status }
            : q
        )
      );
      setLoadingQuotations(prev => ({ ...prev, [quotationId]: false }));
    }
  }, []);


  const handleSendQuotation = async (id) => {
    try {
      setLoadingQuotations(prev => ({ ...prev, [id]: true }));

      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${id}/send`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      
      if (data.success) {
        setQuotations(prevQuotations => 
          prevQuotations.map(q => 
            q._id === id ? data.data : q
          )
        );
      } else {
        throw new Error(data.message || 'Failed to send quotation');
      }
    } catch (error) {
      console.error('Error sending quotation:', error);
      alert(error.message || 'Failed to send quotation');
      setLoadingQuotations(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleApproveQuotation = async (id) => {
    try {
      setActionInProgress(true);
      
      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${id}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        fetchQuotations();
      } else {
        throw new Error(data.message || 'Failed to approve quotation');
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
    } finally {
      setActionInProgress(false);
      setShowConfirmDialog(false);
    }
  };

  const handleOfflinePayment = async () => {
    try {
      // Clear any previous errors
      setPaymentError('');
      
      // Input validation
      if (!selectedQuotation?._id) {
        throw new Error('No quotation selected');
      }

      const amount = parseFloat(paymentDetails.amount);
      const trimmedTransactionNo = paymentDetails.transactionNo.trim();
      
      if (!trimmedTransactionNo || isNaN(amount) || amount <= 0) {
        throw new Error('Please provide valid payment details');
      }

      // Validate minimum payment amount (20% of total)
      const minimumAdvance = selectedQuotation.total * 0.20;
      if (amount < minimumAdvance) {
        setPaymentError(`Advance payment must be at least ${minimumAdvance.toFixed(2)} (20% of total amount)`);
        return;
      }

      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${selectedQuotation._id}/offline-payment`, {
        method: 'POST',
        headers: getAuthHeaders(true), // Using the consistent auth header helper
        body: JSON.stringify({
          amount,
          transactionNo: trimmedTransactionNo,
          paymentMethod: paymentDetails.paymentMethod,
          paymentDate: paymentDetails.paymentDate,
          notes: paymentDetails.notes?.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment confirmation failed');
      }

      const data = await response.json();
      if (data.success) {
        // Reset form and refresh data
        setShowPaymentModal(false);
        setPaymentDetails({
          amount: '',
          transactionNo: '',
          paymentMethod: 'cash',
          paymentDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        setSelectedQuotation(null);
        await fetchQuotations(); // Refresh the quotations list
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      setPaymentError(error.message || 'Failed to confirm payment');
    }
  };

  const handleRejectQuotation = async (id) => {
    try {
      setActionInProgress(true);
      
      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${id}/close`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        fetchQuotations();
      } else {
        throw new Error(data.message || 'Failed to close quotation');
      }
    } catch (error) {
      console.error('Error closing quotation:', error);
    } finally {
      setActionInProgress(false);
      setShowConfirmDialog(false);
    }
  };

  // Add a new ConfirmDialog component
  const ConfirmDialog = () => {
    if (!showConfirmDialog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h3 className="text-lg font-semibold mb-2">Confirm Action</h3>
          <p className="text-gray-600 mb-4">
            {confirmMessage}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="px-4 py-2 border border-input rounded-lg text-sm font-medium hover:bg-orange-50"
              disabled={actionInProgress}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirmAction) confirmAction();
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
              disabled={actionInProgress}
            >
              {actionInProgress ? 'Processing...' : 'Yes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PaymentModal = () => {
    if (!showPaymentModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-[500px] max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Confirm Offline Payment</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={paymentDetails.amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers and one decimal point
                  if (/^$|^\d*\.?\d*$/.test(value)) {
                    setPaymentDetails({
                      ...paymentDetails,
                      amount: value
                    });
                    setPaymentError('');
                  }
                }}
                className={`w-full p-2 border ${paymentError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-orange-500 focus:border-orange-500`}
                placeholder="Enter payment amount"
                required
              />
              {paymentError && (
                <p className="mt-1 text-sm text-red-600">{paymentError}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentDetails.paymentMethod}
                onChange={(e) => {
                  setPaymentDetails({
                    ...paymentDetails,
                    paymentMethod: e.target.value
                  });
                }}
                className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Number / Reference <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={paymentDetails.transactionNo}
                onChange={(e) => {
                  setPaymentDetails({
                    ...paymentDetails,
                    transactionNo: e.target.value
                  });
                }}
                className={`w-full p-2 border ${paymentError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-orange-500 focus:border-orange-500`}
                placeholder="Enter transaction reference number"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDetails.paymentDate}
                onChange={(e) => {
                  setPaymentDetails({
                    ...paymentDetails,
                    paymentDate: e.target.value
                  });
                }}
                className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={paymentDetails.notes}
                onChange={(e) => {
                  setPaymentDetails({
                    ...paymentDetails,
                    notes: e.target.value
                  });
                }}
                rows="3"
                className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="Additional payment notes (optional)"
              />
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentDetails({
                    amount: '',
                    transactionNo: '',
                    paymentMethod: 'cash',
                    paymentDate: new Date().toISOString().split('T')[0],
                    notes: ''
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!paymentDetails.amount || !paymentDetails.transactionNo || !paymentDetails.paymentDate) {
                    setPaymentError('Please fill in all required fields');
                    return;
                  }
                  handleOfflinePayment();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                type="submit"
                disabled={!paymentDetails.amount || !paymentDetails.transactionNo || !paymentDetails.paymentDate}
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter and pagination logic
  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = searchTerm === '' || 
      quotation.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || quotation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQuotations = filteredQuotations.slice(startIndex, endIndex);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const renderSendButton = (quotation) => {
    const isLoading = loadingQuotations[quotation._id];
    
    return (
      <button
        onClick={() => handleSendQuotation(quotation._id)}
        className="text-green-600 hover:text-green-900"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <PaymentModal />
      <ConfirmDialog />
      <table className="min-w-full">
        <thead className="bg-orange-500 text-white">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium">
              Quotation #
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium">
              Lead
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium">
              Total
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium">
              Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium">
              Payment Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium">
              Valid Until
            </th>
            <th className="px-6 py-3 text-right text-sm font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentQuotations.map((quotation) => (
            <tr key={quotation._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {quotation.quotationNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {quotation.lead.firstName} {quotation.lead.lastName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ₹{quotation.total.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(quotation.status)}`}>
                  {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {quotation.advancePaymentStatus === 'CONFIRMED' ? (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Payment Confirmed
                  </span>
                ) : quotation.status === 'sent' ? (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Payment Pending
                  </span>
                ) : null}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(quotation.validUntil).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => navigate(`/dashboard/quotations/${quotation._id}`)}
                    className="text-orange-600 hover:text-orange-900"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                  {quotation.status === 'draft' && (
                    <>
                      <button
                        onClick={() => navigate(`/dashboard/quotations/${quotation._id}/edit`)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={loadingQuotations[quotation._id]}
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      {renderSendButton(quotation)}
                    </>
                  )}
                  {quotation.status === 'sent' && (
                    <>
                      {/* Only show offline payment button if online payment is not confirmed */}
                      {quotation.advancePaymentStatus !== 'CONFIRMED' && (
                        <button
                          onClick={() => {
                            setSelectedQuotation(quotation);
                            setShowPaymentModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900"
                          title="Confirm Offline Payment"
                        >
                          <DollarSign className="h-5 w-5" />
                        </button>
                      )}
                      {/* Only show approve/reject buttons if payment is not confirmed */}
                      {quotation.advancePaymentStatus !== 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => {
                              setConfirmMessage('Are you sure you want to approve this quotation?');
                              setConfirmAction(() => () => handleApproveQuotation(quotation._id));
                              setShowConfirmDialog(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Approve Quotation"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmMessage('Are you sure you want to close this quotation? This indicates the quotation was not accepted by the lead.');
                              setConfirmAction(() => () => handleRejectQuotation(quotation._id));
                              setShowConfirmDialog(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Close Quotation"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        <div className="flex items-center">
          <p className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredQuotations.length)} of{' '}
            {filteredQuotations.length} results
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 border rounded-md disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 border rounded-md disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 