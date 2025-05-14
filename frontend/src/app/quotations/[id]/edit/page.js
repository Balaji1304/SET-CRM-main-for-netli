import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../../components/ConfirmDialog';

export default function EditQuotationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    leadId: '',
    items: [],
    terms: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const getAuthHeaders = (contentType = true) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    if (contentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch quotation, leads, and products in parallel
      const [quotationRes, leadsRes, productsRes] = await Promise.all([
        fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${id}`, {
          headers: getAuthHeaders(false)
        }),
        fetch('https://set-crm-main-for-netli.onrender.com/api/leads', {
          headers: getAuthHeaders(false)
        }),
        fetch('https://set-crm-main-for-netli.onrender.com/api/products', {
          headers: getAuthHeaders(false)
        })
      ]);

      const [quotationData, leadsData, productsData] = await Promise.all([
        quotationRes.json(),
        leadsRes.json(),
        productsRes.json()
      ]);

      if (quotationData.success) {
        const { lead, items, terms, notes } = quotationData.data;
        setFormData({
          leadId: lead._id,
          items: items.map(item => ({
            productId: item.product._id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount
          })),
          terms: terms || '',
          notes: notes || ''
        });
      }

      if (leadsData.success) {
        // Map leads with their associated products
        setLeads(leadsData.data.map(lead => ({
          ...lead,
          products: lead.products?.map(product => ({
            id: product.productId?._id,
            name: product.productId?.name,
            price: product.price,
            quantity: product.quantity
          })) || []
        })));
      }
      
      if (productsData.success) {
        setProducts(productsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
            const selectedLead = leads.find(lead => lead._id === formData.leadId);
            const product = selectedLead?.products.find(p => p.id === value);
            return {
              ...item,
              productId: value,
              unitPrice: product ? parseFloat(product.price) : item.unitPrice,
              quantity: product ? parseInt(product.quantity) : item.quantity
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
      // Format the data to match server expectations
      const formattedData = {
        items: formData.items.map(item => ({
          product: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseInt(item.discount) || 0
        })),
        terms: formData.terms || '',
        notes: formData.notes || ''
      };

      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formattedData)
      });

      const data = await response.json();
      if (data.success) {
        navigate(`/dashboard/quotations/${id}`);
      } else {
        console.error('Error updating quotation:', data.message);
      }
    } catch (error) {
      console.error('Error updating quotation:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const selectedLead = leads.find(lead => lead._id === formData.leadId);

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
                  {selectedLead ? `${selectedLead.firstName} ${selectedLead.lastName} - ${selectedLead.businessName || 'N/A'}` : 'Loading lead...'}
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
                        {selectedLead?.products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                        {products.map(product => (
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