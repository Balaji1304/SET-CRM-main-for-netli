import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog';

export default function CreateQuotationPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    leadId: '',
    items: [{
      productId: '',
      quantity: '',
      unitPrice: '',
      discount: ''
    }],
    terms: '',
    notes: ''
  });

  useEffect(() => {
    fetchLeadsAndProducts();
  }, []);

  const fetchLeadsAndProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const [leadsResponse, productsResponse] = await Promise.all([
        fetch('http://localhost:5000/api/leads', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('http://localhost:5000/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      const leadsData = await leadsResponse.json();
      const productsData = await productsResponse.json();

      if (leadsData.success) {
        // Map leads with their associated products
        setLeads(leadsData.data.map(lead => ({
          ...lead,
          products: lead.products.map(product => ({
            id: product.productId._id,
            name: product.productId.name,
            price: product.price,
            quantity: product.quantity
          }))
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
        quantity: '', 
        unitPrice: '', 
        discount: '' 
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
              unitPrice: product ? parseFloat(product.price) : '',
              quantity: product ? parseInt(product.quantity) : ''
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

  const handleLeadSelect = (leadId) => {
    const selectedLead = leads.find(lead => lead._id === leadId);
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        leadId,
        items: selectedLead.products.map(product => ({
          productId: product.id,
          quantity: parseInt(product.quantity),
          unitPrice: parseFloat(product.price),
          discount: 0
        }))
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Format the data to match server expectations
      const formattedData = {
        leadId: formData.leadId,
        items: formData.items.map(item => ({
          product: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseInt(item.discount) || 0
        })),
        terms: formData.terms || '',
        notes: formData.notes || ''
      };

      console.log('Sending data:', formattedData); // For debugging

      const response = await fetch('http://localhost:5000/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formattedData)
      });

      const data = await response.json();
      
      if (data.success) {
        navigate('/dashboard/quotations');
      } else {
        console.error('Error creating quotation:', data.message);
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const selectedLead = leads.find(lead => lead._id === formData.leadId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Quotation</h2>
          <p className="text-muted-foreground">Create a new quotation for a lead</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lead Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Lead
          </label>
          <select
            value={formData.leadId}
            onChange={(e) => handleLeadSelect(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          >
            <option value="">Select a lead</option>
            {leads.map(lead => (
              <option key={lead._id} value={lead._id}>
                {lead.firstName} {lead.lastName} - {lead.businessName}
              </option>
            ))}
          </select>
        </div>

        {/* Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Items</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg">
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={item.productId}
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Product</option>
                  {selectedLead?.products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                  min="1"
                  placeholder="Qty"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                <input
                  type="number"
                  value={item.discount}
                  onChange={(e) => handleItemChange(index, 'discount', parseInt(e.target.value))}
                  min="0"
                  max="100"
                  placeholder="%"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-1 pt-7">
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Terms and Notes */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => setShowConfirmDialog(true)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            Create Quotation
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => navigate('/dashboard/quotations')}
        title="Discard Changes"
        message="Are you sure you want to discard this quotation? All changes will be lost."
      />
    </div>
  );
} 