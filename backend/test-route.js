const express = require('express');
const app = express();
const customerPurchaseRoutes = require('./routes/customerPurchaseRoutes');

app.use(express.json());
app.use('/api/customer-purchases', customerPurchaseRoutes);

// List all routes
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(Object.keys(r.route.methods)[0].toUpperCase(), r.route.path)
  }
});

console.log('Testing route registration...');
console.log('Customer Purchase Routes loaded successfully');
