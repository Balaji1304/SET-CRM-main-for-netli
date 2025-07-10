import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { createQuotation } from '../../../services/quotationService';
import { getLeads } from '../../../services/leadService';
import { getProducts } from '../../../services/productService';

export default function CreateQuotationPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
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
    terms: "1. Payment Terms: 50% advance payment, 50% upon completion of services/delivery of goods.\n2. Quotation Validity: This quotation is valid for 30 days from the date of issue.\n3. All disputes are subject to [Your City/Region] jurisdiction.",
    notes: "We appreciate your interest in our services/products. Please feel free to contact us if you have any questions or require further clarification. We look forward to the opportunity to work with you.",
    advancePaymentPercentage: 50
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [leadsData, productsData] = await Promise.all([
        getLeads(),
        getProducts()
      ]).catch(error => {
        console.error("Error fetching initial data for create quotation:", error);
        throw new Error(`Failed to fetch essential data: ${error.message}`);
      });

      if (!leadsData.success) {
        throw new Error(leadsData.message || 'Failed to fetch leads');
      }

      setLeads(leadsData.data.map(lead => ({
        ...lead,
        products: lead.products.map(product => ({
          id: product.productId._id,
          name: product.productId.name,
          price: product.unitPrice || product.price,
          unitPrice: product.unitPrice || product.price,
          quantity: product.quantity
        }))
      })));

      if (!productsData.success) {
        throw new Error(productsData.message || 'Failed to fetch products');
      }
      setAllProducts(productsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Error loading initial data: ${error.message}. Please try refreshing or contact support if the issue persists.`);
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
          let updatedItem = { ...item };
          if (field === 'productId') {
            updatedItem.productId = value;
            const selectedLead = leads.find(lead => lead._id === prev.leadId);
            const leadProduct = selectedLead?.products.find(p => p.id === value);
            
            if (leadProduct) {
              updatedItem.unitPrice = parseFloat(leadProduct.unitPrice || leadProduct.price) || 0;
              updatedItem.quantity = parseInt(leadProduct.quantity) || 1;
            } else {
              const product = allProducts.find(p => p._id === value);
              updatedItem.unitPrice = product?.price || 0;
              updatedItem.quantity = item.quantity === '' ? 1 : item.quantity;
            }
          } else if (field === 'quantity') {
            updatedItem.quantity = value ? parseInt(value) : '';
          } else if (field === 'discount') {
            updatedItem.discount = value === '' ? '' : (parseInt(value) >= 0 && parseInt(value) <= 5 ? parseInt(value) : item.discount);
          } else {
            updatedItem[field] = value;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const calculateItemTotal = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const discount = parseFloat(item.discount) || 0;
    
    if (quantity > 0 && unitPrice >= 0) {
      const itemTotal = quantity * unitPrice;
      const discountAmount = itemTotal * (discount / 100);
      return itemTotal - discountAmount;
    }
    return 0;
  };

  const handleLeadSelect = (leadId) => {
    const selectedLead = leads.find(lead => lead._id === leadId);
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        leadId,
        items: selectedLead.products.length > 0 
          ? selectedLead.products.map(product => ({
              productId: product.id,
              quantity: parseInt(product.quantity) || 1,
              unitPrice: parseFloat(product.unitPrice || product.price) || 0,
              discount: 0
            }))
          : [{ productId: '', quantity: '', unitPrice: '', discount: '' }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        leadId: '',
        items: [{ productId: '', quantity: '', unitPrice: '', discount: '' }]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); 
    setIsSubmitting(true);

    if (!formData.leadId) {
      setError("Please select a lead.");
      setIsSubmitting(false);
      return;
    }
    if (formData.items.some(item => !item.productId || item.quantity === '' || item.unitPrice === '')) {
      setError("Please ensure all item fields (Product, Quantity) are filled for each item.");
      setIsSubmitting(false);
      return;
    }
    if (formData.items.some(item => parseFloat(item.quantity) <= 0 || parseFloat(item.unitPrice) < 0)) {
      setError("Quantity must be positive and price must not be negative.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.advancePaymentPercentage || formData.advancePaymentPercentage < 1 || formData.advancePaymentPercentage > 100) {
        setError("Advance Payment Percentage must be between 1 and 100.");
        setIsSubmitting(false);
        return;
    }

    try {
      const formattedData = {
        leadId: formData.leadId,
        quotationItems: formData.items.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: item.discount === '' ? 0 : parseInt(item.discount)
        })),
        terms: formData.terms || '',
        notes: formData.notes || '',
        advancePaymentPercentage: parseInt(formData.advancePaymentPercentage) || 50
      };

      const response = await createQuotation(formattedData);
      
      if (response.success) {
        navigate('/dashboard/quotations', { state: { toastMessage: 'Quotation created successfully!' } });
      } else {
        setError(response.message || 'Failed to create quotation. Please check your input and try again.');
        console.error('Error creating quotation:', response.message);
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
      setError(`Failed to create quotation: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const calculateTotalAmount = () => {
    return formData.items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      if (quantity > 0 && unitPrice >= 0) {
        const itemTotal = quantity * unitPrice;
        const discountAmount = itemTotal * (discount / 100);
        return total + (itemTotal - discountAmount);
      }
      return total;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-var(--header-height,150px))] p-6 bg-tertiary">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading data...</p>
      </div>
    );
  }
  
  if (error && !leads.length && !allProducts.length) {
     return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-var(--header-height,150px))] p-6 bg-tertiary text-center">
        <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p className="text-lg font-semibold text-red-600 mb-2">Error Loading Page Data</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  const selectedLead = leads.find(lead => lead._id === formData.leadId);

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Header Section */}
      <div className="border-b border-fourth pb-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="p-2 rounded-md hover:bg-fourth text-secondary"
            aria-label="Back to quotations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-secondary">Create Quotation</h1>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        <form onSubmit={handleSubmit} id="create-quotation-form" className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flex-1">
          {error && (leads.length > 0 || allProducts.length > 0) && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
              <span>{error}</span>
            </div>
          )}
            
          {/* Lead Selection Section */}
          <section>
            <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">Lead Information</h2>
            <div>
              <label htmlFor="leadId" className="block text-sm font-medium text-gray-700 mb-1">
                Select Lead <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <select
                  id="leadId"
                  name="leadId"
                  value={formData.leadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm appearance-none text-secondary"
                  required
                >
                  <option value="">Select a lead</option>
                  {leads.map(lead => (
                    <option key={lead._id} value={lead._id}>
                      {lead.firstName} {lead.lastName} - {lead.businessName || 'N/A'} ({lead.products.length} interested product(s))
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>
          </section>

          {/* Items Section */}
          <section>
            <div className="flex items-center justify-between mb-4 border-b border-fourth pb-2">
              <h2 className="text-xl font-semibold text-secondary">Items</h2>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="p-4 border border-fourth rounded-lg md:grid md:grid-cols-12 md:gap-x-4 md:gap-y-2 md:items-end bg-white shadow-sm space-y-3 md:space-y-0">
                  {/* Product Select */}
                  <div className="md:col-span-3">
                    <label htmlFor={`product_id_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <select
                        id={`product_id_${index}`}
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm appearance-none text-secondary"
                        required
                        disabled={!formData.leadId && !allProducts.length}
                      >
                        <option value="">Select Product</option>
                        {selectedLead?.products.length > 0 && (
                          <optgroup label="Lead's Interested Products">
                            {selectedLead.products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label={selectedLead?.products.length > 0 ? "All Other Products" : "All Products"}>
                          {allProducts
                            .filter(p => !selectedLead?.products.some(sp => sp.id === p._id))
                            .map(product => (
                              <option key={product._id} value={product._id}>
                                {product.name} ({product.category})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div className="md:col-span-2">
                    <label htmlFor={`quantity_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id={`quantity_${index}`}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="1"
                      placeholder="Qty"
                      className="mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400"
                      required
                    />
                  </div>

                  {/* Unit Price Input - Now Read Only */}
                  <div className="md:col-span-2">
                    <label htmlFor={`unit_price_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium z-10">₹</span>
                      <input
                        type="number"
                        id={`unit_price_${index}`}
                        value={item.unitPrice}
                        readOnly
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="mt-1 block w-full pl-8 pr-8 py-2 bg-gray-50 border border-fourth rounded-lg shadow-sm text-sm text-secondary font-medium cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" title="Auto-filled from product selection"></div>
                      </div>
                    </div>
                  </div>

                  {/* Discount Input */}
                  <div className="md:col-span-2">
                    <label htmlFor={`discount_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      id={`discount_${index}`}
                      value={item.discount}
                      onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                      min="0"
                      max="5"
                      placeholder="e.g. 2"
                      className="mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400"
                    />
                  </div>

                  {/* Item Total - New Field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Total
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium z-10">₹</span>
                      <input
                        type="text"
                        value={calculateItemTotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        readOnly
                        className="mt-1 block w-full pl-8 pr-8 py-2 bg-gray-50 border border-fourth rounded-lg shadow-sm text-sm text-secondary font-medium cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full" title="Auto-calculated after discount"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Remove Item Button */}
                  <div className="md:col-span-1 flex items-end justify-end">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-500 hover:bg-red-100/50 rounded-lg transition-colors duration-150 w-full md:w-auto mt-4 md:mt-0 flex items-center justify-center gap-1.5"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="md:hidden text-sm">Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Add Another Item Button (Full Width Dashed) */}
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-primary/50 text-primary rounded-lg hover:bg-primary/10 hover:border-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              >
                <Plus className="w-5 h-5" /> Add Another Item
              </button>
            </div>
          </section>

          {/* Total Amount Display */}
          <div className="flex justify-end items-center border-t border-fourth pt-4 mt-6">
            <span className="text-sm font-medium text-gray-700">Total Amount:</span>
            <span className="text-xl font-bold text-primary ml-2">
              ₹{calculateTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Additional Information Section */}
          <section>
            <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">Additional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="terms" className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  id="terms"
                  name="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                  rows="5"
                  className="mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400 resize-vertical"
                  placeholder="Enter terms and conditions..."
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes for Client
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="5"
                  className="mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400 resize-vertical"
                  placeholder="Enter any additional notes..."
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label htmlFor="advancePaymentPercentage" className="block text-sm font-medium text-gray-700 mb-1">
                Advance Payment Percentage <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center mt-1">
                <input
                  type="number"
                  id="advancePaymentPercentage"
                  name="advancePaymentPercentage"
                  value={formData.advancePaymentPercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsedValue = parseInt(value);
                    if (value === '' || (!isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100)) {
                       setFormData(prev => ({ ...prev, advancePaymentPercentage: value === '' ? '' : parsedValue }));
                    } else if (value !== '' && (isNaN(parsedValue) || parsedValue < 1 || parsedValue > 100)) {
                    }
                  }}
                  min="1"
                  max="100"
                  className="w-24 px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400"
                  required
                />
                <span className="ml-2 text-secondary">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum advance payment required (1-100%). Default is 50%.</p>
            </div>
          </section>
        </form>

        {/* Form Actions (Sticky Footer) */}
        <div className="bg-tertiary/80 backdrop-blur-sm border-t border-fourth p-4 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            onClick={() => setShowConfirmDialog(true)}
            className="px-5 py-2.5 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors duration-150 ease-in-out"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-quotation-form"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px]"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</> : 'Create Quotation'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => { 
          setShowConfirmDialog(false); 
          navigate('/dashboard/quotations');
        }}
        title="Discard Quotation"
        message="Are you sure you want to discard this new quotation? All entered information will be lost."
        confirmText="Yes, Discard"
        isDestructive={true}
      />
    </div>
  );
} 