require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { initWebSocket } = require('./utils/websocket');

const app = express();
const server = http.createServer(app);

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
  
  // Add production URLs
  if (process.env.NODE_ENV === 'production') {
    origins.push('https://blackenginecrm.netlify.app');
    origins.push('https://set-crm.netlify.app');
    origins.push('https://set-crm-main-for-netli.netlify.app');
  }
  
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

// Middleware - optimized JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'solar-crm',
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB Connection Error:', err.message);
  process.exit(1);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/products', require('./routes/products'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/payments', require('./routes/quotation'));
app.use('/api/invoices', require('./routes/invoices'));

// Production-only error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Initialize WebSocket
initWebSocket(server);

// Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV})`);
});