import React, { useState, useEffect } from 'react';
import { Package, AlertCircle } from 'lucide-react';

export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
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

      console.log('Fetching with token:', token);

      const response = await fetch('http://set-crm-main-for-netli.onrender.com/api/quotations/customer-products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to fetch products');
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        console.log('Received products:', data.data);
        setProducts(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
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

      <div className="bg-white rounded-lg shadow-sm p-6">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Package className="h-12 w-12 mb-2" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((item, index) => (
              <div
                key={`${item.quotationNumber}-${index}`}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {item.product.images && item.product.images[0] && (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{item.product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{item.product.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Category:</span>
                      <span className="font-medium">{item.product.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium">{item.quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Purchase Date:</span>
                      <span className="font-medium">
                        {new Date(item.purchaseDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quotation:</span>
                      <span className="font-medium">{item.quotationNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total Price:</span>
                      <span className="text-orange-600">₹{item.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 