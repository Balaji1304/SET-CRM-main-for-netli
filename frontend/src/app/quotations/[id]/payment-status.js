import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader } from 'lucide-react';

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
    
    if (!razorpayPaymentId || razorpayStatus === 'failed') {
      setStatus('error');
      setError('Payment failed or was cancelled. Please try again.');
      return;
    }
    
    // Call the backend to check payment status
    const checkPaymentStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://set-crm-main-for-netli.onrender.com'}/api/quotations/${id}/payment-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setPaymentDetails(data.data);
          setStatus(data.data.paymentStatus === 'CONFIRMED' ? 'success' : 'error');
        } else {
          setStatus('error');
          setError(data.message || 'Could not verify payment status');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setError('Failed to verify payment. Please contact support.');
      }
    };
    
    checkPaymentStatus();
  }, [id, location.search, navigate]);
  
  const handleContinue = () => {
    // Redirect to appropriate page based on user role
    // For customers, go to my payments
    // For admin/sales, go to quotation details
    const userRole = localStorage.getItem('userRole');
    
    if (userRole === 'customer') {
      navigate('/dashboard/payments');
    } else {
      navigate(`/dashboard/quotations/${id}`);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      {status === 'loading' && (
        <div className="flex flex-col items-center space-y-4">
          <Loader className="h-16 w-16 text-orange-500 animate-spin" />
          <h2 className="text-2xl font-bold">Verifying Payment...</h2>
          <p className="text-gray-500">Please wait while we confirm your payment.</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="flex flex-col items-center space-y-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold">Payment Successful!</h2>
          <p className="text-gray-500 max-w-md">
            Your payment of ₹{paymentDetails?.paymentAmount} has been confirmed. The quotation has been approved.
          </p>
          {paymentDetails?.quotationNumber && (
            <p className="text-sm">
              Quotation Number: <span className="font-semibold">{paymentDetails.quotationNumber}</span>
            </p>
          )}
          {paymentDetails?.paymentId && (
            <p className="text-sm">
              Payment ID: <span className="font-semibold">{paymentDetails.paymentId}</span>
            </p>
          )}
          <button
            onClick={handleContinue}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
          >
            Continue
          </button>
        </div>
      )}
      
      {status === 'error' && (
        <div className="flex flex-col items-center space-y-4 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500" />
          <h2 className="text-2xl font-bold">Payment Failed</h2>
          <p className="text-gray-500 max-w-md">
            {error || 'There was a problem with your payment. Please try again or contact support.'}
          </p>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate(`/dashboard/quotations/${id}`)}
              className="mt-4 px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50"
            >
              View Quotation
            </button>
            <button
              onClick={() => window.location.href = `/dashboard`}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 