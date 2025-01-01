const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const config = require('./config');


app.use(cors({
  origin: [
    'https://blackenginecrm.netlify.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB

mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'solar-crm',
  useNewUrlParser: true,
  useUnifiedTopology: true
//.then(() => console.log('MongoDB Connected...'))
})
.catch(err => {
  console.log('MongoDB Connection Error:', err);
  process.exit(1);
});

// Load models
require('./models/Lead');

// Routes
app.use('/api/auth', require('./routes/auth'));

app.use('/api/products', require('./routes/products'));

app.use('/api/leads', require('./routes/leads'));


// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Add a test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Solar CRM API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 