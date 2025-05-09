import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader, Mail } from 'lucide-react';

export default function PaymentStatusPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);
  
  useEffect(() => {
    // Get query params from the URL
    const params = new URLSearchParams(location.search);
    const razorpayPaymentId = params.get('razorpay_payment_id');
    const razorpayStatus = params.get('razorpay_status');
    const razorpayPaymentLinkId = params.get('razorpay_payment_link_id');
    const razorpaySignature = params.get('razorpay_signature');
    
    console.log('Payment status from Razorpay:', {
      razorpayPaymentId,
      razorpayStatus,
      razorpayPaymentLinkId,
      razorpaySignature,
      allParams: Object.fromEntries([...params])
    });
    
    if (!razorpayPaymentId) {
      setStatus('error');
      setError(`Payment failed or was cancelled. Missing payment ID.`);
      return;
    }

    // Call the backend to check payment status
    const checkPaymentStatus = async () => {
      try {
        // Always use a hardcoded domain without any protocol
        const apiDomain = 'set-crm-main-for-netli.onrender.com';
        
        // Construct URL with a single explicit protocol
        const apiUrl = `https://${apiDomain}/api/payments/public/payment-status?paymentId=${razorpayPaymentId}&quotationId=${id}`;
        console.log('Fetching payment status from:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET'
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Payment status response:', data);
        
        if (data.success) {
          setPaymentDetails(data.data);
          
          // Check if payment status is still PENDING but Razorpay reports success
          const paymentStatus = data.data.paymentStatus;
          if (paymentStatus === 'PENDING' && razorpayPaymentId && razorpayPaymentLinkId && razorpaySignature) {
            console.log('Payment reported as successful by Razorpay but still marked as PENDING in system. Confirming payment manually...');
            
            // Manually confirm the payment
            await confirmPayment(razorpayPaymentId, razorpayPaymentLinkId, razorpaySignature);
          } else if (paymentStatus === 'RAZORPAY_VERIFIED') {
            console.log('Payment verified by Razorpay API but not yet processed in system. Confirming payment...');
            
            // Manually confirm the payment based on Razorpay API verification
            await confirmPayment(razorpayPaymentId, razorpayPaymentLinkId, razorpaySignature);
          } else {
            setStatus(paymentStatus === 'CONFIRMED' ? 'success' : 'pending');
          }
        } else {
          setStatus('error');
          setError(data.message || 'Could not verify payment status');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setError(`Failed to verify payment: ${error.message}. Please contact support.`);
      }
    };
    
    // Function to manually confirm payment if webhook didn't process it
    const confirmPayment = async (paymentId, paymentLinkId, signature) => {
      try {
        const apiDomain = 'set-crm-main-for-netli.onrender.com';
        const confirmUrl = `https://${apiDomain}/api/payments/manual-confirm`;
        
        console.log('Manually confirming payment:', {
          quotationId: id,
          paymentId,
          paymentLinkId
        });
        
        const confirmResponse = await fetch(confirmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quotationId: id,
            paymentId,
            paymentLinkId,
            signature
          })
        });
        
        if (!confirmResponse.ok) {
          throw new Error(`Server returned ${confirmResponse.status}: ${confirmResponse.statusText}`);
        }
        
        const confirmData = await confirmResponse.json();
        console.log('Payment confirmation response:', confirmData);
        
        if (confirmData.success) {
          // Update status to success
          setStatus('success');
          setPaymentDetails(prevDetails => ({
            ...prevDetails,
            paymentStatus: 'CONFIRMED',
            quotationStatus: 'approved'
          }));
        } else {
          setStatus('error');
          setError(confirmData.message || 'Payment confirmation failed');
        }
      } catch (error) {
        console.error('Error confirming payment:', error);
        setStatus('error');
        setError(`Failed to confirm payment: ${error.message}. Please contact support.`);
      }
    };
    
    checkPaymentStatus();
  }, [id, location.search, navigate]);
  
  const goToLogin = () => {
    navigate('/login');
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <Loader className="h-16 w-16 text-orange-500 animate-spin" />
            <h2 className="text-2xl font-bold text-center">Verifying Payment...</h2>
            <p className="text-gray-500 text-center">Please wait while we confirm your payment.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center space-y-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="text-gray-600">
              Thank you for your payment. Your quotation has been approved.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 w-full">
              <div className="flex items-center space-x-3 mb-2">
                <Mail className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-blue-700">Check Your Email</h3>
              </div>
              <p className="text-blue-600 text-sm">
                We've sent your login credentials to your email address. 
                Please check your inbox to access your customer dashboard.
              </p>
            </div>
            
            {paymentDetails?.quotationNumber && (
              <p className="text-sm">
                Quotation Number: <span className="font-semibold">{paymentDetails.quotationNumber}</span>
              </p>
            )}
            
            <button
              onClick={goToLogin}
              className="mt-4 px-6 py-2 w-full bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
            >
              Go to Login
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500" />
            <h2 className="text-2xl font-bold">Payment Issue</h2>
            <p className="text-gray-600">
              {error || 'There was a problem verifying your payment. Please contact support.'}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2 w-full bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
            >
              Return to Homepage
            </button>
          </div>
        )}
        
        {status === 'pending' && (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="h-16 w-16 text-yellow-500 animate-pulse rounded-full bg-yellow-100 flex items-center justify-center">
              <Loader className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Payment Processing</h2>
            <p className="text-gray-600">
              Your payment is being processed. This usually takes a few moments.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 w-full">
              <div className="flex items-center space-x-3 mb-2">
                <Mail className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-blue-700">Please Wait</h3>
              </div>
              <p className="text-blue-600 text-sm">
                Once your payment is processed, your account will be created and credentials will be sent to your email.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 w-full bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
            >
              Check Status Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 