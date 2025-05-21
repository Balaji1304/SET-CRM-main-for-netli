import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { getQuotation, updateQuotation } from '../../../../services/quotationService';
import { getProducts } from '../../../../services/productService';

export default function EditQuotationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [leadData, setLeadData] = useState(null);
  const [originalProducts, setOriginalProducts] = useState([]);
  const [formData, setFormData] = useState({
    leadId: '',
    items: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
    terms: '',
    notes: '',
    advancePaymentPercentage: 20
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch quotation and all available products in parallel
      const [quotationData, productsData] = await Promise.all([
        getQuotation(id),
        getProducts()
      ]).catch(error => {
        throw new Error(`Failed to fetch data: ${error.message}`);
      });

      if (!quotationData.success) {
        throw new Error(quotationData.message || 'Failed to fetch quotation');
      }

      const { lead, quotationItems, terms, notes, advancePaymentPercentage } = quotationData.data;
      
      // Store lead data for display
      setLeadData(lead);
      
      // Get all products from products API instead of just the ones in the quotation
      if (productsData.success) {
        setOriginalProducts(productsData.data);
      } else {
        throw new Error(productsData.message || 'Failed to fetch products');
      }
      
      // Set form data
        setFormData({
          leadId: lead._id,
        items: quotationItems.map(item => {
          const productObj = item.productId;
          return {
            productId: typeof productObj === 'string' ? productObj : productObj._id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0
          };
        }),
          terms: terms || '',
          notes: notes || '',
          advancePaymentPercentage: advancePaymentPercentage || 20
        });
    } catch (error) {
      console.error('Error fetching data:', error);
      alert(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        productId: '', 
        quantity: 1, 
        unitPrice: 0, 
        discount: 0 
      }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          if (field === 'productId') {
            // Find product in our original products list
            const product = originalProducts.find(p => p._id === value);
            // Only update price if we have product info
            return {
              ...item,
              productId: value,
              // Don't override existing values unnecessarily
              unitPrice: product?.price || item.unitPrice
            };
          }
          // Ensure proper data types for numeric fields
          if (field === 'quantity') {
            value = value ? parseInt(value) : '';
          }
          if (field === 'unitPrice') {
            value = value ? parseFloat(value) : '';
          }
          if (field === 'discount') {
            value = value ? parseInt(value) : 0;
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Format the data to match server expectations with new format
      const formattedData = {
        quotationItems: formData.items.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseInt(item.discount) || 0
        })),
        terms: formData.terms || '',
        notes: formData.notes || '',
        advancePaymentPercentage: parseInt(formData.advancePaymentPercentage) || 20
      };

      const response = await updateQuotation(id, formattedData);
      
      if (response.success) {
        navigate(`/dashboard/quotations/${id}`);
      } else {
        console.error('Error updating quotation:', response.message);
      }
    } catch (error) {
      console.error('Error updating quotation:', error);
      // Add error handling
      setError('Failed to update quotation. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmDialog(true)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-3xl font-bold tracking-tight">Edit Quotation</h2>
          </div>
          <p className="text-muted-foreground mt-1">Update quotation details</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm flex-1">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Error display */}
            {error && (
              <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
                <p>{error}</p>
              </div>
            )}
            
            {/* Lead Selection */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">Lead Information</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Selected Lead
                </label>
                <div className="w-full px-4 py-2 border border-input rounded-lg bg-gray-50">
                  {leadData ? `${leadData.firstName} ${leadData.lastName} - ${leadData.businessName || 'N/A'}` : 'Loading lead...'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Lead cannot be changed for an existing quotation</p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-foreground">Items</h2>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-2 text-orange-500 hover:text-orange-600"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-4 mb-4 p-4 border rounded-lg bg-white">
                    <div className="w-full md:flex-1 mb-4 md:mb-0">
                      <label className="block text-sm font-medium mb-1">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Product</option>
                        {originalProducts.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full md:w-32 mb-4 md:mb-0">
                      <label className="block text-sm font-medium mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^$|^\d+$/.test(value)) {
                            handleItemChange(index, 'quantity', value);
                          }
                        }}
                        min="1"
                        placeholder="Qty"
                        className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="w-full md:w-40 mb-4 md:mb-0">
                      <label className="block text-sm font-medium mb-1">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^$|^\d*\.?\d*$/.test(value)) {
                            handleItemChange(index, 'unitPrice', value);
                          }
                        }}
                        min="0"
                        placeholder="Price"
                        className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="w-full md:w-24 mb-4 md:mb-0">
                      <label className="block text-sm font-medium mb-1">
                        Discount
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.discount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^$|^\d{1,2}$|^100$/.test(value)) {
                            handleItemChange(index, 'discount', value);
                          }
                        }}
                        placeholder="%"
                        className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="w-full md:w-auto p-3 md:mt-6 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Trash2 className="h-5 w-5" />
                        <span className="md:hidden">Remove Item</span>
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Item Button */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full p-4 text-orange-500 hover:bg-orange-50 rounded-lg border-2 border-dashed border-orange-200 flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add Another Item
                </button>
              </div>
            </div>

            {/* Total Amount Display */}
            <div className="flex justify-end border-t border-input pt-4 mt-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Total Amount:</span>
                <span className="text-lg font-semibold text-orange-600">
                  ₹{formData.items.reduce((total, item) => {
                    if (item.quantity && item.unitPrice) {
                      const itemTotal = item.quantity * item.unitPrice;
                      const discount = item.discount ? (itemTotal * item.discount / 100) : 0;
                      return total + (itemTotal - discount);
                    }
                    return total;
                  }, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">Additional Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Terms
                  </label>
                  <textarea
                    value={formData.terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                    rows="4"
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                    placeholder="Enter terms and conditions for this quotation..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="4"
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                    placeholder="Enter any additional notes for the client..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Advance Payment Percentage <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={formData.advancePaymentPercentage}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1 && value <= 100) {
                        setFormData(prev => ({ ...prev, advancePaymentPercentage: value }));
                      }
                    }}
                    min="1"
                    max="100"
                    className="w-24 px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                  <span className="ml-2">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum advance payment required from client before approval (1-100%)</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="sticky bottom-0 left-0 right-0 flex justify-end space-x-4 pt-4 pb-4 border-t border-input bg-white">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                className="px-6 py-2 border border-input rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Quotation
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => navigate(`/dashboard/quotations/${id}`)}
        title="Discard Changes"
        message="Are you sure you want to discard your changes to this quotation?"
      />
    </div>
  );
} 