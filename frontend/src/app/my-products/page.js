import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertCircle, ChevronDown, ExternalLink, ShoppingBag, FileText, Loader2, AlertTriangle, Search } from 'lucide-react';
import { getCustomerProducts } from '../../services/quotationService';

export default function MyProductsPage() {
  const [quotations, setQuotations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // useMemo for derived state based on search term
  const filteredOrders = useMemo(() => {
    if (Object.keys(quotations).length === 0) return {};
    if (!searchTerm.trim()) return quotations;

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = {};

    Object.entries(quotations).forEach(([key, orderData]) => {
      // Search in order-level fields
      if (
        orderData.quotationNumber?.toLowerCase().includes(lowerSearchTerm) ||
        orderData.purchaseID?.toLowerCase().includes(lowerSearchTerm)
      ) {
        filtered[key] = orderData;
        return; // Order matches, no need to check items
      }

      // Search in product-level fields within this order
      const hasMatchingProduct = orderData.quotationItems.some(item => {
        const product = item.product;
        return product && (
          product.name?.toLowerCase().includes(lowerSearchTerm) ||
          product.description?.toLowerCase().includes(lowerSearchTerm) ||
          product.category?.toLowerCase().includes(lowerSearchTerm)
        );
      });

      if (hasMatchingProduct) {
        filtered[key] = orderData;
      }
    });
    return filtered;
  }, [quotations, searchTerm]);

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
    window.location.href = `/dashboard/payments/remaining?purchase=${purchaseId}`;
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
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-6 bg-tertiary">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading your products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-6 bg-tertiary text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Products</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-tertiary font-sans">
      {/* Heading and Search Section */}
      <div className="border-b border-fourth pb-5 mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-secondary">My Orders</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <input
                type="text"
                placeholder="Search by Order #, Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-fourth rounded-lg text-sm text-secondary focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <button
                 className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0"
            >
                 <Search className="h-4 w-4" />
                 Search Orders
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        {Object.keys(filteredOrders).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-tertiary rounded-lg border border-fourth shadow-sm text-center">
            <ShoppingBag className="h-16 w-16 mb-4 text-primary" />
            <p className="text-xl font-medium text-secondary mb-2">
              {searchTerm ? 'No orders match your search.' : 'No products found'}
            </p>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms.' : 'Your purchased products will appear here.'}
            </p>
          </div>
        ) : (
          Object.values(filteredOrders).map((quotation) => (
            <div 
              key={quotation.quotationNumber} 
              className={`bg-tertiary rounded-lg border border-fourth shadow-sm overflow-hidden ${
                quotation.paymentStatus === 'FULLY_PAID' ? 'border-l-4 border-green-500' : 'border-l-4 border-orange-500'
              }`}
            >
              {/* Order header */}
              <div 
                className={`p-4 border-b border-fourth grid grid-cols-1 md:grid-cols-3 gap-4 ${
                  quotation.paymentStatus === 'FULLY_PAID' ? 'bg-green-50' : 'bg-orange-50'
                }`}
              >
                <div>
                  <p className="text-xs text-gray-500 uppercase">Order Placed</p>
                  <p className="font-medium text-secondary">{formatDate(quotation.purchaseDate)}</p>
                </div>
                <div>
                  {quotation.paymentStatus !== 'FULLY_PAID' && (
                    <>
                      <p className="text-xs text-gray-500 uppercase">Remaining Amount</p>
                      <p className="font-medium text-orange-600">{formatCurrency(quotation.remainingAmount)}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                  <div className='mb-2 md:mb-0'>
                    <p className="text-xs text-gray-500 uppercase">Order #</p>
                    <p className="font-medium text-secondary">{quotation.purchaseID || quotation.quotationNumber}</p>
                    {quotation.purchaseID && quotation.quotationNumber && quotation.purchaseID !== quotation.quotationNumber && (
                      <p className="text-xs text-gray-400">Quotation: {quotation.quotationNumber}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span 
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        quotation.paymentStatus === 'FULLY_PAID' 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-orange-100 text-orange-700 border border-orange-300'
                      }`}
                    >
                      {quotation.paymentStatus === 'FULLY_PAID' ? 'Fully Paid' : 'Advance Paid'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Payment progress indicator - at quotation level */}
              {quotation.paymentStatus !== 'FULLY_PAID' && (
              <div className="px-4 pt-4 pb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-secondary">Payment Progress</span>
                  <span className="text-sm text-gray-600">
                      {Math.round((quotation.advancePaymentAmount / quotation.totalAmount) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-fourth rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full"
                    style={{ 
                        width: `${Math.round((quotation.advancePaymentAmount / quotation.totalAmount) * 100)}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1 mb-3">
                  <span className='font-medium text-secondary'>{formatCurrency(quotation.advancePaymentAmount)} paid</span>
                  <span className='text-secondary'>Total: {formatCurrency(quotation.totalAmount)}</span>
                </div>
              </div>
              )}

              {/* Products list */}
              <div className="px-4 pb-4">
                <h3 className="text-lg font-semibold text-secondary my-4">Products in this Order</h3>
                <div className="space-y-4">
                  {quotation.quotationItems.map((item, index) => {
                    const productObj = item.product;

                    if (!productObj) {
                      console.warn('Product object missing for item:', item);
                      return <div key={`missing-${index}`} className='text-sm text-red-500'>Product information unavailable.</div>;
                    }

                    const imageUrl = productObj.imageUrl;
                    
                    return (
                    <div key={productObj._id || index} className="border-b border-fourth pb-4 last:border-b-0 last:pb-0">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        {/* Product image */}
                        <div className="w-full md:w-24 h-24 flex-shrink-0">
                            {imageUrl ? ( 
                              <img
                                src={imageUrl} 
                                alt={productObj.name || 'Product'}
                                className="w-full h-full object-cover rounded-md border border-fourth"
                              />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-md border border-fourth text-gray-400">
                              <Package className="h-10 w-10" />
                            </div>
                          )}
                        </div>
                        
                        {/* Product details */}
                        <div className="flex-1">
                            <h4 className="text-base font-semibold text-secondary">{productObj.name}</h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{productObj.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                            <div>
                              <span className="text-gray-500">Category: </span>
                                <span className="font-medium text-secondary">{productObj.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Qty: </span>
                              <span className="font-medium text-secondary">{item.quantity}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Unit Price: </span>
                              <span className="font-medium text-secondary">{formatCurrency(item.unitPrice)}</span>
                            </div>
                            {item.discount > 0 && (
                                <div>
                                    <span className="text-gray-500">Discount: </span>
                                    <span className="font-medium text-secondary">{item.discount}%</span>
                                </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="text-right md:text-base text-lg font-semibold text-primary pt-2 md:pt-0">
                            {formatCurrency(item.total || (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)))}
                          </div>
                        </div>
                    </div>
                    );
                  })}
                    </div>
                  </div>
              
              {/* Order footer */}
              <div className="bg-gray-50 p-4 border-t border-fourth flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className='text-center sm:text-left'>
                  <p className="text-sm font-medium text-secondary">Order Total: <span className="text-lg text-primary">{formatCurrency(quotation.totalAmount)}</span></p>
                  <p className="text-xs text-gray-600">
                    Advance Paid: <span className="font-medium text-secondary">{formatCurrency(quotation.advancePaymentAmount)}</span>
                    {quotation.paymentStatus !== 'FULLY_PAID' && quotation.remainingAmount > 0 && (
                         <span className='ml-2 text-orange-600'>(Remaining: {formatCurrency(quotation.remainingAmount)})</span>
                    )}
                  </p>
                </div>
                
                <div className="flex gap-3">
                    {quotation.paymentStatus === 'FULLY_PAID' ? (
                      <button 
                        onClick={() => viewInvoice(quotation.purchaseId)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto justify-center"
                      >
                        <FileText className="h-4 w-4" />
                        View Invoice
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigateToPayment(quotation.quotationNumber)}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-tertiary rounded-md flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto justify-center"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Complete Payment
                      </button>
                    )}
                </div>
              </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
} 