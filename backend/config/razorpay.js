const Razorpay = require('razorpay');

// Validate required environment variables
const requiredEnvVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Initialize Razorpay with required credentials
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Verify Razorpay connection
const verifyConnection = async () => {
  try {
    // Try to fetch a simple API endpoint to verify credentials
    await razorpayInstance.payments.all({ count: 1 });
    console.log('Razorpay connection verified successfully');
  } catch (error) {
    console.error('Razorpay connection verification failed:', error);
    throw new Error('Failed to verify Razorpay connection. Please check your credentials.');
  }
};

// Verify payment status directly from Razorpay API
const verifyPaymentStatus = async (paymentId) => {
  try {
    console.log(`Verifying payment status for payment ID: ${paymentId}`);
    
    if (!paymentId) {
      throw new Error('Payment ID is required for verification');
    }
    
    // Fetch payment details from Razorpay API
    const payment = await razorpayInstance.payments.fetch(paymentId);
    
    console.log('Payment verification result:', {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      captured: payment.captured
    });
    
    // Check payment status
    // Possible statuses: created, authorized, captured, refunded, failed
    const isSuccessful = payment.status === 'captured' || payment.status === 'authorized';
    
    return {
      verified: isSuccessful,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount / 100, // Convert from paise to INR
        currency: payment.currency,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        created_at: payment.created_at,
        captured: payment.captured
      }
    };
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw new Error(`Failed to verify payment: ${error.message}`);
  }
};

// Verify payment link status directly from Razorpay API
const verifyPaymentLinkStatus = async (paymentLinkId) => {
  try {
    console.log(`Verifying payment link status for ID: ${paymentLinkId}`);
    
    if (!paymentLinkId) {
      throw new Error('Payment Link ID is required for verification');
    }
    
    // Fetch payment link details from Razorpay API
    const paymentLink = await razorpayInstance.paymentLink.fetch(paymentLinkId);
    
    console.log('Payment link verification result:', {
      id: paymentLink.id,
      status: paymentLink.status,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      reference_id: paymentLink.reference_id,
      payments: paymentLink.payments ? paymentLink.payments.length : 0
    });
    
    // Check payment link status
    // Possible statuses: created, partially_paid, paid, cancelled, expired
    const isSuccessful = paymentLink.status === 'paid';
    
    return {
      verified: isSuccessful,
      paymentLink: {
        id: paymentLink.id,
        status: paymentLink.status,
        amount: paymentLink.amount / 100, // Convert from paise to INR
        currency: paymentLink.currency,
        description: paymentLink.description,
        reference_id: paymentLink.reference_id,
        payments: paymentLink.payments,
        created_at: paymentLink.created_at,
        customer: paymentLink.customer
      }
    };
  } catch (error) {
    console.error('Payment link verification failed:', error);
    throw new Error(`Failed to verify payment link: ${error.message}`);
  }
};

// Verify connection on startup
verifyConnection().catch(console.error);

// Export for backwards compatibility
module.exports = {
  instance: razorpayInstance,
  verifyPaymentStatus,
  verifyPaymentLinkStatus,
  // For backward compatibility with existing code
  payments: razorpayInstance.payments,
  customers: razorpayInstance.customers,
  orders: razorpayInstance.orders,
  invoices: razorpayInstance.invoices,
  paymentLink: razorpayInstance.paymentLink,
  refunds: razorpayInstance.refunds
}; 