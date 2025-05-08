const Razorpay = require('razorpay');

// Validate required environment variables
const requiredEnvVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Initialize Razorpay with required credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Verify Razorpay connection
const verifyConnection = async () => {
  try {
    // Try to fetch a simple API endpoint to verify credentials
    await razorpay.payments.all({ count: 1 });
    console.log('Razorpay connection verified successfully');
  } catch (error) {
    console.error('Razorpay connection verification failed:', error);
    throw new Error('Failed to verify Razorpay connection. Please check your credentials.');
  }
};

// Verify connection on startup
verifyConnection().catch(console.error);

module.exports = razorpay; 