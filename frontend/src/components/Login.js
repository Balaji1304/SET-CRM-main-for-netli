import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
    <div className="flex min-h-screen">
      {/* Left side - Preview Section */}
      <div className="relative hidden w-1/2 lg:block">
        <img
          src={require('../assets/images/login-bg.png')}
          alt="Dashboard Preview"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-zinc-950/40" />
        <div className="relative z-10 flex h-full flex-col justify-center p-12">
          <h1 className="text-5xl font-bold leading-tight text-white">
            Sunlit CRM System
          </h1>
          <p className="mt-4 text-xl text-white/80">
            Manage your solar business efficiently
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full flex-col items-center justify-center px-4 sm:px-6 lg:w-1/2 lg:px-8">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome to Sunlit CRM
            </h2>
            <p className="text-sm text-muted-foreground">
              Let's sign you in
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="font-medium">Login Failed</span>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address / Phone Number</label>
              <input
                {...form.register("email")}
                type="text"
                placeholder="Enter your email or phone number"
                onChange={(e) => {
                  form.setValue("email", e.target.value);
                  handleInputChange();
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500">Staff: Use email address | Customers: Use phone number</p>
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  {...form.register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  onChange={(e) => {
                    form.setValue("password", e.target.value);
                    handleInputChange();
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 py-2"
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
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white h-10 rounded-md transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 