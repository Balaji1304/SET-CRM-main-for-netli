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
    transactionNo: ''
  });
  const [loadingQuotations, setLoadingQuotations] = useState({});

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
      const response = await fetch('http://localhost:5000/api/quotations', {
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
      expired: 'bg-yellow-100 text-yellow-800'
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

      const response = await fetch(`http://localhost:5000/api/quotations/${id}/send`, {
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
      const response = await fetch(`http://localhost:5000/api/quotations/${id}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        fetchQuotations();
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
    }
  };

  const handleOfflinePayment = async () => {
    try {
      // Input validation
      if (!selectedQuotation?._id) {
        throw new Error('No quotation selected');
      }

      const amount = parseFloat(paymentDetails.amount);
      if (!paymentDetails.transactionNo?.trim() || isNaN(amount) || amount <= 0) {
        throw new Error('Please provide valid payment details');
      }

      const response = await fetch(`http://localhost:5000/api/quotations/${selectedQuotation._id}/offline-payment`, {
        method: 'POST',
        headers: getAuthHeaders(true), // Using the consistent auth header helper
        body: JSON.stringify({
          amount,
          transactionNo: paymentDetails.transactionNo.trim()
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
        setPaymentDetails({ amount: '', transactionNo: '' });
        setSelectedQuotation(null);
        await fetchQuotations(); // Refresh the quotations list
        alert('Payment confirmed successfully');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      alert(error.message || 'Failed to confirm payment');
    }
  };

  const handleRejectQuotation = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/quotations/${id}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        fetchQuotations();
      }
    } catch (error) {
      console.error('Error rejecting quotation:', error);
    }
  };

  const PaymentModal = () => {
    if (!showPaymentModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Confirm Offline Payment</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputmode="numeric"
                value={paymentDetails.amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || !isNaN(value)) {
                    setPaymentDetails(prev => ({
                      ...prev,
                      amount: value
                    }));
                  }
                }}
                className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter amount"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Number
              </label>
              <input
                type="text"
                value={paymentDetails.transactionNo}
                onChange={(e) => {
                  setPaymentDetails(prev => ({
                    ...prev,
                    transactionNo: e.target.value.trim()
                  }));
                }}
                className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter transaction number"
                required
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentDetails({ amount: '', transactionNo: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!paymentDetails.amount || !paymentDetails.transactionNo) {
                    alert('Please fill in all fields');
                    return;
                  }
                  handleOfflinePayment();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                type="submit"
                disabled={!paymentDetails.amount || !paymentDetails.transactionNo}
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
                ${quotation.total.toFixed(2)}
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
                            onClick={() => handleApproveQuotation(quotation._id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRejectQuotation(quotation._id)}
                            className="text-red-600 hover:text-red-900"
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