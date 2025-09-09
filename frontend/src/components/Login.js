import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2, Users, Building2 } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Custom styles for better mobile experience
const customStyles = `
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
  
  @media (max-width: 640px) {
    .touch-target {
      min-height: 48px;
      padding: 12px 16px;
    }
    
    /* Better spacing for mobile forms */
    .mobile-form-spacing {
      padding: 16px;
    }
    
    /* Responsive text handling */
    .mobile-title {
      font-size: 24px !important;
      line-height: 1.3 !important;
    }
    
    .mobile-subtitle {
      font-size: 14px !important;
      line-height: 1.4 !important;
    }
    
    /* Enhanced input fields for mobile */
    .mobile-input {
      font-size: 16px !important; /* Prevents zoom on iOS */
      padding: 12px 16px !important;
      min-height: 48px !important;
    }
    
    /* Better error message display */
    .mobile-error {
      padding: 12px 16px !important;
      font-size: 14px !important;
    }
    
    /* Optimized button sizing */
    .mobile-button {
      min-height: 48px !important;
      font-size: 16px !important;
      padding: 12px 24px !important;
    }
  }
  
  @media (max-width: 375px) {
    /* Extra small screens like iPhone SE */
    .mobile-form-spacing {
      padding: 12px;
    }
    
    .mobile-title {
      font-size: 20px !important;
    }
    
    .mobile-subtitle {
      font-size: 13px !important;
    }
  }
`;

const formSchema = z.object({
  email: z.string().min(1, "Please enter your email address or phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const returnUrl = queryParams.get('returnUrl') || '/dashboard';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Clear error when user starts typing
  const handleInputChange = () => {
    if (error) {
      setError('');
    }
  };

  const onSubmit = async (values) => {
    setError('');
    setIsLoading(true);
    
    try {
      const success = await login(values.email, values.password);
      if (success) {
        // Check if there's a pending payment verification
        const pendingVerification = sessionStorage.getItem('pendingPaymentVerification');
        
        if (pendingVerification && returnUrl.includes('payment-success')) {
          // Clear the session storage
          sessionStorage.removeItem('pendingPaymentVerification');
          // Navigate to the payment success page
          navigate(returnUrl);
        } else {
          // Navigate to the default return URL
          navigate(returnUrl);
        }
      } else {
        setError('Invalid credentials. Please check your email/phone number and password and try again.');
      }
    } catch (err) {
      // Create user-friendly error messages based on the backend response
      const errorMessage = err.message || 'An error occurred during login';
      
      let userFriendlyMessage;
      
      if (errorMessage.includes('Invalid credentials')) {
        userFriendlyMessage = 'Invalid credentials. Please check your email/phone number and password and try again.';
      } else if (errorMessage.includes('Please provide an email and password')) {
        userFriendlyMessage = 'Please enter both username and password to continue.';
      } else if (errorMessage.includes('Server Error') || errorMessage.includes('500')) {
        userFriendlyMessage = 'Our servers are currently experiencing issues. Please try again in a few moments.';
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        userFriendlyMessage = 'Unable to connect to our servers. Please check your internet connection and try again.';
      } else if (errorMessage.includes('User already exists')) {
        userFriendlyMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (errorMessage.includes('HTTP 401')) {
        userFriendlyMessage = 'Invalid credentials. Please check your email/phone number and password and try again.';
      } else if (errorMessage.includes('HTTP 400')) {
        userFriendlyMessage = 'Please check your input and try again.';
      } else if (errorMessage.includes('HTTP 404')) {
        userFriendlyMessage = 'Login service is currently unavailable. Please try again later.';
      } else if (errorMessage.includes('HTTP 429')) {
        userFriendlyMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        userFriendlyMessage = 'Request timed out. Please check your connection and try again.';
      } else {
        // For any other errors, show a generic but friendly message
        userFriendlyMessage = 'Unable to sign in at the moment. Please try again or contact support if the problem persists.';
      }
      
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Check for any pending operations that require authentication
  useEffect(() => {
    const pendingVerification = sessionStorage.getItem('pendingPaymentVerification');
    if (pendingVerification) {
      setError('Please login to complete your payment verification');
    }
  }, []);

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex min-h-screen bg-gray-50">
        {/* Left side - Preview Section */}
        <div className="relative hidden lg:flex lg:w-1/2">
          <img
            src={require('../assets/images/login-bg.png')}
            alt="Dashboard Preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/90 to-orange-800/90" />
          <div className="relative z-10 flex h-full flex-col justify-center p-6 sm:p-8 lg:p-12">
            <div className="max-w-lg">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white mb-4">
                Sunlit CRM System
              </h1>
              <p className="text-lg lg:text-xl text-white/90 mb-6">
                Manage your solar business efficiently with our comprehensive CRM solution
              </p>
              <div className="flex items-center space-x-4 text-white/80">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm">Business Management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm">Customer Relations</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex w-full flex-col items-center justify-center lg:w-1/2">
          <div className="w-full max-w-md mobile-form-spacing px-4 sm:px-6 lg:px-8">
            {/* Header Section */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white p-3 rounded-full shadow-lg">
                  <img 
                    src={process.env.REACT_APP_COMPANY_LOGO_URL} 
                    alt="Sunlit CRM Logo" 
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                    onError={(e) => {
                      // Fallback to Building2 icon if logo fails to load
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 hidden" />
                </div>
              </div>
              <h2 className="mobile-title text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Welcome to Sunlit CRM
              </h2>
              <p className="mobile-subtitle mt-2 text-sm sm:text-base text-gray-600">
                Sign in to access your dashboard
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Error Message */}
              {error && (
                <div className="mobile-error p-3 sm:p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block">Login Failed</span>
                    <p className="mt-1 text-xs sm:text-sm break-words">{error}</p>
                  </div>
                </div>
              )}
              
              {/* Email/Phone Input */}
              <div className="space-y-2">
                <label className="block text-sm sm:text-base font-medium text-gray-700">
                  Email Address / Phone Number
                </label>
                <input
                  {...form.register("email")}
                  type="text"
                  placeholder="Enter your email or phone number"
                  onChange={(e) => {
                    form.setValue("email", e.target.value);
                    handleInputChange();
                  }}
                  className="mobile-input w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-150 text-sm sm:text-base bg-white touch-target"
                />
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>Staff: Use email address | Customers: Use phone number</span>
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{form.formState.errors.email.message}</span>
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm sm:text-base font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...form.register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    onChange={(e) => {
                      form.setValue("password", e.target.value);
                      handleInputChange();
                    }}
                    className="mobile-input w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-150 text-sm sm:text-base bg-white touch-target"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 sm:px-4 py-2 sm:py-3 touch-target flex items-center justify-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{form.formState.errors.password.message}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mobile-button w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center font-medium text-sm sm:text-base touch-target shadow-md hover:shadow-lg transform transition-transform duration-150 hover:scale-[1.02] disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-xs sm:text-sm text-gray-500">
                Secure login powered by Sunlit CRM
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login; 