try {
  const { acceptOrder } = require('./controllers/customerPurchaseController');
  console.log('acceptOrder function imported successfully:', typeof acceptOrder);
  if (typeof acceptOrder === 'function') {
    console.log('acceptOrder is a function - import successful');
  } else {
    console.log('acceptOrder is not a function - import failed');
  }
} catch (error) {
  console.error('Error importing acceptOrder:', error.message);
}
