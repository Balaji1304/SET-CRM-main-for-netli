import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, CreditCard, ArrowLeft, IndianRupee, Calendar, FileText, Loader2 } from 'lucide-react';
import { getPurchaseDetails, makePayment, createRazorpayPaymentLink, verifyRazorpayPayment, recordManualPayment } from '../../../services/customerService';

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
    
    /* Mobile form optimizations */
    .mobile-form-input {
      padding: 12px 16px !important;
      font-size: 16px !important; /* Prevents zoom on iOS */
    }
    
    .mobile-form-select {
      padding: 12px 16px !important;
      font-size: 16px !important;
    }
    
    .mobile-form-textarea {
      padding: 12px 16px !important;
      font-size: 16px !important;
      min-height: 100px !important;
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

// Helper function to validate transaction reference uniqueness
const validateTransactionReference = async (reference, paymentMethod) => {
  if (paymentMethod === 'cash' || !reference || !reference.trim()) {
    return { isValid: true };
  }

  try {
    const trimmedRef = reference.trim();
    
    // Basic validation - check for obviously problematic references
    if (trimmedRef.length < 3) {
      return { 
        isValid: false, 
        error: 'Transaction reference must be at least 3 characters long' 
      };
    }
    
    // Check for common duplicate patterns that users might accidentally use
    const commonDuplicatePatterns = ['cash', 'test', '123', 'temp', 'dummy', 'sample'];
    if (commonDuplicatePatterns.includes(trimmedRef.toLowerCase())) {
      return {
        isValid: false,
        error: 'Please use a unique transaction reference number (avoid generic terms like "test", "123", etc.)'
      };
    }
    
    // Check for patterns that look like placeholders
    if (/^[0-9]{1,3}$/.test(trimmedRef) || /^test.*$/i.test(trimmedRef)) {
      return {
        isValid: false,
        error: 'Please enter a real transaction reference number (not a placeholder or test value)'
      };
    }
    
    return { isValid: true };
  } catch (error) {
    console.error('Error validating transaction reference:', error);
    return { 
      isValid: false, 
      error: 'Unable to validate transaction reference. Please try again.' 
    };
  }
};

export default function RemainingPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const purchaseId = searchParams.get('purchase');
  
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [processingOnlinePayment, setProcessingOnlinePayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amountPaid: '',
    paymentMethod: 'bank_transfer',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    if (purchaseId) {
      fetchPurchaseDetails();
    } else {
      setError('Purchase ID is required');
      setLoading(false);
    }
  }, [purchaseId]);

  // Check if this is a return from Razorpay payment
  useEffect(() => {
    const paymentLinkId = searchParams.get('razorpay_payment_link_id');
    const paymentLinkStatus = searchParams.get('razorpay_payment_link_status');
    const paymentLinkReferenceId = searchParams.get('razorpay_payment_link_reference_id');

    // If we have a payment link ID and status, verify the payment
    if (purchaseId && paymentLinkId && paymentLinkStatus === 'paid') {
      verifyPayment(paymentLinkId);
    }
  }, [searchParams, purchaseId]);

  const verifyPayment = async (paymentLinkId) => {
    try {
      setLoading(true);
      const response = await verifyRazorpayPayment(purchaseId, paymentLinkId);
      
      if (response.success && response.data.verified) {
        setSuccess(true);
      } else {
        throw new Error(response.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseDetails = async () => {
    try {
      const response = await getPurchaseDetails(purchaseId);
      
      if (response.success) {
        setPurchase(response.data.purchase);
        // Pre-populate the payment amount with the remaining amount
        setPaymentData(prev => ({
          ...prev,
          amountPaid: response.data.purchase.remainingAmount.toFixed(2)
        }));
      } else {
        throw new Error(response.message || 'Failed to fetch purchase details');
      }
    } catch (error) {
      console.error('Error fetching purchase details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => {
      // Clear transaction ID when payment method is cash to avoid duplicate issues
      if (name === 'paymentMethod' && value === 'cash') {
        return {
          ...prev,
          [name]: value,
          transactionId: '' // Clear transaction ID for cash payments
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate transaction reference for non-cash payments
    if (paymentData.paymentMethod !== 'cash' && !paymentData.transactionId.trim()) {
      setError('Transaction reference is required for non-cash payments');
      return;
    }
    
    // Validate transaction reference uniqueness for non-cash payments
    if (paymentData.paymentMethod !== 'cash') {
      const validation = await validateTransactionReference(paymentData.transactionId, paymentData.paymentMethod);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid transaction reference');
        return;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await recordManualPayment(purchaseId, {
        amount: parseFloat(paymentData.amountPaid),
        paymentMethod: paymentData.paymentMethod,
        reference: paymentData.paymentMethod === 'cash' ? null : paymentData.transactionId, // Don't send reference for cash
        paymentDate: new Date().toISOString().split('T')[0],
        notes: paymentData.notes
      });
      
      if (response.success) {
        // Show success toast notification
        if (window.showToast) {
          window.showToast('Manual payment recorded and pending verification by Accounts.', 'success', 5000);
        }
        
        // Redirect to My Orders page after a short delay
        setTimeout(() => {
          navigate('/dashboard/my-products');
        }, 1500);
      } else {
        throw new Error(response.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Handle duplicate transaction ID error specifically
      let errorMessage;
      if (error.message.includes('duplicate') || 
          error.message.includes('E11000') || 
          error.message.includes('already used') ||
          error.message.includes('This reference number is already used')) {
        errorMessage = 'This transaction reference number is already used. Please enter a unique reference number.';
      } else {
        errorMessage = error.message;
      }
      
      // Show error toast notification
      if (window.showToast) {
        window.showToast(errorMessage, 'error', 7000);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    try {
      setProcessingOnlinePayment(true);
      setError(null);
      
      const response = await createRazorpayPaymentLink(purchaseId);
      
      if (response.success && response.data.paymentLink) {
        // Redirect to Razorpay payment page
        window.location.href = response.data.paymentLink;
      } else {
        throw new Error(response.message || 'Failed to create payment link');
      }
    } catch (error) {
      console.error('Online payment error:', error);
      
      // Provide more user-friendly error messages based on error types
      let errorMessage = 'Failed to process payment request.';
      
      if (error.response) {
        // Handle specific API error responses
        const status = error.response.status;
        const responseData = error.response.data;
        
        if (status === 400) {
          // Check for Razorpay specific errors
          if (responseData.message && responseData.message.includes('Razorpay')) {
            errorMessage = responseData.message;
          } else {
            errorMessage = responseData.message || 'Invalid payment information provided.';
          }
        } else if (status === 403) {
          errorMessage = 'You are not authorized to make this payment.';
        } else if (status === 404) {
          errorMessage = 'The requested purchase record was not found.';
        } else if (status === 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else if (status === 503) {
          errorMessage = 'Payment service unavailable. Please try again later.';
        }
      } else if (error.request) {
        // Handle network errors
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        // If error has a message property, use it
        errorMessage = error.message;
        
        // Make Razorpay errors more user-friendly
        if (errorMessage.includes('reference_id')) {
          errorMessage = 'There was a technical issue with the payment system. Please try again or contact support.';
        }
      }
      
      setError(errorMessage);
      setProcessingOnlinePayment(false);
    }
  };

  if (loading) {
    return (
      <>
        <style>{customStyles}</style>
        <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] bg-tertiary p-4">
          <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-primary animate-spin mb-4" />
          <p className="text-sm sm:text-lg text-secondary">Loading payment details...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{customStyles}</style>
        <div className="flex flex-col h-full">
          <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] bg-tertiary text-center p-4">
            <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mb-4" />
            <p className="text-base sm:text-lg font-semibold text-red-600 mb-2">Payment Error</p>
            <p className="text-sm sm:text-base text-secondary mb-4 max-w-md">{error}</p>
            <button 
              onClick={() => navigate('/dashboard/my-products')}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 text-sm sm:text-base font-medium transition-colors duration-150 touch-target"
            >
              Go Back to My Products
            </button>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <style>{customStyles}</style>
        <div className="flex flex-col h-full">
          <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] bg-tertiary text-center p-4">
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 max-w-md w-full">
              <Check className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mb-4 mx-auto" />
              <h2 className="text-xl sm:text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">Your payment has been processed successfully.</p>
              <button 
                onClick={() => navigate('/dashboard/my-products')}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 font-medium transition-opacity duration-150 touch-target"
              >
                View My Products
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header Section - Page Title */}
        <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/dashboard/my-products')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150 touch-target flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">Make Payment</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 mobile-truncate">Complete your payment for order #{purchase?.quotationId?.quotationNumber}</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6 sm:space-y-8">
          {/* Order Summary Section */}
          <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 border-b border-fourth">
              <h3 className="text-lg sm:text-xl font-semibold text-secondary">Order Summary</h3>
            </div>
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="text-sm font-semibold text-gray-900">₹{purchase?.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm text-gray-600">Advance Paid:</span>
                  <span className="text-sm font-semibold text-gray-900">₹{purchase?.advancePaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Remaining Balance:</span>
                  <span className="text-lg font-bold text-primary">₹{purchase?.remainingAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Online Payment Option */}
          <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 bg-blue-50 border-b border-fourth">
              <h3 className="text-lg sm:text-xl font-semibold text-secondary">Pay Online (Recommended)</h3>
              <p className="text-sm text-gray-600 mt-1">Secure payment via Razorpay - Pay using Credit/Debit Card, Net Banking, UPI, and more</p>
            </div>
            <div className="p-4 md:p-6 flex justify-center">
              <button
                onClick={handleOnlinePayment}
                disabled={processingOnlinePayment}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors duration-150 touch-target min-w-[200px]"
              >
                {processingOnlinePayment ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
                <span className="text-sm">Pay ₹{purchase?.remainingAmount.toLocaleString('en-IN')} Online</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative bg-white px-4">
              <span className="text-sm text-gray-500 font-medium">OR</span>
            </div>
          </div>

          {/* Manual Payment Section */}
          <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 border-b border-fourth">
              <h3 className="text-lg sm:text-xl font-semibold text-secondary">Record Manual Payment</h3>
              <p className="text-sm text-gray-600 mt-1">If you've already made payment through bank transfer or other means, record those details below:</p>
            </div>

            <div className="p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      name="amountPaid"
                      value={paymentData.amountPaid}
                      onChange={handleChange}
                      className="pl-8 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-150 mobile-form-input"
                      required
                      min="1"
                      max={purchase?.remainingAmount}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter amount to pay (up to ₹{purchase?.remainingAmount.toLocaleString('en-IN')})</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="paymentMethod"
                    value={paymentData.paymentMethod}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-150 mobile-form-select appearance-none bg-white"
                    required
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Only show transaction reference field for non-cash payments */}
                {paymentData.paymentMethod !== 'cash' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Transaction Reference <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="transactionId"
                      value={paymentData.transactionId}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-150 mobile-form-input"
                      placeholder="e.g., UTR123456789012, CHQ001234, TXN567890 (must be unique)"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the actual transaction reference from your bank/payment method. Each reference must be unique.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={paymentData.notes}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-150 mobile-form-textarea resize-vertical"
                    placeholder="Any additional information about this payment"
                  />
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-primary text-white font-medium rounded-lg hover:opacity-90 flex items-center justify-center gap-2 transition-opacity duration-150 touch-target"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    ) : (
                      <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                    <span className="text-sm">Record Manual Payment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 