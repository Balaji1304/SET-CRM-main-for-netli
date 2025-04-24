require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initWebSocket } = require('./utils/websocket');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: [
    'http://localhost:3000', // Local development
    'https://blackenginecrm.netlify.app', // Netlify domain
    //'https://set-crm-main-for-netli.onrender.com'  Render domain
  ],
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Initialize WebSocket
initWebSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});