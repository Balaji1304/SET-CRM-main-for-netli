const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_test_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_test_key_secret'
});

module.exports = razorpay; 