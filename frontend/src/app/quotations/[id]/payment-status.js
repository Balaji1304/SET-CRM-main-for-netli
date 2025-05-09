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
    
    console.log('Payment status from Razorpay:', {
      razorpayPaymentId,
      razorpayStatus,
      allParams: Object.fromEntries([...params])
    });
    
    if (!razorpayPaymentId || razorpayStatus === 'failed') {
      setStatus('error');
      setError(`Payment failed or was cancelled. ${!razorpayPaymentId ? 'Missing payment ID.' : 'Payment status: ' + razorpayStatus}`);
      return;
    }
    
    // Call the backend to check payment status (no authentication required)
    const checkPaymentStatus = async () => {
      try {
        // Properly format the API URL to avoid protocol duplication
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://set-crm-main-for-netli.onrender.com';
        // Remove any trailing slashes from the base URL
        const cleanBaseUrl = apiBaseUrl.replace(/\/+$/, '');
        
        const apiUrl = `${cleanBaseUrl}/api/payments/public/payment-status?paymentId=${razorpayPaymentId}&quotationId=${id}`;
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
          setStatus('success');
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
      </div>
    </div>
  );
} 