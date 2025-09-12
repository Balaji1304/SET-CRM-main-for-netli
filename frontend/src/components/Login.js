import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2, Users, Building2, BarChart3, FileText, ShoppingCart, Zap } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Custom styles for enhanced desktop and mobile experience
const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  .modern-gradient {
    background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%);
  }
  
  .hero-text {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    letter-spacing: -0.025em;
  }
  
  .glass-effect {
    backdrop-filter: blur(16px);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* Desktop Enhancements */
  @media (min-width: 1024px) {
    .desktop-form-title {
      font-size: 1.875rem !important; /* Reduced from 2xl/3xl */
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
    }
    
    .desktop-form-subtitle {
      font-size: 0.875rem !important; /* Reduced size */
      font-family: 'Inter', sans-serif !important;
    }
    
    .desktop-input {
      font-size: 0.875rem !important; /* Smaller text */
      font-family: 'Inter', sans-serif !important;
    }
    
    .desktop-button {
      font-size: 0.875rem !important; /* Smaller button text */
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
    }
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
        {/* Left side - Enhanced Hero Section */}
        <div className="relative hidden lg:flex lg:w-3/5">
          <img
            src={require('../assets/images/login-bg-3.jpg')}
            alt="Solar Energy Solutions"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 modern-gradient" />
          
          <div className="relative z-10 flex h-full flex-col justify-center p-8 lg:p-16 xl:p-20">
            <div className="max-w-2xl">
              {/* Company Logo */}
              <div className="mb-6">
                <img
                  src={require('../assets/images/set-logo.png')}
                  alt="SET Company Logo"
                  className="h-12 w-auto lg:h-14 xl:h-16 object-contain filter brightness-0 invert"
                />
              </div>
              
              {/* Modern Badge */}
              <div className="inline-flex items-center glass-effect rounded-full px-4 py-2 mb-8">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-white/90 text-sm font-medium hero-text">
                  Next-Gen Solar CRM Platform
                </span>
              </div>
              
              {/* Main Heading */}
              <h1 className="hero-text text-5xl xl:text-6xl font-bold leading-tight text-white mb-6">
                Power Your
                <span className="block text-orange-400">Solar Business</span>
              </h1>
              
              {/* Subtitle */}
              <p className="hero-text text-xl xl:text-2xl text-white/80 mb-8 leading-relaxed">
                Streamline operations, boost sales, and deliver exceptional customer experiences with our intelligent CRM solution.
              </p>
              
              {/* Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="glass-effect rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="hero-text text-white font-semibold text-sm">Lead Management</h3>
                      <p className="hero-text text-white/70 text-xs">Track & convert leads</p>
                    </div>
                  </div>
                </div>
                <div className="glass-effect rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="hero-text text-white font-semibold text-sm">Quotation System</h3>
                      <p className="hero-text text-white/70 text-xs">Generate quotes instantly</p>
                    </div>
                  </div>
                </div>
                <div className="glass-effect rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="hero-text text-white font-semibold text-sm">Order Tracking</h3>
                      <p className="hero-text text-white/70 text-xs">Monitor installations</p>
                    </div>
                  </div>
                </div>
                <div className="glass-effect rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="hero-text text-white font-semibold text-sm">Sales Analytics</h3>
                      <p className="hero-text text-white/70 text-xs">Performance insights</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Compact Login Form */}
        <div className="flex w-full flex-col items-center justify-center lg:w-2/5 bg-white">
          <div className="w-full max-w-sm mobile-form-spacing px-6 lg:px-8">
            {/* Header Section - Reduced size */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white">
                  <img 
                    src={process.env.REACT_APP_COMPANY_LOGO_URL} 
                    alt="Sunlit CRM Logo" 
                    className="w-14 h-14 sm:w-14 sm:h-14 object-contain"
                    onError={(e) => {
                      // Fallback to Building2 icon if logo fails to load
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 hidden" />
                </div>
              </div>
              <h2 className="desktop-form-title mobile-title text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
                Welcome Back
              </h2>
              <p className="desktop-form-subtitle mobile-subtitle mt-1 text-xs sm:text-sm text-gray-500">
                Sign in to your account
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="mobile-error p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block text-xs">Login Failed</span>
                    <p className="mt-1 text-xs break-words">{error}</p>
                  </div>
                </div>
              )}
              
              {/* Email/Phone Input */}
              <div className="space-y-1.5">
                <label className="desktop-form-subtitle block text-xs font-medium text-gray-700">
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
                  className="desktop-input mobile-input w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-150 text-sm bg-white touch-target"
                />
                <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                  <Users className="w-3 h-3 flex-shrink-0" />
                  <span>Staff: Use email | Customers: Use phone</span>
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{form.formState.errors.email.message}</span>
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="desktop-form-subtitle block text-xs font-medium text-gray-700">
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
                    className="desktop-input mobile-input w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-150 text-sm bg-white touch-target"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 py-2.5 touch-target flex items-center justify-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{form.formState.errors.password.message}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="desktop-button mobile-button w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center font-medium text-sm touch-target shadow-sm hover:shadow-md transform transition-transform duration-150 hover:scale-[1.01] disabled:transform-none py-2.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Footer - Reduced size */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
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