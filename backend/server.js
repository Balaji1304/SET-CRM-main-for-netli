require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { initWebSocket } = require('./utils/websocket');
const { securityHeaders, authLimiter, apiLimiter, sanitizeInput } = require('./middleware/security');

// Refuse to start without a JWT secret: tokens would otherwise be unverifiable or forgeable
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters long');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Behind Render's proxy: needed so rate limiting sees the real client IP
app.set('trust proxy', 1);
app.use(securityHeaders);

// Development debugging middleware - only active in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Special route for Razorpay webhooks that needs raw body
app.post('/api/payments/webhook', 
  express.raw({ type: 'application/json' }), 
  require('./controllers/quotation').handleRazorpayWebhook
);

// Get allowed origins from environment variables
const getAllowedOrigins = () => {
  const origins = [];
  
  // Add the main frontend URL
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // In development, allow localhost:3000
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
  }
  
  // Always add production URLs
  origins.push('https://blackenginecrm.netlify.app');
  origins.push('https://set-crm.netlify.app');
  origins.push('https://set-crm-main-for-netli.netlify.app');
  
  return [...new Set(origins)]; // Remove duplicates
};

// CORS Configuration with optimized settings
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'X-Requested-With'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

// Pre-flight requests
app.options('*', cors());

// Middleware - JSON parsing. Keep the raw bytes so webhook signatures (WhatsApp) can be verified.
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Strip MongoDB operators ($ne, $gt, ...) from user input
app.use(sanitizeInput);

// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'solar-crm'
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB Connection Error:', err.message);
  process.exit(1);
});

// Routes
app.use('/api/auth', require('./routes/auth.js'));
app.use('/api/users/manage', require('./routes/userManagement.js'));
app.use('/api/customers', require('./routes/customers.js'));
app.use('/api/leads', require('./routes/leads.js'));
app.use('/api/enquiries', require('./routes/enquiries.js'));
app.use('/api/products', require('./routes/products.js'));
app.use('/api/bundles', require('./routes/productBundle.js'));
app.use('/api/solar-bundle-items', require('./routes/solarBundleItem.js'));
app.use('/api/customized-products', require('./routes/customizedProducts.js'));
app.use('/api/quotations', require('./routes/quotation.js'));
app.use('/api/payments', require('./routes/paymentRoutes.js'));
app.use('/api/tickets', require('./routes/tickets.js'));
app.use('/api/notifications', require('./routes/notifications.js'));
app.use('/api/invoices', require('./routes/invoices.js'));
app.use('/api/whatsapp', require('./routes/whatsapp.js'));
app.use('/api/whatsapp-test', require('./routes/whatsappTest.js'));
app.use('/api/whatsapp', require('./routes/whatsappWebhook.js'));
app.use('/api/tracking', require('./routes/orderTracking.js'));
app.use('/api/installations', require('./routes/installations.js'));
app.use(
  '/api/customer-purchases',
  require('./routes/customerPurchaseRoutes.js')
);
app.use('/api/reports/sales', require('./routes/salesReports.js'));
app.use('/api/reports/service', require('./routes/serviceReports.js'));

// Route for dashboard summary
const dashboardRoutes = require('./routes/dashboardRoutes.js');
app.use('/api/dashboard', dashboardRoutes);

const packageRoutes = require('./routes/packageRoutes.js');
app.use('/api/packages', packageRoutes);

// Central error handler: client errors (4xx) keep their message, server errors are hidden in production
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  if (err.name === 'MulterError') statusCode = 400; // e.g. file too large
  const message = statusCode < 500 || process.env.NODE_ENV === 'development'
    ? err.message
    : 'Internal Server Error';
  if (statusCode >= 500) console.error('Unhandled error:', err);
  res.status(statusCode).json({ success: false, message });
});

// Initialize WebSocket
initWebSocket(server);

// Initialize WhatsApp Token Manager
const tokenManager = require('./utils/whatsappTokenManager');
if (process.env.WHATSAPP_ACCESS_TOKEN) {
  tokenManager.setupAutoRefresh();
  console.log('WhatsApp Token Manager initialized with auto-refresh');
}

// Initialize reminder scheduler (lead follow-ups, payment overdue checks)
const reminderScheduler = require('./utils/reminderScheduler');
reminderScheduler.startReminderScheduler();
console.log('Reminder scheduler initialized (follow-ups every 6h, overdue checks every 6h)');

// Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV})`);
});
