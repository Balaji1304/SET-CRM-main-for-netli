import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, FileText, Send, Check, X, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { 
  getQuotations, 
  sendQuotation, 
  approveQuotation, 
  closeQuotation, 
  confirmOfflinePayment 
} from '../../services/quotationService';

// Standalone Payment Modal Component
function StandalonePaymentModal({
  showModal,
  onClose,
  selectedQuotation,
  paymentDetails,
  onPaymentDetailsChange,
  onSubmit,
  paymentError,
  onSetPaymentError // Renamed from onClearPaymentError for clarity, maps to setPaymentError
}) {
  if (!showModal || !selectedQuotation) return null;

  const advancePercentage = selectedQuotation.advancePaymentPercentage || 20;
  const minimumAdvance = selectedQuotation.total * (advancePercentage / 100) || 0;

  const internalHandleSubmit = () => {
    onSetPaymentError(''); // Clear previous errors

    if (!selectedQuotation._id) {
      onSetPaymentError('No quotation selected');
      return;
    }

    if (!paymentDetails.amount || !paymentDetails.transactionNo || !paymentDetails.paymentDate) {
      onSetPaymentError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(paymentDetails.amount);
    if (isNaN(amount) || amount <= 0) {
      onSetPaymentError('Please enter a valid payment amount');
      return;
    }

    if (amount < minimumAdvance) {
      onSetPaymentError(`Advance payment must be at least ₹${minimumAdvance.toLocaleString('en-IN')} (${advancePercentage}% of total amount)`);
      return;
    }
    onSubmit(); // Calls handleOfflinePayment in parent
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[500px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Confirm Offline Payment</h2>
        <div className="space-y-4">
          <div className="bg-orange-50 p-3 rounded-md mb-4">
            <p className="text-sm font-medium text-gray-700">
              Advance Payment Required: {advancePercentage}% of total amount
            </p>
            <p className="text-sm font-medium text-gray-700">
              Minimum Amount: ₹{minimumAdvance.toLocaleString('en-IN')}
            </p>
            {selectedQuotation.quotationItems && selectedQuotation.quotationItems.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedQuotation.quotationItems.length} product{selectedQuotation.quotationItems.length !== 1 ? 's' : ''} included
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={paymentDetails.amount}
              onChange={(e) => 
                onPaymentDetailsChange(prev => ({
                  ...prev,
                  amount: e.target.value
                }))
              }
              className={`w-full p-2 border ${paymentError && paymentDetails.amount === '' ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-orange-500 focus:border-orange-500`}
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
              onChange={(e) => 
                onPaymentDetailsChange(prev => ({
                  ...prev,
                  paymentMethod: e.target.value
                }))
              }
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
              onChange={(e) => 
                onPaymentDetailsChange(prev => ({
                  ...prev,
                  transactionNo: e.target.value
                }))
              }
              className={`w-full p-2 border ${paymentError && paymentDetails.transactionNo === '' ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-orange-500 focus:border-orange-500`}
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
              onChange={(e) => 
                onPaymentDetailsChange(prev => ({
                  ...prev,
                  paymentDate: e.target.value
                }))
              }
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
              onChange={(e) => 
                onPaymentDetailsChange(prev => ({
                  ...prev,
                  notes: e.target.value
                }))
              }
              rows="3"
              className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="Additional payment notes (optional)"
            />
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={onClose} // Use onClose prop
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={internalHandleSubmit} // Use the internal submit handler
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
              type="button" // Changed to type="button" to prevent default form submission if wrapped in a form later
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await getQuotations();
      if (response.success) {
        setQuotations(response.data);
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

      const response = await sendQuotation(id);
      
      if (response.success) {
        setQuotations(prevQuotations => 
          prevQuotations.map(q => 
            q._id === id ? response.data : q
          )
        );
      } else {
        throw new Error(response.message || 'Failed to send quotation');
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
      
      const response = await approveQuotation(id);
      
      if (response.success) {
        // Update the quotation in the local state
        setQuotations(prevQuotations => 
          prevQuotations.map(q => 
            q._id === id ? { ...q, status: 'approved' } : q
          )
        );
      } else {
        throw new Error(response.message || 'Failed to approve quotation');
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
      // Display error message to user
      alert(`Failed to approve quotation: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setActionInProgress(false);
      setShowConfirmDialog(false);
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentDetails({
      amount: '',
      transactionNo: '',
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPaymentError('');
    // setSelectedQuotation(null); // Keep selectedQuotation if needed for context, or clear if not
  };

  const handleOfflinePayment = async () => {
    try {
      // Validation is now done in StandalonePaymentModal before this is called
      
      const amount = parseFloat(paymentDetails.amount);
      const trimmedTransactionNo = paymentDetails.transactionNo.trim();
      
      const paymentData = {
        amount,
        transactionNo: trimmedTransactionNo,
        paymentMethod: paymentDetails.paymentMethod,
        paymentDate: paymentDetails.paymentDate,
        notes: paymentDetails.notes?.trim()
      };

      const response = await confirmOfflinePayment(selectedQuotation._id, paymentData);

      if (response.success) {
        // Reset form and refresh data
        setShowPaymentModal(false); // This will trigger onClose via prop eventually if structured that way
        setPaymentDetails({
          amount: '',
          transactionNo: '',
          paymentMethod: 'cash',
          paymentDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        setSelectedQuotation(null); // Clear selected quotation after successful payment
        setPaymentError('');
        await fetchQuotations(); // Refresh the quotations list
      } else {
        // If API call itself fails after validation passes
        setPaymentError(response.message || 'Failed to confirm payment (API error)');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      setPaymentError(error.message || 'Failed to confirm payment');
    }
  };

  const handleRejectQuotation = async (id) => {
    try {
      setActionInProgress(true);
      
      const response = await closeQuotation(id);
      
      if (response.success) {
        // Update the quotation in the local state
        setQuotations(prevQuotations => 
          prevQuotations.map(q => 
            q._id === id ? { ...q, status: 'closed' } : q
          )
        );
      } else {
        throw new Error(response.message || 'Failed to close quotation');
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
      <StandalonePaymentModal
        showModal={showPaymentModal}
        onClose={handleClosePaymentModal}
        selectedQuotation={selectedQuotation}
        paymentDetails={paymentDetails}
        onPaymentDetailsChange={setPaymentDetails}
        onSubmit={handleOfflinePayment}
        paymentError={paymentError}
        onSetPaymentError={setPaymentError}
      />
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
            <th className="px-6 py-3 text-left text-sm font-medium">
              Items
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
                ₹{quotation.total.toLocaleString('en-IN')}
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {quotation.quotationItems ? 
                  `${quotation.quotationItems.length} product${quotation.quotationItems.length !== 1 ? 's' : ''}` : 
                  '0 products'
                }
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