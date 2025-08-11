import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { getQuotation, updateQuotation } from '../../../../services/quotationService';
import { getProducts } from '../../../../services/productService';
import { getAllCustomizedProducts, updateCustomizedProduct } from '../../../../services/customizedProductService';

export default function EditQuotationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [leadData, setLeadData] = useState(null);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [originalProducts, setOriginalProducts] = useState([]);
  const [allCustomizedProducts, setAllCustomizedProducts] = useState([]);
  const [leadProductType, setLeadProductType] = useState(null); // Track the lead's product type
  const [formData, setFormData] = useState({
    leadId: '',
    items: [{ productId: '', customizedProductId: '', quantity: 1, unitPrice: 0, discount: '' }],
    terms: '',
    notes: '',
    advancePaymentPercentage: 20
  });
  
  // State for customized product details
  const [customizedProductDetails, setCustomizedProductDetails] = useState({});
  const [newSpecField, setNewSpecField] = useState({ name: '', value: '' });
  
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [quotationData, productsData, customizedProductsData] = await Promise.all([
        getQuotation(id),
        getProducts(),
        getAllCustomizedProducts()
      ]).catch(error => {
        console.error('Error fetching initial data for edit quotation:', error);
        throw new Error(`Failed to fetch initial data: ${error.message}`);
      });

      if (!quotationData.success) {
        throw new Error(quotationData.message || 'Failed to fetch quotation');
      }

      const { lead, quotationItems, terms, notes, advancePaymentPercentage, quotationNumber: qn } = quotationData.data;
      
      setLeadData(lead);
      setQuotationNumber(qn);
      
      // Determine the product type based on quotation items
      let productType = null;
      if (quotationItems.length > 0) {
        if (quotationItems.some(item => item.customizedProductId)) {
          productType = 'customized';
        } else if (quotationItems.some(item => item.productId)) {
          productType = 'individual';
        }
        // Note: Bundle support can be added here when implemented
      }
      setLeadProductType(productType);
      
      if (productsData.success) {
        setOriginalProducts(productsData.data);
      } else {
        console.warn(productsData.message || 'Failed to fetch products for editing, product selection might be limited.');
        setOriginalProducts([]);
      }
      
      if (customizedProductsData.success) {
        setAllCustomizedProducts(customizedProductsData.data);
        
        // Populate customized product details for editing AFTER setting allCustomizedProducts
        const customizedDetails = {};
        quotationItems.forEach(item => {
          if (item.customizedProductId) {
            const customizedProductObj = item.customizedProductId;
            const customizedProductId = typeof customizedProductObj === 'string' ? customizedProductObj : customizedProductObj._id;
            
            // Find the full customized product data
            const fullCustomizedProduct = customizedProductsData.data.find(cp => cp._id === customizedProductId);
            
            if (fullCustomizedProduct) {
              customizedDetails[customizedProductId] = {
                modelNumber: fullCustomizedProduct.modelNumber || '',
                description: fullCustomizedProduct.description || '',
                specifications: {
                  power: fullCustomizedProduct.specifications?.power || '',
                  efficiency: fullCustomizedProduct.specifications?.efficiency || '',
                  warranty: fullCustomizedProduct.specifications?.warranty || '',
                  dimensions: fullCustomizedProduct.specifications?.dimensions || '',
                  ...fullCustomizedProduct.specifications // Include any additional specs
                },
                termsAndConditions: fullCustomizedProduct.termsAndConditions || '',
                images: fullCustomizedProduct.imageUrls || []
              };
            } else {
              // Create empty details for new or missing customized products
              customizedDetails[customizedProductId] = {
                modelNumber: '',
                description: '',
                specifications: {
                  power: '',
                  efficiency: '',
                  warranty: '',
                  dimensions: ''
                },
                termsAndConditions: '',
                images: []
              };
            }
          }
        });
        
        setCustomizedProductDetails(customizedDetails);
      } else {
        console.warn(customizedProductsData.message || 'Failed to fetch customized products for editing.');
        setAllCustomizedProducts([]);
      }
      
      setFormData({
        leadId: lead._id,
        items: quotationItems.map(item => {
          // Handle both regular products and customized products
          if (item.productId) {
            // Regular product
            const productObj = item.productId;
            return {
              productId: typeof productObj === 'string' ? productObj : productObj._id,
              customizedProductId: '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount === 0 ? '0' : (item.discount || ''),
              _key: item._id || `item-${Math.random().toString(36).substr(2, 9)}` 
            };
          } else if (item.customizedProductId) {
            // Customized product
            const customizedProductObj = item.customizedProductId;
            return {
              productId: '',
              customizedProductId: typeof customizedProductObj === 'string' ? customizedProductObj : customizedProductObj._id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount === 0 ? '0' : (item.discount || ''),
              _key: item._id || `item-${Math.random().toString(36).substr(2, 9)}` 
            };
          } else {
            // Fallback for items without proper references
            return {
              productId: '',
              customizedProductId: '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount === 0 ? '0' : (item.discount || ''),
              _key: item._id || `item-${Math.random().toString(36).substr(2, 9)}` 
            };
          }
        }),
        terms: terms || '',
        notes: notes || '',
        advancePaymentPercentage: advancePaymentPercentage || 20
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Error loading quotation data: ${error.message}. Please try refreshing the page.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        productId: '', 
        customizedProductId: '',
        quantity: 1,
        unitPrice: 0,
        discount: '',
        _key: `new-item-${Date.now()}`
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
            const product = originalProducts.find(p => p._id === value);
            updatedItem.productId = value;
            updatedItem.customizedProductId = ''; // Clear customized product selection
            updatedItem.unitPrice = product?.price ?? 0;
          } else if (field === 'customizedProductId') {
            const customizedProduct = allCustomizedProducts.find(cp => cp._id === value);
            updatedItem.customizedProductId = value;
            updatedItem.productId = ''; // Clear regular product selection
            updatedItem.unitPrice = customizedProduct?.unitPrice ?? 0;
            
            // Add customized product details to state if not already present
            if (value && customizedProduct && !customizedProductDetails[value]) {
              setCustomizedProductDetails(prev => ({
                ...prev,
                [value]: {
                  modelNumber: customizedProduct.modelNumber || '',
                  description: customizedProduct.description || '',
                  specifications: {
                    power: customizedProduct.specifications?.power || '',
                    efficiency: customizedProduct.specifications?.efficiency || '',
                    warranty: customizedProduct.specifications?.warranty || '',
                    dimensions: customizedProduct.specifications?.dimensions || '',
                    ...customizedProduct.specifications // Include any additional specs
                  },
                  termsAndConditions: customizedProduct.termsAndConditions || '',
                  images: customizedProduct.imageUrls || []
                }
              }));
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

  // Handlers for customized product details
  const handleCustomizedProductChange = (productId, field, value) => {
    if (field.startsWith('spec_')) {
      const specField = field.replace('spec_', '');
      setCustomizedProductDetails(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          specifications: {
            ...prev[productId]?.specifications,
            [specField]: value
          }
        }
      }));
    } else {
      setCustomizedProductDetails(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value
        }
      }));
    }
  };

  const handleAddSpecification = (productId) => {
    if (newSpecField.name && newSpecField.value) {
      setCustomizedProductDetails(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          specifications: {
            ...(prev[productId]?.specifications || {}),
            [newSpecField.name]: newSpecField.value
          }
        }
      }));
      setNewSpecField({ name: '', value: '' });
    }
  };

  const handleRemoveSpecification = (productId, fieldName) => {
    setCustomizedProductDetails(prev => {
      const productDetails = prev[productId] || {};
      const specifications = productDetails.specifications || {};
      const { [fieldName]: removed, ...remainingSpecs } = specifications;
      return {
        ...prev,
        [productId]: {
          ...productDetails,
          specifications: remainingSpecs
        }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (formData.items.some(item => (!item.productId && !item.customizedProductId) || item.quantity === '' || item.unitPrice === '')) {
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
      // Update customized products first if any exist and have been modified
      const customizedProductUpdatePromises = [];
      
      Object.entries(customizedProductDetails).forEach(([productId, details]) => {
        // Check if this customized product is being used in the quotation
        const isUsedInQuotation = formData.items.some(item => item.customizedProductId === productId);
        
        if (isUsedInQuotation && details) {
          const updateData = {
            modelNumber: details.modelNumber || '',
            description: details.description || '',
            specifications: details.specifications || {},
            termsAndConditions: details.termsAndConditions || '',
            // Don't include images here as they are already uploaded to Cloudinary
            isCompleted: true
          };
          
          customizedProductUpdatePromises.push(
            updateCustomizedProduct(productId, updateData).catch(error => {
              console.error(`Failed to update customized product ${productId}:`, error);
              throw new Error(`Failed to update customized product details: ${error.message}`);
            })
          );
        }
      });
      
      // Wait for all customized product updates to complete
      if (customizedProductUpdatePromises.length > 0) {
        await Promise.all(customizedProductUpdatePromises);
      }

      const formattedData = {
        quotationItems: formData.items.map(item => ({
          productId: item.productId || null,
          customizedProductId: item.customizedProductId || null,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: item.discount === '' ? 0 : parseInt(item.discount)
        })),
        terms: formData.terms || '',
        notes: formData.notes || '',
        advancePaymentPercentage: parseInt(formData.advancePaymentPercentage) || 20
      };

      const response = await updateQuotation(id, formattedData);
      
      if (response.success) {
        navigate(`/dashboard/quotations/${id}`, { state: { toastMessage: 'Quotation updated successfully!' } });
      } else {
        console.error('Error updating quotation:', response.message);
        setError(response.message || 'Failed to update quotation. Please try again.');
      }
    } catch (error) {
      console.error('Error updating quotation:', error);
      setError(`Failed to update quotation: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-var(--header-height,150px))] p-6 bg-tertiary">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading quotation data...</p>
      </div>
    );
  }
  
  if (!loading && error && !leadData) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-var(--header-height,150px))] p-6 bg-tertiary text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Loading Quotation</p>
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

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="border-b border-fourth pb-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="p-2 rounded-md hover:bg-fourth text-secondary"
            aria-label="Back to quotation details"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-secondary">Edit Quotation {quotationNumber ? `#${quotationNumber}` : ''}</h1>
          </div>
        </div>
      </div>

      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        <form onSubmit={handleSubmit} id="edit-quotation-form" className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flex-1">
          {error && !loading && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
            
          <section>
            <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">Lead Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selected Lead
              </label>
              <div className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-fourth rounded-lg shadow-sm sm:text-sm text-gray-700">
                {leadData ? `${leadData.firstName} ${leadData.lastName} - ${leadData.businessName || 'N/A'}` : 'Loading lead information...'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Lead cannot be changed for an existing quotation.</p>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4 border-b border-fourth pb-2">
              <h2 className="text-xl font-semibold text-secondary">Items</h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-sm text-primary hover:opacity-80 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={item._key || index} className="p-4 border border-fourth rounded-lg md:grid md:grid-cols-12 md:gap-x-4 md:gap-y-2 md:items-end bg-white shadow-sm space-y-3 md:space-y-0">
                  <div className="md:col-span-3">
                    <label htmlFor={`product_id_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <select
                        id={`product_id_${index}`}
                        value={item.productId || (item.customizedProductId ? `custom_${item.customizedProductId}` : '') || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Check if it's a customized product (starts with 'custom_')
                          if (value.startsWith('custom_')) {
                            const customizedProductId = value.replace('custom_', '');
                            handleItemChange(index, 'customizedProductId', customizedProductId);
                          } else {
                            handleItemChange(index, 'productId', value);
                          }
                        }}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm appearance-none text-secondary"
                        required
                      >
                        <option value="">Select Product</option>
                        {/* Show only products of the same type as the quotation's original products */}
                        {leadProductType === 'individual' && (
                          <optgroup label="Individual Products">
                            {originalProducts.map(product => (
                              <option key={product._id} value={product._id}>
                                {product.name} ({product.category || 'General'})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {leadProductType === 'customized' && (
                          <optgroup label="Customized Products">
                            {allCustomizedProducts.map(customizedProduct => (
                              <option key={`custom_${customizedProduct._id}`} value={`custom_${customizedProduct._id}`}>
                                {customizedProduct.name} (Customized) - ₹{customizedProduct.unitPrice}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {leadProductType === 'bundle' && (
                          <optgroup label="Bundle Products">
                            {/* Bundle products would be shown here when supported */}
                            <option disabled>Bundle products not yet supported in quotations</option>
                          </optgroup>
                        )}
                        {!leadProductType && (
                          <option disabled>Unable to determine product type</option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>

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
              
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-primary/50 text-primary rounded-lg hover:bg-primary/10 hover:border-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              >
                <Plus className="w-5 h-5" /> Add Another Item
              </button>
            </div>
          </section>

          {/* Customized Product Details Section */}
          {leadProductType === 'customized' && formData.items.some(item => item.customizedProductId) && (
            <section>
              <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">
                Customized Product Details
              </h2>
              <div className="space-y-6">
                {formData.items
                  .filter(item => item.customizedProductId)
                  .map((item, itemIndex) => {
                    const productId = item.customizedProductId;
                    const productDetails = customizedProductDetails[productId] || {
                      modelNumber: '',
                      description: '',
                      specifications: {
                        power: '',
                        efficiency: '',
                        warranty: '',
                        dimensions: ''
                      },
                      termsAndConditions: '',
                      images: []
                    };
                    const specifications = productDetails.specifications || { power: '', efficiency: '', warranty: '', dimensions: '' };
                    
                    return (
                      <div key={`customized-${productId}`} className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          {(() => {
                            const customizedProduct = allCustomizedProducts.find(cp => cp._id === productId);
                            return customizedProduct ? customizedProduct.name : `Product Details - Item ${itemIndex + 1}`;
                          })()}
                        </h3>

                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Model Number
                            </label>
                            <input
                              type="text"
                              value={productDetails.modelNumber || ''}
                              onChange={(e) => handleCustomizedProductChange(productId, 'modelNumber', e.target.value)}
                              placeholder="Enter model number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={productDetails.description || ''}
                            onChange={(e) => handleCustomizedProductChange(productId, 'description', e.target.value)}
                            placeholder="Enter detailed product description..."
                            rows="4"
                            maxLength="10000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-vertical"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {(productDetails.description || '').length}/10000 characters
                          </p>
                        </div>

                        {/* Specifications */}
                        <div className="mb-6">
                          <h4 className="text-md font-medium text-gray-900 mb-3">Specifications</h4>
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(specifications).map(([field, value]) => (
                                <div key={field} className="flex gap-2">
                                  <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      {field.charAt(0).toUpperCase() + field.slice(1)}
                                      {['power', 'efficiency', 'warranty', 'dimensions'].includes(field) && 
                                        <span className="text-red-500 ml-1">*</span>
                                      }
                                    </label>
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) => handleCustomizedProductChange(productId, `spec_${field}`, e.target.value)}
                                      placeholder={`Enter ${field}`}
                                      required={['power', 'efficiency', 'warranty', 'dimensions'].includes(field)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                                    />
                                  </div>
                                  {!['power', 'efficiency', 'warranty', 'dimensions'].includes(field) && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSpecification(productId, field)}
                                      className="self-end p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Add New Specification */}
                            <div className="border-t border-gray-200 pt-4 mt-4">
                              <h5 className="text-sm font-medium text-gray-900 mb-3">Add New Specification</h5>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                  type="text"
                                  placeholder="Specification Name"
                                  value={newSpecField.name}
                                  onChange={(e) => setNewSpecField(prev => ({ ...prev, name: e.target.value }))}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                                />
                                <input
                                  type="text"
                                  placeholder="Value"
                                  value={newSpecField.value}
                                  onChange={(e) => setNewSpecField(prev => ({ ...prev, value: e.target.value }))}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSpecification(productId)}
                                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm whitespace-nowrap"
                                >
                                  Add Field
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Product Images Display Only */}
                        <div className="mb-6">
                          <h4 className="text-md font-medium text-gray-900 mb-3">Product Images</h4>
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            {/* Display images if they exist */}
                            {productDetails.images && productDetails.images.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {productDetails.images.map((image, index) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={image}
                                      alt={`Product ${index + 1}`}
                                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <p className="text-sm text-gray-500 text-center">
                                  No images uploaded for this product
                                </p>
                                <p className="text-xs text-gray-400 text-center mt-1">
                                  Images can only be added when creating a quotation
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Terms and Conditions */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Terms and Conditions
                          </label>
                          <textarea
                            value={productDetails.termsAndConditions || ''}
                            onChange={(e) => handleCustomizedProductChange(productId, 'termsAndConditions', e.target.value)}
                            placeholder="Enter product-specific terms and conditions..."
                            rows="3"
                            maxLength="5000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-vertical"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {(productDetails.termsAndConditions || '').length}/5000 characters
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          <div className="flex justify-end items-center border-t border-fourth pt-4 mt-6">
            <span className="text-sm font-medium text-gray-700">Total Amount:</span>
            <span className="text-xl font-bold text-primary ml-2">
              ₹{calculateTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

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
                  rows="4"
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
                  rows="4"
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
                       // Do not update for invalid numbers not in range 1-100
                    }
                  }}
                  min="1"
                  max="100"
                  className="w-24 px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400"
                  required
                />
                <span className="ml-2 text-secondary">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum advance payment required (1-100%).</p>
            </div>
          </section>
        </form>

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
            form="edit-quotation-form"
            onClick={handleSubmit} 
            className="px-5 py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px]"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...</> : 'Update Quotation'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setShowConfirmDialog(false);
          navigate(`/dashboard/quotations/${id}`);
        }}
        title="Discard Changes"
        message="Are you sure you want to discard your changes to this quotation? Any unsaved modifications will be lost."
        confirmText="Yes, Discard"
        isDestructive={true}
      />
    </div>
  );
} 