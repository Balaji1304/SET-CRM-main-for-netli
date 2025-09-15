import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, CreditCard, ArrowLeft } from 'lucide-react';
import { getPurchaseDetails, makePayment, createRazorpayPaymentLink, verifyRazorpayPayment, recordManualPayment } from '../../../services/customerService';

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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-sm text-red-500">
        <AlertCircle className="h-12 w-12 mb-2" />
        <p className="text-lg font-medium">{error}</p>
        <button 
          onClick={() => navigate('/dashboard/my-products')}
          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-800"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-sm text-green-600">
        <Check className="h-16 w-16 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">Your payment has been processed successfully.</p>
        <button 
          onClick={() => navigate('/dashboard/my-products')}
          className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          View My Products
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/dashboard/my-products')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Make Payment</h2>
          <p className="text-muted-foreground mt-1">Complete your payment for order #{purchase?.quotationId?.quotationNumber}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6 p-4 bg-gray-50 rounded border">
          <h3 className="font-medium mb-2">Order Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Amount:</div>
            <div className="font-medium">₹{purchase?.totalAmount.toLocaleString('en-IN')}</div>
            
            <div>Advance Paid:</div>
            <div className="font-medium">₹{purchase?.advancePaid.toLocaleString('en-IN')}</div>
            
            <div>Remaining Balance:</div>
            <div className="font-medium text-orange-600">₹{purchase?.remainingAmount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Online Payment Option */}
        <div className="mb-6 border rounded-lg overflow-hidden">
          <div className="p-4 bg-blue-50 border-b">
            <h3 className="font-medium">Pay Online (Recommended)</h3>
            <p className="text-sm text-gray-600">Secure payment via Razorpay - Pay using Credit/Debit Card, Net Banking, UPI, and more</p>
          </div>
          <div className="p-4 flex justify-center">
            <button
              onClick={handleOnlinePayment}
              disabled={processingOnlinePayment}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              {processingOnlinePayment ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
              Pay ₹{purchase?.remainingAmount.toLocaleString('en-IN')} Online
            </button>
          </div>
        </div>

        <div className="my-6 text-center">
          <div className="inline-flex items-center justify-center w-full">
            <hr className="w-full border-t border-gray-200" />
            <span className="absolute px-3 bg-white text-sm text-gray-500">OR</span>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-medium mb-2">Record Manual Payment</h3>
          <p className="text-sm text-gray-600">If you've already made payment through bank transfer or other means, record those details below:</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5">₹</span>
              <input
                type="number"
                step="0.01"
                name="amountPaid"
                value={paymentData.amountPaid}
                onChange={handleChange}
                className="pl-7 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                min="1"
                max={purchase?.remainingAmount}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter amount to pay (up to ₹{purchase?.remainingAmount.toLocaleString('en-IN')})</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              name="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              <label className="block text-sm font-medium mb-1">
                Transaction Reference <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="transactionId"
                value={paymentData.transactionId}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., UTR123456789012, CHQ001234, TXN567890 (must be unique)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter the actual transaction reference from your bank/payment method. Each reference must be unique.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={paymentData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
              placeholder="Any additional information about this payment"
            />
          </div>

          <div className="border-t pt-6">
            <button
              type="submit"
              className="w-full py-3 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              ) : (
                <>Record Manual Payment</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 