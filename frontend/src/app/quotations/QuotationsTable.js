import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Edit2, FileText, Send, Check, X, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Phone, Mail, Building2, Calendar, User, IndianRupee } from 'lucide-react';
import { 
  getQuotations, 
  sendQuotation, 
  approveQuotation, 
  closeQuotation, 
  confirmOfflinePayment 
} from '../../services/quotationService';
import { getSalespersons } from '../../services/enquiryService';
import { useAuth } from '../../context/AuthContext';

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
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  if (!showModal || !selectedQuotation) return null;

  const advancePercentage = selectedQuotation.advancePaymentPercentage || 20;
  const minimumAdvance = selectedQuotation.total * (advancePercentage / 100) || 0;

  const internalHandleSubmit = () => {
    onSetPaymentError(''); 
    if (!selectedQuotation._id) {
      onSetPaymentError('No quotation selected');
      return;
    }
    // Check required fields - transactionNo is optional for cash payments
    const isTransactionRequired = paymentDetails.paymentMethod !== 'cash';
    if (!paymentDetails.amount || !paymentDetails.paymentDate || (isTransactionRequired && !paymentDetails.transactionNo)) {
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

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg lg:max-w-xl transform transition-all duration-300 ease-out max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Confirm Payment</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Quotation: {selectedQuotation.quotationNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors duration-150 touch-target"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500"/>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-5 sm:space-y-6">
            {/* Quotation Summary */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Total Amount</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    ₹{selectedQuotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">Required: {advancePercentage}%</p>
                  <p className="text-sm font-semibold text-primary">
                    ₹{minimumAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {selectedQuotation.quotationItems && selectedQuotation.quotationItems.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-primary/20">
                  <p className="text-xs text-gray-600">
                    {selectedQuotation.quotationItems.length} product{selectedQuotation.quotationItems.length !== 1 ? 's' : ''} • {selectedQuotation.lead ? `${selectedQuotation.lead.firstName} ${selectedQuotation.lead.lastName}` : 'Customer'}
                  </p>
                </div>
              )}
            </div>
            
            {/* Payment Form */}
            <div className="space-y-4 sm:space-y-5">
              {/* Amount Input */}
              <div>
                <label htmlFor="paymentAmount" className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                  <input
                    id="paymentAmount"
                    type="text"
                    inputMode="decimal"
                    value={paymentDetails.amount}
                    onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, amount: e.target.value }))}
                    className={`w-full pl-8 pr-4 py-3 sm:py-3.5 border rounded-xl focus:ring-2 focus:border-primary transition-all duration-200 text-sm sm:text-base font-medium placeholder-gray-400 ${paymentError && !paymentDetails.amount ? 'border-red-400 ring-2 ring-red-100 bg-red-50/50' : 'border-gray-300 focus:ring-primary/20 bg-gray-50/50'}`}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Payment Method and Transaction Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label htmlFor="paymentMethod" className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="paymentMethod"
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-3 sm:py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-all duration-200 text-sm sm:text-base bg-gray-50/50 font-medium"
                    required
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="check">📝 Check</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="paymentDate" className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="paymentDate"
                    type="date"
                    value={paymentDetails.paymentDate}
                    onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full px-3 py-3 sm:py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-sm sm:text-base bg-gray-50/50 font-medium"
                    required
                  />
                </div>
              </div>
              
              {/* Transaction Reference */}
              <div>
                <label htmlFor="transactionNo" className="block text-sm font-semibold text-gray-700 mb-2">
                  Transaction Reference {paymentDetails.paymentMethod !== 'cash' && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="transactionNo"
                  type="text"
                  value={paymentDetails.transactionNo}
                  onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, transactionNo: e.target.value }))}
                  className={`w-full px-4 py-3 sm:py-3.5 border rounded-xl focus:ring-2 focus:border-primary transition-all duration-200 text-sm sm:text-base font-medium placeholder-gray-400 ${paymentError && !paymentDetails.transactionNo && paymentDetails.paymentMethod !== 'cash' ? 'border-red-400 ring-2 ring-red-100 bg-red-50/50' : 'border-gray-300 focus:ring-primary/20 bg-gray-50/50'}`}
                  placeholder={paymentDetails.paymentMethod === 'cash' ? 'Optional for cash payments' : 'Enter transaction number or reference'}
                  required={paymentDetails.paymentMethod !== 'cash'}
                />
              </div>
              
              {/* Notes */}
              <div>
                <label htmlFor="paymentNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  id="paymentNotes"
                  value={paymentDetails.notes}
                  onChange={(e) => onPaymentDetailsChange(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-sm sm:text-base placeholder-gray-400 bg-gray-50/50 resize-none"
                  placeholder="Any additional payment details or notes..."
                />
              </div>
            </div>
            
            {/* Error Message */}
            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                      <X className="w-3 h-3 text-red-600" />
                    </div>
                  </div>
                  <p className="text-sm text-red-700 font-medium">{paymentError}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 bg-gray-50/50 p-4 sm:p-6">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              type="button"
              className="w-full sm:w-auto px-5 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors duration-150 touch-target"
            >
              Cancel
            </button>
            <button
              onClick={internalHandleSubmit}
              type="button"
              className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all duration-150 flex items-center justify-center min-w-[140px] touch-target shadow-lg hover:shadow-xl"
            >
              <IndianRupee className="w-4 h-4 mr-2" />
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function QuotationsTable({ 
  searchTerm, 
  statusFilter, 
  sortOrder = 'newest',
  paymentStatusFilter = '',
  amountFilter = '',
  creatorFilter = '',
  expiryFilter = '',
  paymentMethodFilter = ''
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [loadingActionType, setLoadingActionType] = useState({}); // Tracks which specific action is loading for each quotation
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogProps, setConfirmDialogProps] = useState({ message: '', onConfirm: null });
  const [actionInProgress, setActionInProgress] = useState(false); // For modal confirm button
  const [paymentError, setPaymentError] = useState(''); // Specifically for payment modal
  const [successToast, setSuccessToast] = useState({ show: false, message: '' });
  const [salesPersons, setSalesPersons] = useState([]); // For creator filter options

  const isSalesHead = user?.role === 'sales_head' || user?.role === 'marketing_coordinator';


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

  const fetchSalesPersonsCallback = useCallback(async () => {
    try {
      const response = await getSalespersons();
      if (response.success) {
        setSalesPersons(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch sales persons:', err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchQuotationsCallback();
    if (isSalesHead) {
      fetchSalesPersonsCallback();
    }
  }, [navigate, fetchQuotationsCallback, fetchSalesPersonsCallback, isSalesHead]);

  // Sort quotations based on sortOrder prop
  const sortedQuotations = useMemo(() => {
    if (!quotations || quotations.length === 0) return [];
    
    const sorted = [...quotations].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      const validUntilA = new Date(a.validUntil);
      const validUntilB = new Date(b.validUntil);
      
      switch (sortOrder) {
        case 'oldest':
          return dateA - dateB;
        case 'amount_high':
          return (b.total || 0) - (a.total || 0);
        case 'amount_low':
          return (a.total || 0) - (b.total || 0);
        case 'expiry_soon':
          return validUntilA - validUntilB;
        case 'expiry_later':
          return validUntilB - validUntilA;
        case 'newest':
        default:
          return dateB - dateA;
      }
    });
    
    return sorted;
  }, [quotations, sortOrder]);

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

  const handleAction = async (actionFn, quotationId, successMessage, updateLocalState, actionType) => {
    setLoadingAction(prev => ({ ...prev, [quotationId]: true }));
    setLoadingActionType(prev => ({ ...prev, [quotationId]: actionType }));
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
      setLoadingActionType(prev => ({ ...prev, [quotationId]: null }));
      setActionInProgress(false);
      setShowConfirmDialog(false);
    }
  };

  const handleSendQuotation = (id) => {
    openConfirmDialog(
      'Are you sure you want to send this quotation to the lead? This action cannot be undone.',
      () => handleAction(
        sendQuotation,
        id,
        'Quotation sent successfully!',
        (prev, data) => prev.map(q => q._id === id ? data : q),
        'send'
      )
    );
  };

  const handleApproveQuotation = (id) => {
    openConfirmDialog(
      'Confirm approval? This will lock the quotation and confirm payment.',
      () => handleAction(
        approveQuotation,
        id,
        'Quotation approved successfully!',
        (prev, data) => prev.map(q => q._id === id ? { ...q, status: 'approved', ...(data || {}) } : q),
        'approve'
      )
    );
  };

  const handleCloseQuotation = (id) => {
    openConfirmDialog(
      'Are you sure you want to close this quotation? This usually means the lead did not accept it.',
      () => handleAction(
        closeQuotation,
        id,
        'Quotation closed successfully!',
        (prev, data) => prev.map(q => q._id === id ? { ...q, status: 'closed', ...(data || {}) } : q),
        'close'
      )
    );
  };

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
      
      // Check for partial success (backend indicates success but with a message detailing a subsequent failure)
      if (response.success && response.message && 
          (response.message.toLowerCase().includes('fail') || 
           response.message.toLowerCase().includes('error') || 
           response.message.toLowerCase().includes('e11000'))) {
        // This is a partial success; payment recorded but approval or other steps failed.
        setPaymentError(response.message); // Show specific error in modal
        showToast(response.message); // Show a more informative toast (could be styled as warning/error)
        // Do not close modal, let user see the error.
        // Still refetch to show actual state if backend partially updated quotation.
        fetchQuotationsCallback(); 
      } else if (response.success) {
        // Full success; message will indicate next step (usually pending approval or already approved)
        showToast(response.message || 'Offline payment confirmed successfully.');
        handleClosePaymentModal();
        fetchQuotationsCallback(); 
      } else {
        // This is a clear failure from the backend.
        setPaymentError(response.message || 'Failed to confirm payment');
      }
    } catch (err) {
      // Network or other unexpected errors during the API call.
      setPaymentError(err.message || 'An error occurred during payment confirmation.');
      showToast(err.message || 'An error occurred during payment confirmation.');
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

  // Mobile Card Component
  const QuotationCard = ({ quotation }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {quotation.quotationNumber || 'N/A'}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{quotation.lead ? `${quotation.lead.firstName} ${quotation.lead.lastName}` : 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => navigate(`/dashboard/quotations/${quotation._id}`)}
            className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors duration-150 touch-target"
            title="View Quotation"
          >
            <FileText className="w-4 h-4" />
          </button>
          {quotation.status === 'draft' && (
            <>
              <button
                onClick={() => navigate(`/dashboard/quotations/${quotation._id}/edit`)}
                className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors duration-150 touch-target"
                title="Edit Quotation"
                disabled={loadingAction[quotation._id]}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSendQuotation(quotation._id)}
                className={`flex items-center justify-center p-2 rounded transition-colors duration-150 touch-target ${
                  loadingAction[quotation._id] && loadingActionType[quotation._id] === 'send' 
                    ? 'text-primary bg-primary/10 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                }`}
                title={loadingAction[quotation._id] && loadingActionType[quotation._id] === 'send' ? "Sending..." : "Send Quotation"}
                disabled={loadingAction[quotation._id]}
              >
                {loadingAction[quotation._id] && loadingActionType[quotation._id] === 'send' ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Send className="w-4 h-4" />}
              </button>
            </>
          )}
          {(quotation.status === 'sent' || quotation.status === 'pending_approval') && (
            <>
              {user?.role !== 'accounts_department' && quotation.advancePaymentStatus !== 'CONFIRMED' && !quotation.razorpayPaymentId && (
                <button
                  onClick={() => {
                    setSelectedQuotationForPayment(quotation);
                    setShowPaymentModal(true);
                    setPaymentError('');
                  }}
                  className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors duration-150 touch-target"
                  title="Confirm Offline Payment"
                >
                  <IndianRupee className="w-4 h-4" />
                </button>
              )}
              {user?.role === 'accounts_department' && quotation.status === 'pending_approval' && (
                <button
                  onClick={() => handleApproveQuotation(quotation._id)}
                  className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors duration-150 touch-target"
                  title="Approve Quotation"
                  disabled={loadingAction[quotation._id]}
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleCloseQuotation(quotation._id)}
                className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors duration-150 touch-target"
                title="Close Quotation"
                disabled={loadingAction[quotation._id]}
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Amount and Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Total Amount</span>
          <span className="text-lg font-bold text-gray-900 truncate ml-2">
            ₹{(quotation.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Status and Payment Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium truncate ${getStatusBadgeClass(quotation.status)}`}>
            {formatDisplayValue(quotation.status) || 'N/A'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment Status</p>
          <p className="text-sm text-gray-900 truncate">{formatDisplayValue(quotation.advancePaymentStatus) || 'N/A'}</p>
        </div>
      </div>

      {/* Valid Until and Items */}
      <div className={`grid ${isSalesHead ? 'grid-cols-1' : 'grid-cols-2'} gap-3 pt-3 border-t border-gray-100`}>
        {!isSalesHead && (
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Valid Until</p>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-GB') : 'N/A'}</span>
            </div>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Items</p>
          <p className="text-sm text-gray-900 truncate">
            {quotation.quotationItems ? `${quotation.quotationItems.length} item${quotation.quotationItems.length !== 1 ? 's' : ''}` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Sales Head Additional Info */}
      {isSalesHead && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Valid Until</p>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-GB') : 'N/A'}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created By</p>
            <p className="text-sm text-gray-900 truncate" title={quotation.createdBy?.name || 'Unknown'}>
              {quotation.createdBy?.name || 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const filteredQuotations = sortedQuotations.filter(quotation => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      (quotation.quotationNumber && quotation.quotationNumber.toLowerCase().includes(searchTermLower)) ||
      (quotation.lead?.firstName && quotation.lead.firstName.toLowerCase().includes(searchTermLower)) ||
      (quotation.lead?.lastName && quotation.lead.lastName.toLowerCase().includes(searchTermLower));
    
    const matchesStatus = statusFilter === '' || quotation.status === statusFilter;
    
    // Payment status filter
    const matchesPaymentStatus = paymentStatusFilter === '' || quotation.advancePaymentStatus === paymentStatusFilter;
    
    // Amount range filter
    let matchesAmount = true;
    if (amountFilter && amountFilter !== '') {
      const amount = quotation.total || 0;
      if (amountFilter === '0-10000') {
        matchesAmount = amount >= 0 && amount <= 10000;
      } else if (amountFilter === '10000-50000') {
        matchesAmount = amount > 10000 && amount <= 50000;
      } else if (amountFilter === '50000-100000') {
        matchesAmount = amount > 50000 && amount <= 100000;
      } else if (amountFilter === '100000-500000') {
        matchesAmount = amount > 100000 && amount <= 500000;
      } else if (amountFilter === '500000+') {
        matchesAmount = amount > 500000;
      }
    }
    
    // Creator filter (only for sales head)
    let matchesCreator = true;
    if (isSalesHead && creatorFilter && creatorFilter !== '') {
      if (creatorFilter === 'others') {
        matchesCreator = quotation.createdBy?._id !== user?.id && quotation.createdBy !== user?.id;
      } else {
        // Check if it's a specific sales person ID
        matchesCreator = quotation.createdBy?._id === creatorFilter || quotation.createdBy === creatorFilter;
      }
    }
    
    // Expiry status filter
    let matchesExpiry = true;
    if (expiryFilter && expiryFilter !== '') {
      const now = new Date();
      const validUntil = new Date(quotation.validUntil);
      const daysUntilExpiry = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));
      
      if (expiryFilter === 'active') {
        matchesExpiry = validUntil > now;
      } else if (expiryFilter === 'expired') {
        matchesExpiry = validUntil <= now;
      } else if (expiryFilter === 'expiring_soon') {
        matchesExpiry = validUntil > now && daysUntilExpiry <= 7;
      }
    }
    
    // Payment method filter
    const matchesPaymentMethod = paymentMethodFilter === '' || quotation.paymentMethod === paymentMethodFilter;
    
    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesAmount && matchesCreator && matchesExpiry && matchesPaymentMethod;
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
          className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity touch-target"
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
      
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
        <div className="overflow-x-auto flex-1 relative">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-fourth">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {[
                    { key: 'quotationNumber', label: 'Quotation #', width: 'w-32 lg:w-40' },
                    { key: 'leadName', label: 'Lead Name', width: 'w-32 lg:w-40' },
                    { key: 'totalAmount', label: 'Total Amount', width: 'w-28 lg:w-32' },
                    { key: 'status', label: 'Status', width: 'w-24 lg:w-28' },
                    { key: 'paymentStatus', label: 'Payment Status', width: 'w-32 lg:w-36', hideOnLg: true },
                    { key: 'validUntil', label: 'Valid Until', width: 'w-28 lg:w-32', hideOnXl: true },
                    { key: 'items', label: 'Items', width: 'w-20 lg:w-24', hideOnXl: true },
                    ...(isSalesHead ? [{ key: 'createdBy', label: 'Created By', width: 'w-28 lg:w-32', hideOnXl: true }] : []),
                    { key: 'actions', label: 'Actions', width: 'w-24 lg:w-32' }
                  ].map((header) => (
                    <th
                      key={header.key}
                      scope="col"
                      className={`px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider ${header.width} 
                        ${header.hideOnLg ? 'hidden lg:table-cell' : ''} 
                        ${header.hideOnXl ? 'hidden xl:table-cell' : ''}`}
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-tertiary divide-y divide-fourth">
                {currentQuotations.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={isSalesHead ? 9 : 8} className="px-6 py-12 text-center text-secondary">
                      No quotations found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  currentQuotations.map((quotation) => (
                    <tr key={quotation._id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                      <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm font-medium text-secondary w-32 lg:w-40">
                        <div className="truncate">{quotation.quotationNumber || 'N/A'}</div>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-32 lg:w-40">
                        <div className="truncate">
                          {quotation.lead ? `${quotation.lead.firstName} ${quotation.lead.lastName}` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28 lg:w-32">
                        <div className="truncate">
                          ₹{(quotation.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 xl:px-6 py-4 w-24 lg:w-28">
                        <span className={`inline-flex items-center px-1.5 lg:px-2 py-1 rounded-full text-xs font-medium truncate ${getStatusBadgeClass(quotation.status)}`}>
                          {formatDisplayValue(quotation.status) || 'N/A'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-32 lg:w-36">
                        <div className="truncate">
                          {formatDisplayValue(quotation.advancePaymentStatus) || 'N/A'}
                        </div>
                      </td>
                      <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28 lg:w-32">
                        <div className="truncate">
                          {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-GB') : 'N/A'}
                        </div>
                      </td>
                      <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-20 lg:w-24">
                        <div className="truncate">
                          {quotation.quotationItems ? `${quotation.quotationItems.length} item${quotation.quotationItems.length !== 1 ? 's' : ''}` : 'N/A'}
                        </div>
                      </td>
                      {isSalesHead && (
                        <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28 lg:w-32">
                          <div className="truncate" title={quotation.createdBy?.name || 'Unknown'}>
                            {quotation.createdBy?.name || 'N/A'}
                          </div>
                        </td>
                      )}
                      <td className="px-2 lg:px-4 xl:px-6 py-4 w-24 lg:w-32">
                        <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                          <button
                            onClick={() => navigate(`/dashboard/quotations/${quotation._id}`)}
                            className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                            title="View Quotation"
                          >
                            <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>
                          {quotation.status === 'draft' && (
                            <>
                              <button
                                onClick={() => navigate(`/dashboard/quotations/${quotation._id}/edit`)}
                                className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                                title="Edit Quotation"
                                disabled={loadingAction[quotation._id]}
                              >
                                <Edit2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                              </button>
                              <button
                                onClick={() => handleSendQuotation(quotation._id)}
                                className={`group flex items-center justify-center p-1.5 lg:p-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border ${
                                  loadingAction[quotation._id] && loadingActionType[quotation._id] === 'send'
                                    ? 'text-green-600 bg-green-50 border-green-200 cursor-not-allowed scale-100'
                                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50 border-transparent hover:border-green-200'
                                }`}
                                title={loadingAction[quotation._id] && loadingActionType[quotation._id] === 'send' ? "Sending..." : "Send Quotation"}
                                disabled={loadingAction[quotation._id]}
                              >
                                {loadingAction[quotation._id] && loadingActionType[quotation._id] === 'send' ? <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin text-green-600" /> : <Send className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                              </button>
                            </>
                          )}
                  {(quotation.status === 'sent' || quotation.status === 'pending_approval') && (
                            <>
                              {user?.role !== 'accounts_department' && quotation.advancePaymentStatus !== 'CONFIRMED' && (
                                <button
                                  onClick={() => {
                                    setSelectedQuotationForPayment(quotation);
                                    setShowPaymentModal(true);
                                    setPaymentError('');
                                  }}
                                  className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-green-200"
                                  title="Confirm Offline Payment"
                                >
                                  <IndianRupee className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                </button>
                              )}
                              {user?.role === 'accounts_department' && quotation.status === 'pending_approval' && (
                                <button
                                  onClick={() => handleApproveQuotation(quotation._id)}
                                  className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-green-200"
                                  title="Approve Quotation"
                                  disabled={loadingAction[quotation._id] || quotation.advancePaymentStatus !== 'CONFIRMED'}
                                >
                                  <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleCloseQuotation(quotation._id)}
                                className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-red-200"
                                title="Close Quotation"
                                disabled={loadingAction[quotation._id]}
                              >
                                <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
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
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {currentQuotations.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No quotations found matching your criteria.</p>
            </div>
          ) : (
            currentQuotations.map((quotation) => (
              <QuotationCard key={quotation._id} quotation={quotation} />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0">
          <div className="text-sm text-gray-600 order-2 sm:order-1">
            Showing {Math.min(startIndex + 1, filteredQuotations.length)} to {Math.min(endIndex, filteredQuotations.length)} of {filteredQuotations.length} results
          </div>
          <div className="flex items-center space-x-2 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 px-2"> 
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Success Toast */} 
      {successToast.show && (
        <div className="fixed bottom-5 right-5 bg-primary text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ease-in-out z-50">
          {successToast.message}
        </div>
      )}
    </div>
  );
} 