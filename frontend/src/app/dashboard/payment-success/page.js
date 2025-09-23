import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Loader, ArrowRight } from 'lucide-react';
import { verifyRazorpayPayment } from '../../../services/customerService';
import { getAuthHeaders } from '../../../services/apiConfig';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const [payment, setPayment] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    
    const purchaseId = searchParams.get('purchase');
    const paymentLinkId = searchParams.get('razorpay_payment_link_id');
    const paymentLinkStatus = searchParams.get('razorpay_payment_link_status');
    
    if (!purchaseId || !paymentLinkId) {
      setError('Missing payment information');
      setLoading(false);
      return;
    }
    
    // If user is not authenticated, redirect to login and preserve query parameters
    if (!token) {
      // Store payment verification data in session storage
      sessionStorage.setItem('pendingPaymentVerification', JSON.stringify({
        purchaseId,
        paymentLinkId,
        paymentLinkStatus
      }));
      
      // Redirect to login page with a return URL
      navigate('/login?returnUrl=/dashboard/payment-success');
      return;
    }
    
    // Verify the payment with our backend
    const verifyPayment = async () => {
      try {
        const response = await verifyRazorpayPayment(purchaseId, paymentLinkId);
        
        if (response.success && response.data.verified) {
          setSuccess(true);
          setPurchase(response.data.purchase);
          setPayment(response.data.payment);
        } else {
          throw new Error(response.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setError(error.message || 'Failed to verify payment');
      } finally {
        setLoading(false);
      }
    };
    
    verifyPayment();
  }, [searchParams, navigate]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader className="h-12 w-12 animate-spin text-orange-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Verifying Your Payment</h2>
        <p className="text-gray-600">Please wait while we confirm your payment...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Payment Verification Failed</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/dashboard/payments')}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Go to Payments
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your payment has been processed and confirmed successfully.
        </p>
        
        {payment && (
          <div className="bg-gray-50 p-4 rounded mb-6 text-left">
            <h3 className="font-medium mb-2">Payment Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Amount Paid:</div>
              <div className="font-medium">₹{payment.amountPaid.toLocaleString('en-IN')}</div>
              
              <div className="text-gray-600">Payment Method:</div>
              <div className="font-medium">Razorpay</div>
              
              <div className="text-gray-600">Status:</div>
              <div className="font-medium text-green-600">Paid</div>
              
              <div className="text-gray-600">Payment Reference:</div>
              <div className="font-medium text-xs break-all">{payment.transactionId || 'N/A'}</div>
              
              {purchase && (
                <>
                  <div className="text-gray-600">Order ID:</div>
                  <div className="font-medium">#{purchase.purchaseID || 'N/A'}</div>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/dashboard/payments')}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            View All Payments
          </button>
          
          <button
            onClick={() => navigate('/dashboard/my-products')}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center justify-center gap-1"
          >
            View My Products
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 