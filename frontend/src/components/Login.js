import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
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

  const onSubmit = async (values) => {
    setError('');
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
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
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
              Welcome to SunlitCRM
            </h2>
            <p className="text-sm text-muted-foreground">
              Let's sign you in
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <input
                {...form.register("email")}
                type="email"
                placeholder="Enter your email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
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
              className="w-full bg-orange-500 hover:bg-orange-600 text-white h-10 rounded-md"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 