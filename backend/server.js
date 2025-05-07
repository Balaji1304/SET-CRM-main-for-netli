require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initWebSocket } = require('./utils/websocket');

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Add debugging middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers
  });
  next();
});

// CORS Configuration
app.use(cors({
  origin: ['https://blackenginecrm.netlify.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

// Pre-flight requests
app.options('*', cors());

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Add headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://blackenginecrm.netlify.app');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'solar-crm',
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected...'))
.catch(err => {
  console.log('MongoDB Connection Error:', err);
  process.exit(1);
});

// Load models
require('./models/Lead');
require('./models/Ticket');
require('./models/Quotation');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/products', require('./routes/products'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/invoices', require('./routes/invoices'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize WebSocket
initWebSocket(server);

// Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});