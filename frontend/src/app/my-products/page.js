import React, { useState, useEffect } from 'react';
import { Package, AlertCircle, ChevronDown, ExternalLink, ShoppingBag, FileText } from 'lucide-react';
import { getCustomerProducts } from '../../services/quotationService';

export default function MyProductsPage() {
  const [quotations, setQuotations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching customer products with token');

      const response = await getCustomerProducts();

      console.log('Response received from service');

      if (response.success) {
        console.log('Received products:', response.data);
        
        // Group products by quotation number
        const quotationGroups = {};
        response.data.forEach(item => {
          if (!quotationGroups[item.quotationNumber]) {
            quotationGroups[item.quotationNumber] = {
              quotationNumber: item.quotationNumber,
              purchaseId: item.purchaseId,
              purchaseID: item.purchaseID,
              purchaseDate: item.purchaseDate,
              quotationItems: [],
              totalAmount: item.totalAmount || 0,
              paymentStatus: item.paymentStatus || 'ADVANCE_PAID', // Use the status from the response
              advancePaymentAmount: item.advancePaymentAmount || 0,
              advancePaymentPercentage: item.advancePaymentPercentage || 20,
              remainingAmount: item.remainingAmount || 0
            };
          }
          
          // Add the product to quotationItems
          quotationGroups[item.quotationNumber].quotationItems.push(item);
        });
        
        setQuotations(quotationGroups);
      } else {
        throw new Error(response.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateToPayment = (quotationNumber) => {
    // Find the quotation in our data
    const quotation = quotations[quotationNumber];
    if (!quotation) {
      console.error('Cannot navigate to payment: Invalid quotation data');
      return;
    }
    
    // Get the purchase ID directly from the quotation object
    const purchaseId = quotation.purchaseId;
    if (!purchaseId) {
      console.error('Cannot navigate to payment: Purchase ID not found');
      return;
    }
    
    // Navigate to the payment page with the purchase ID
    window.location.href = `/payments/remaining?purchase=${purchaseId}`;
  };

  const viewInvoice = (customerPurchaseId) => {
    // Navigate to the invoice page using customerPurchaseId
    // Ensure this ID is the MongoDB ObjectId for CustomerPurchase
    window.location.href = `/invoice/${customerPurchaseId}`;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <AlertCircle className="h-12 w-12 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Products</h2>
        <p className="text-muted-foreground mt-1">View your purchased products</p>
      </div>

      <div className="space-y-6">
        {Object.keys(quotations).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg shadow-sm text-gray-500">
            <ShoppingBag className="h-16 w-16 mb-4" />
            <p className="text-xl font-medium mb-2">No products found</p>
            <p className="text-gray-400">Your purchased products will appear here</p>
          </div>
        ) : (
          Object.values(quotations).map((quotation) => (
            <div key={quotation.quotationNumber} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Order header - similar to Amazon's header */}
              <div className="bg-gray-50 p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">ORDER PLACED</p>
                  <p className="font-medium">{formatDate(quotation.purchaseDate)}</p>
                </div>
                <div>
                  {quotation.paymentStatus !== 'FULLY_PAID' && (
                    <>
                      <p className="text-xs text-gray-500">REMAINING AMOUNT</p>
                      <p className="font-medium text-orange-600">{formatCurrency(quotation.remainingAmount)}</p>
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">ORDER #</p>
                    <p className="font-medium">{quotation.purchaseID || quotation.quotationNumber}</p>
                    {quotation.purchaseID && quotation.quotationNumber && quotation.purchaseID !== quotation.quotationNumber && (
                      <p className="text-xs text-gray-400">Quotation: {quotation.quotationNumber}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span 
                      className={`px-4 py-2 text-sm font-medium rounded-full ${
                        quotation.paymentStatus === 'FULLY_PAID' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {quotation.paymentStatus === 'FULLY_PAID' ? 'Fully Paid' : 'Advance Paid'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Payment progress indicator - at quotation level */}
              {quotation.paymentStatus !== 'FULLY_PAID' && (
              <div className="px-4 pt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Payment Progress</span>
                  <span className="text-sm text-gray-600">
                      {Math.round((quotation.advancePaymentAmount / quotation.totalAmount) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ 
                        width: `${Math.round((quotation.advancePaymentAmount / quotation.totalAmount) * 100)}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1 mb-3">
                  <span>{formatCurrency(quotation.advancePaymentAmount)} paid</span>
                  <span>{formatCurrency(quotation.totalAmount)}</span>
                </div>
              </div>
              )}

              {/* Products list */}
              <div className="px-4 pb-4">
                <h3 className="font-medium mb-4">Products</h3>
                <div className="space-y-4">
                  {quotation.quotationItems.map((item, index) => {
                    const productObj = item.productId;
                    if (!productObj) return null;
                    
                    return (
                    <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Product image */}
                        <div className="w-full md:w-32 h-32 flex-shrink-0">
                            {productObj.images && productObj.images[0] ? (
                  <img
                                src={productObj.images[0]}
                                alt={productObj.name}
                              className="w-full h-full object-cover rounded"
                  />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded">
                              <Package className="h-10 w-10 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Product details */}
                        <div className="flex-1">
                            <h4 className="text-lg font-medium">{productObj.name}</h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{productObj.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Category: </span>
                                <span className="font-medium">{productObj.category}</span>
                    </div>
                            <div>
                              <span className="text-gray-500">Quantity: </span>
                      <span className="font-medium">{item.quantity}</span>
                    </div>
                            <div>
                              <span className="text-gray-500">Unit Price: </span>
                              <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="text-right text-lg font-semibold text-orange-600">
                            {formatCurrency(item.total || (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)))}
                          </div>
                        </div>
                    </div>
                    );
                  })}
                    </div>
                  </div>
              
              {/* Order footer */}
              <div className="bg-gray-50 p-4 border-t flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Total Amount: <span className="text-gray-800">{formatCurrency(quotation.totalAmount)}</span></p>
                  <p className="text-xs text-gray-600">
                    Advance Paid: <span className="font-medium">{formatCurrency(quotation.advancePaymentAmount)}</span>
                    </p>
                </div>
                
                {quotation.paymentStatus === 'FULLY_PAID' ? (
                  <button 
                    onClick={() => viewInvoice(quotation.purchaseId)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded flex items-center gap-1 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    View Invoice
                  </button>
                ) : (
                  <button 
                    onClick={() => navigateToPayment(quotation.quotationNumber)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Complete Payment
                  </button>
                )}
              </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
} 