import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, FileText, Send, Check, X, ChevronLeft, ChevronRight, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { 
  getQuotations, 
  sendQuotation, 
  approveQuotation, 
  closeQuotation, 
  confirmOfflinePayment 
} from '../../services/quotationService';

// Helper to format enum values or status strings
const formatDisplayValue = (value) => {
  if (!value) return 'N/A';
  return value
    .replace(/_/g, ' ') // Replace underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Standalone Payment Modal Component
function StandalonePaymentModal({
  showModal,
  onClose,
  selectedQuotation,
  paymentDetails,
  onPaymentDetailsChange,
  onSubmit,
  paymentError,
  onSetPaymentError 
}) {
  if (!showModal || !selectedQuotation) return null;

  const advancePercentage = selectedQuotation.advancePaymentPercentage || 20;
  const minimumAdvance = selectedQuotation.total * (advancePercentage / 100) || 0;

  const internalHandleSubmit = () => {
    onSetPaymentError(''); 
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
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-tertiary p-6 rounded-lg shadow-xl max-w-lg w-full transform transition-all duration-300 ease-out max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-secondary">Confirm Offline Payment</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-fourth">
                <X className="w-5 h-5 text-gray-500"/>
            </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/30 p-4 rounded-md mb-4 text-sm">
            <p className="font-medium text-primary">
              Advance Payment Required: {advancePercentage}%
            </p>
            <p className="font-medium text-primary">
              Minimum Amount: ₹{minimumAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {selectedQuotation.quotationItems && selectedQuotation.quotationItems.length > 0 && (
              <p className="text-xs text-primary/80 mt-1">
                {selectedQuotation.quotationItems.length} product{selectedQuotation.quotationItems.length !== 1 ? 's' : ''} included.
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="paymentAmount" className="block text-sm font-medium text-secondary mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              id="paymentAmount"
              type="text"
              inputMode="decimal"
              value={paymentDetails.amount}
              onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, amount: e.target.value }))}
              className={`w-full p-2.5 border rounded-lg focus:ring-1 focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400 ${paymentError && !paymentDetails.amount ? 'border-red-500 ring-red-500' : 'border-fourth focus:ring-primary'}`}
              placeholder="Enter payment amount"
              required
            />
          </div>
          
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-secondary mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="paymentMethod"
              value={paymentDetails.paymentMethod}
              onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full p-2.5 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-sm text-secondary bg-tertiary"
              required
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="transactionNo" className="block text-sm font-medium text-secondary mb-1">
              Transaction Number / Reference <span className="text-red-500">*</span>
            </label>
            <input
              id="transactionNo"
              type="text"
              value={paymentDetails.transactionNo}
              onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, transactionNo: e.target.value }))}
              className={`w-full p-2.5 border rounded-lg focus:ring-1 focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400 ${paymentError && !paymentDetails.transactionNo ? 'border-red-500 ring-red-500' : 'border-fourth focus:ring-primary'}`}
              placeholder="Enter transaction reference"
              required
            />
          </div>
          
          <div>
            <label htmlFor="paymentDate" className="block text-sm font-medium text-secondary mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              id="paymentDate"
              type="date"
              value={paymentDetails.paymentDate}
              onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, paymentDate: e.target.value }))}
              className="w-full p-2.5 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary"
              required
            />
          </div>
          
          <div>
            <label htmlFor="paymentNotes" className="block text-sm font-medium text-secondary mb-1">Notes</label>
            <textarea
              id="paymentNotes"
              value={paymentDetails.notes}
              onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className="w-full p-2.5 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400"
              placeholder="Additional payment notes (optional)"
            />
          </div>
          
          {paymentError && (
            <p className="mt-2 text-sm text-red-600 text-center">{paymentError}</p>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors duration-150 ease-in-out"
            >
              Cancel
            </button>
            <button
              onClick={internalHandleSubmit}
              type="button"
              className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out flex items-center justify-center min-w-[120px]"
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
  const [error, setError] = useState(null); // For page-level errors
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedQuotationForPayment, setSelectedQuotationForPayment] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    transactionNo: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loadingAction, setLoadingAction] = useState({}); // Tracks loading state for specific actions like send, approve
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogProps, setConfirmDialogProps] = useState({ message: '', onConfirm: null });
  const [actionInProgress, setActionInProgress] = useState(false); // For modal confirm button
  const [paymentError, setPaymentError] = useState(''); // Specifically for payment modal
  const [successToast, setSuccessToast] = useState({ show: false, message: '' });


  const fetchQuotationsCallback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getQuotations();
      if (response.success) {
        setQuotations(response.data);
      } else {
        setError(response.message || 'Failed to fetch quotations');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching quotations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchQuotationsCallback();
  }, [navigate, fetchQuotationsCallback]);

  const getStatusBadgeClass = (status) => {
    const classes = {
      draft: 'bg-gray-100 text-gray-700 border border-gray-300',
      sent: 'bg-blue-100 text-blue-700 border border-blue-300',
      approved: 'bg-green-100 text-green-700 border border-green-300',
      rejected: 'bg-red-100 text-red-700 border border-red-300',
      expired: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      closed: 'bg-purple-100 text-purple-700 border border-purple-300'
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border border-gray-300';
  };

  const showToast = (message) => {
    setSuccessToast({ show: true, message });
    setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
  };

  const handleAction = async (actionFn, quotationId, successMessage, updateLocalState) => {
    setLoadingAction(prev => ({ ...prev, [quotationId]: true }));
      setActionInProgress(true);
    try {
      const response = await actionFn(quotationId);
      if (response.success) {
        if (updateLocalState) {
          setQuotations(prev => updateLocalState(prev, response.data));
        } else {
          fetchQuotationsCallback(); // Fallback to refetch if no specific update logic
        }
        showToast(successMessage);
      } else {
        throw new Error(response.message || 'Action failed');
      }
    } catch (err) {
      console.error('Action error:', err);
      setError(err.message || 'An error occurred'); // Show error in a more prominent way if needed
    } finally {
      setLoadingAction(prev => ({ ...prev, [quotationId]: false }));
      setActionInProgress(false);
      setShowConfirmDialog(false);
    }
  };

  const handleSendQuotation = (id) => handleAction(
    sendQuotation,
    id,
    'Quotation sent successfully!',
    (prev, data) => prev.map(q => q._id === id ? data : q)
  );

  const handleApproveQuotation = (id) => handleAction(
    approveQuotation,
    id,
    'Quotation approved successfully!',
    (prev, data) => prev.map(q => q._id === id ? { ...q, status: 'approved', ...(data || {}) } : q)
  );

  const handleCloseQuotation = (id) => handleAction(
    closeQuotation, // This is likely a reject/close action
    id,
    'Quotation closed successfully!',
    (prev, data) => prev.map(q => q._id === id ? { ...q, status: 'closed', ...(data || {}) } : q)
  );

  const openConfirmDialog = (message, onConfirm) => {
    setConfirmDialogProps({ message, onConfirm });
    setShowConfirmDialog(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentDetails({ amount: '', transactionNo: '', paymentMethod: 'cash', paymentDate: new Date().toISOString().split('T')[0], notes: '' });
    setPaymentError('');
    setSelectedQuotationForPayment(null);
  };

  const handleOfflinePaymentSubmit = async () => {
    setActionInProgress(true);
    setPaymentError('');
    try {
      const amount = parseFloat(paymentDetails.amount);
      const paymentData = { ...paymentDetails, amount };
      const response = await confirmOfflinePayment(selectedQuotationForPayment._id, paymentData);
      if (response.success) {
        showToast('Offline payment confirmed successfully!');
        handleClosePaymentModal();
        fetchQuotationsCallback(); 
      } else {
        setPaymentError(response.message || 'Failed to confirm payment');
      }
    } catch (err) {
      setPaymentError(err.message || 'An error occurred during payment confirmation.');
    } finally {
      setActionInProgress(false);
    }
  };

  const ConfirmActionDialog = () => {
    if (!showConfirmDialog) return null;
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
        <div className="bg-tertiary p-6 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ease-out">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-secondary">Confirm Action</h3>
            <button onClick={() => setShowConfirmDialog(false)} className="p-1 rounded-full hover:bg-fourth">
                <X className="w-5 h-5 text-gray-500"/>
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">{confirmDialogProps.message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowConfirmDialog(false)}
              disabled={actionInProgress}
              className="px-4 py-2 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors duration-150 ease-in-out disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (confirmDialogProps.onConfirm) confirmDialogProps.onConfirm(); }}
              disabled={actionInProgress}
              className={`px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out disabled:opacity-60 flex items-center justify-center min-w-[80px]`}
            >
              {actionInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filteredQuotations = quotations.filter(quotation => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      (quotation.quotationNumber && quotation.quotationNumber.toLowerCase().includes(searchTermLower)) ||
      (quotation.lead?.firstName && quotation.lead.firstName.toLowerCase().includes(searchTermLower)) ||
      (quotation.lead?.lastName && quotation.lead.lastName.toLowerCase().includes(searchTermLower));
    const matchesStatus = statusFilter === '' || quotation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQuotations = filteredQuotations.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading quotations...</p>
      </div>
    );
  }

  if (error && quotations.length === 0) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Quotations</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
      <button
          onClick={fetchQuotationsCallback} 
          className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
      </button>
      </div>
    );
  }

  return (
    // Root div of QuotationsTable: No card styling here, parent (QuotationsPage.js) provides it.
    <div className="flex flex-col flex-1 overflow-hidden">
      <StandalonePaymentModal
        showModal={showPaymentModal}
        onClose={handleClosePaymentModal}
        selectedQuotation={selectedQuotationForPayment} // Use dedicated state
        paymentDetails={paymentDetails}
        onPaymentDetailsChange={setPaymentDetails}
        onSubmit={handleOfflinePaymentSubmit} // Use specific submit handler
        paymentError={paymentError}
        onSetPaymentError={setPaymentError}
      />
      <ConfirmActionDialog />
      
      <div className="overflow-x-auto flex-1 relative">
        <table className="min-w-full divide-y divide-fourth">
          <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Quotation #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Lead Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Payment Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Valid Until</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
          <tbody className="bg-tertiary divide-y divide-fourth">
            {currentQuotations.length === 0 && !loading ? (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-secondary">
                    No quotations found matching your criteria.
              </td>
                </tr>
            ) : (
                currentQuotations.map((quotation) => (
                    <tr key={quotation._id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">{quotation.quotationNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {quotation.lead ? `${quotation.lead.firstName} ${quotation.lead.lastName}` : 'N/A'}
              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(quotation.status)}`}>
                        {formatDisplayValue(quotation.status)}
                </span>
              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDisplayValue(quotation.advancePaymentStatus) || 'Not Applicable'}
              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(quotation.validUntil).toLocaleDateString('en-GB')}
              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {quotation.quotationItems ? `${quotation.quotationItems.length} item${quotation.quotationItems.length !== 1 ? 's' : ''}` : '0 items'}
              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate(`/dashboard/quotations/${quotation._id}`)}
                            className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors duration-150 ease-in-out"
                            title="View Quotation"
                  >
                            <FileText className="w-4 h-4" />
                  </button>
                  {quotation.status === 'draft' && (
                    <>
                      <button
                        onClick={() => navigate(`/dashboard/quotations/${quotation._id}/edit`)}
                                className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors duration-150 ease-in-out"
                                title="Edit Quotation"
                                disabled={loadingAction[quotation._id]}
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleSendQuotation(quotation._id)}
                                className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors duration-150 ease-in-out"
                                title="Send Quotation"
                                disabled={loadingAction[quotation._id]}
                      >
                                {loadingAction[quotation._id] && confirmDialogProps.onConfirm?.toString().includes('handleSendQuotation') ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Send className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                  {quotation.status === 'sent' && (
                    <>
                      {quotation.advancePaymentStatus !== 'CONFIRMED' && (
                        <button
                          onClick={() => {
                                    setSelectedQuotationForPayment(quotation);
                            setShowPaymentModal(true);
                                    setPaymentError(''); // Clear previous payment errors
                          }}
                                className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors duration-150 ease-in-out"
                          title="Confirm Offline Payment"
                        >
                                <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                          <button
                                onClick={() => openConfirmDialog('Are you sure you want to mark this quotation as approved?', () => handleApproveQuotation(quotation._id))}
                                className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors duration-150 ease-in-out"
                            title="Approve Quotation"
                                disabled={loadingAction[quotation._id] || quotation.advancePaymentStatus === 'CONFIRMED'}
                          >
                                <Check className="w-4 h-4" />
                          </button>
                          <button
                                onClick={() => openConfirmDialog('Are you sure you want to close this quotation? This usually means the lead did not accept it.', () => handleCloseQuotation(quotation._id))}
                                className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors duration-150 ease-in-out"
                            title="Close Quotation"
                                disabled={loadingAction[quotation._id]}
                          >
                                <X className="w-4 h-4" />
                          </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
                ))
            )}
        </tbody>
      </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="px-6 py-3 border-t border-fourth bg-tertiary flex items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm">
          <div className="text-sm text-gray-600">
            Showing {Math.min(startIndex + 1, filteredQuotations.length)} to {Math.min(endIndex, filteredQuotations.length)} of {filteredQuotations.length} results
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
              className="p-2 border border-fourth rounded-md text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fourth transition-colors duration-150 ease-in-out"
          >
              <ChevronLeft className="w-4 h-4" />
          </button>
            <span className="text-sm text-gray-600"> 
              Page {currentPage} of {totalPages}
            </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
              className="p-2 border border-fourth rounded-md text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fourth transition-colors duration-150 ease-in-out"
          >
              <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}
      {/* Success Toast */} 
      {successToast.show && (
        <div className="fixed bottom-5 right-5 bg-primary text-tertiary px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out z-[101] transform translate-y-0 opacity-100">
          {successToast.message}
        </div>
      )}
    </div>
  );
} 