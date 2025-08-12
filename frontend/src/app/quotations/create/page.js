import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown, Upload, X } from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { createQuotation } from '../../../services/quotationService';
import { getLeads } from '../../../services/leadService';
import { getProducts } from '../../../services/productService';
import { getAllCustomizedProducts, updateCustomizedProduct } from '../../../services/customizedProductService';
import { getBundles } from '../../../services/bundleService';

export default function CreateQuotationPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allCustomizedProducts, setAllCustomizedProducts] = useState([]);
  const [allBundles, setAllBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    leadId: '',
    items: [{
      productId: '',
      customizedProductId: '',
      quantity: '',
      unitPrice: '',
      discount: ''
    }],
    terms: "", // Initially empty, will be set based on selected products
    notes: "We appreciate your interest in our services/products. Please feel free to contact us if you have any questions or require further clarification. We look forward to the opportunity to work with you.",
    advancePaymentPercentage: 50
  });
  
  // State for customized product details
  const [customizedProductDetails, setCustomizedProductDetails] = useState({});
  const [newSpecField, setNewSpecField] = useState({ name: '', value: '' });
  const [isDragging, setIsDragging] = useState(false);
  
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to get terms and conditions based on selected products
  const getTermsAndConditionsForProducts = (leadProducts) => {
    // Check if lead has only one product (individual or bundle)
    const supportedProducts = leadProducts.filter(product => !product.isCustomizedProduct && !product.isBundleItem);
    
    if (supportedProducts.length === 1) {
      // Scenario 1 - Case 1: Single product
      const singleProduct = supportedProducts[0];
      
      // Find the product in our data to get terms and conditions
      let productTerms = null;
      
      // Check if it's a regular individual product
      if (!singleProduct.isCustomizedProduct && !singleProduct.isBundleItem) {
        const foundProduct = allProducts.find(p => p._id === singleProduct.id);
        if (foundProduct && foundProduct.termsAndConditions) {
          productTerms = foundProduct.termsAndConditions;
        }
      }
      
      // Check if it's a bundle product
      if (singleProduct.isBundleItem) {
        const foundBundle = allBundles.find(b => b.bundleCode === singleProduct.bundleCode);
        if (foundBundle && foundBundle.termsAndConditions) {
          productTerms = foundBundle.termsAndConditions;
        }
      }
      
      // Return product-specific terms if found, otherwise default template
      return productTerms || getMultiProductTermsTemplate();
    } else if (supportedProducts.length > 1) {
      // Scenario 1 - Case 2: Multiple products
      return getMultiProductTermsTemplate();
    }
    
    // Default case
    return getMultiProductTermsTemplate();
  };

  // Helper function to get the multi-product terms template
  const getMultiProductTermsTemplate = () => {
    return `- Prices quoted are firm and valid for _ days from the date of the offer
- GST @12 % Included
- Transportation:
- Installation: Inclusive
- Payment Terms:
- Delivery:
- Warranty: 
(NOTE: Civil works to be done at site will be the responsibility of the purchaser)`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [leadsData, productsData, customizedProductsData, bundlesData] = await Promise.all([
        getLeads(),
        getProducts(),
        getAllCustomizedProducts(),
        getBundles()
      ]).catch(error => {
        console.error("Error fetching initial data for create quotation:", error);
        throw new Error(`Failed to fetch essential data: ${error.message}`);
      });

      if (!leadsData.success) {
        throw new Error(leadsData.message || 'Failed to fetch leads');
      }

      // Process leads data to properly handle both regular and customized products
      setLeads(leadsData.data.map(lead => ({
        ...lead,
        products: lead.products.map(product => {
          // For customized products (has customizedProductId and isCustomizedProduct = true)
          if (product.isCustomizedProduct && product.customizedProductId) {
            return {
              id: product.customizedProductId._id,
              name: product.customizedProductId.name,
              price: product.customizedProductId.unitPrice,
              unitPrice: product.customizedProductId.unitPrice,
              quantity: product.quantity,
              category: 'Customized',
              isCustomizedProduct: true,
              originalProduct: product, // Keep original structure for reference
              isBundleItem: product.isBundleItem || false,
              bundleCode: product.bundleCode,
              bundleItems: product.bundleItems || []
            };
          }
          // For regular products - check if productId is populated object or just ID string
          else if (product.productId && !product.isCustomizedProduct) {
            // If productId is populated (object)
            if (typeof product.productId === 'object' && product.productId._id) {
              return {
                id: product.productId._id,
                name: product.productId.name,
                price: product.productId.price,
                unitPrice: product.productId.price,
                quantity: product.quantity,
                category: product.productId.category,
                isCustomizedProduct: false,
                originalProduct: product,
                isBundleItem: product.isBundleItem || false,
                bundleCode: product.bundleCode,
                bundleItems: product.bundleItems || []
              };
            } 
            // If productId is just a string (not populated), use product's own fields
            else {
              return {
                id: product.productId, // Use the string ID
                name: product.name,
                price: product.unitPrice,
                unitPrice: product.unitPrice,
                quantity: product.quantity,
                category: product.category,
                isCustomizedProduct: false,
                originalProduct: product,
                isBundleItem: product.isBundleItem || false,
                bundleCode: product.bundleCode,
                bundleItems: product.bundleItems || []
              };
            }
          }
          // Fallback for any other cases (shouldn't happen with proper data)
          else {
            console.warn('Product with unexpected structure:', product);
            return {
              id: product._id || `fallback-${Math.random()}`,
              name: product.name || 'Unknown Product',
              price: product.unitPrice || 0,
              unitPrice: product.unitPrice || 0,
              quantity: product.quantity || 1,
              category: product.category || 'Unknown',
              isCustomizedProduct: product.isCustomizedProduct || false,
              originalProduct: product,
              isBundleItem: product.isBundleItem || false,
              bundleCode: product.bundleCode,
              bundleItems: product.bundleItems || []
            };
          }
        })
      })));

      if (!productsData.success) {
        throw new Error(productsData.message || 'Failed to fetch products');
      }
      setAllProducts(productsData.data);

      if (!customizedProductsData.success) {
        throw new Error(customizedProductsData.message || 'Failed to fetch customized products');
      }
      setAllCustomizedProducts(customizedProductsData.data);

      if (!bundlesData.success) {
        throw new Error(bundlesData.message || 'Failed to fetch bundles');
      }
      setAllBundles(bundlesData.data || []);
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
        customizedProductId: '',
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
          if (field === 'productId' || field === 'customizedProductId') {
            // Clear both fields first
            updatedItem.productId = '';
            updatedItem.customizedProductId = '';
            
            const selectedLead = leads.find(lead => lead._id === prev.leadId);
            const leadProduct = selectedLead?.products.find(p => p.id === value);
            
            if (leadProduct) {
              // This is from the lead's products
              if (leadProduct.isCustomizedProduct) {
                updatedItem.customizedProductId = value;
                
                // Add customized product details to state if not already present
                const existingProduct = allCustomizedProducts.find(cp => cp._id === value);
                if (existingProduct && !customizedProductDetails[value]) {
                  setCustomizedProductDetails(prevDetails => ({
                    ...prevDetails,
                    [value]: {
                      modelNumber: existingProduct.modelNumber || '',
                      description: existingProduct.description || '',
                      specifications: existingProduct.specifications || {
                        power: '',
                        efficiency: '',
                        warranty: '',
                        dimensions: ''
                      },
                      images: existingProduct.imageUrls || []
                    }
                  }));
                }
              } else {
                updatedItem.productId = value;
              }
              updatedItem.unitPrice = parseFloat(leadProduct.unitPrice || leadProduct.price) || 0;
              updatedItem.quantity = parseInt(leadProduct.quantity) || 1;
            } else {
              // Check if it's from all products or all customized products
              const regularProduct = allProducts.find(p => p._id === value);
              const customizedProduct = allCustomizedProducts.find(p => p._id === value);
              
              if (regularProduct) {
                updatedItem.productId = value;
                updatedItem.unitPrice = regularProduct.price || 0;
                updatedItem.quantity = item.quantity === '' ? 1 : item.quantity;
              } else if (customizedProduct) {
                updatedItem.customizedProductId = value;
                updatedItem.unitPrice = customizedProduct.unitPrice || 0;
                updatedItem.quantity = item.quantity === '' ? 1 : item.quantity;
                
                // Add customized product details to state if not already present
                if (!customizedProductDetails[value]) {
                  setCustomizedProductDetails(prevDetails => ({
                    ...prevDetails,
                    [value]: {
                      modelNumber: customizedProduct.modelNumber || '',
                      description: customizedProduct.description || '',
                      specifications: customizedProduct.specifications || {
                        power: '',
                        efficiency: '',
                        warranty: '',
                        dimensions: ''
                      },
                      images: customizedProduct.imageUrls || []
                    }
                  }));
                }
              }
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

  const handleLeadSelect = async (leadId) => {
    const selectedLead = leads.find(lead => lead._id === leadId);
    
    if (selectedLead) {
      // Filter only individual and customized products for quotation (bundle products not supported yet)
      const supportedProducts = selectedLead.products.filter(product => !product.isBundleItem);
      
      // Initialize customized product details, fetching existing data if available
      const customizedProductDetailsInit = {};
      const customizedProducts = selectedLead.products.filter(product => product.isCustomizedProduct);
      
      if (customizedProducts.length > 0) {
        // Fetch existing customized product details from the database
        for (const product of customizedProducts) {
          try {
            // Find the customized product in allCustomizedProducts array
            const existingProduct = allCustomizedProducts.find(cp => cp._id === product.id);
            
            if (existingProduct) {
              // Use existing data from database
              customizedProductDetailsInit[product.id] = {
                modelNumber: existingProduct.modelNumber || '',
                description: existingProduct.description || '',
                specifications: existingProduct.specifications || {
                  power: '',
                  efficiency: '',
                  warranty: '',
                  dimensions: ''
                },
                images: existingProduct.imageUrls || []
              };
            } else {
              // Fallback to empty details if not found
              customizedProductDetailsInit[product.id] = {
                modelNumber: '',
                description: '',
                specifications: {
                  power: '',
                  efficiency: '',
                  warranty: '',
                  dimensions: ''
                },
                images: []
              };
            }
          } catch (error) {
            console.error(`Error fetching details for customized product ${product.id}:`, error);
            // Fallback to empty details on error
            customizedProductDetailsInit[product.id] = {
              modelNumber: '',
              description: '',
              specifications: {
                power: '',
                efficiency: '',
                warranty: '',
                dimensions: ''
              },
              images: []
            };
          }
        }
      }
      
      setCustomizedProductDetails(customizedProductDetailsInit);
      
      // Get automatic terms and conditions based on lead's products
      const automaticTerms = getTermsAndConditionsForProducts(selectedLead.products);
      
      setFormData(prev => ({
        ...prev,
        leadId,
        terms: automaticTerms, // Set terms and conditions automatically
        items: supportedProducts.length > 0 
          ? supportedProducts.map(product => {
              const item = {
                productId: product.isCustomizedProduct ? '' : product.id,
                customizedProductId: product.isCustomizedProduct ? product.id : '',
                quantity: parseInt(product.quantity) || 1,
                unitPrice: parseFloat(product.unitPrice || product.price) || 0,
                discount: 0
              };
              return item;
            })
          : [{ productId: '', customizedProductId: '', quantity: '', unitPrice: '', discount: '' }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        leadId: '',
        terms: '', // Clear terms when no lead is selected
        items: [{ productId: '', customizedProductId: '', quantity: '', unitPrice: '', discount: '' }]
      }));
      setCustomizedProductDetails({});
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
      // First, update any customized products with their details
      for (const item of formData.items) {
        if (item.customizedProductId && customizedProductDetails[item.customizedProductId]) {
          const details = customizedProductDetails[item.customizedProductId];
          
          // Prepare update data (including images as base64)
          const updateData = {
            modelNumber: details.modelNumber || '',
            description: details.description || '',
            specifications: details.specifications || {},
            images: details.images || [], // base64 images
            isCompleted: true
          };
          
          // Update the customized product with all data including images
          await updateCustomizedProduct(item.customizedProductId, updateData);
        }
      }

      // Create the quotation
      const formattedData = {
        leadId: formData.leadId,
        quotationItems: formData.items.map(item => ({
          productId: item.productId || null,
          customizedProductId: item.customizedProductId || null,
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
            ...prev[productId]?.specifications,
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

  const handleImageUpload = (productId, files) => {
    const newImages = Array.from(files).filter(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return false;
      }
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return false;
      }
      return true;
    });

    // Convert files to base64
    Promise.all(
      newImages.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    ).then(base64Images => {
      setCustomizedProductDetails(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          images: [...(prev[productId]?.images || []), ...base64Images].slice(0, 5) // Max 5 images
        }
      }));
    }).catch(error => {
      console.error('Error converting images to base64:', error);
      setError('Failed to process images');
    });
  };

  const handleRemoveImage = (productId, imageIndex) => {
    setCustomizedProductDetails(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        images: (prev[productId]?.images || []).filter((_, index) => index !== imageIndex)
      }
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e, productId) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleImageUpload(productId, files);
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-var(--header-height,150px))] p-6 bg-tertiary">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading data...</p>
      </div>
    );
  }
  
  if (error && !leads.length && !allProducts.length && !allCustomizedProducts.length && !allBundles.length) {
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
          {error && (leads.length > 0 || allProducts.length > 0 || allCustomizedProducts.length > 0 || allBundles.length > 0) && (
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
                        value={item.productId || item.customizedProductId || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const selectedLead = leads.find(lead => lead._id === formData.leadId);
                          
                          // Check if the selected value is from lead's products
                          const leadProduct = selectedLead?.products.find(p => p.id === value);
                          
                          if (leadProduct) {
                            if (leadProduct.isCustomizedProduct) {
                              handleItemChange(index, 'customizedProductId', value);
                            } else {
                              handleItemChange(index, 'productId', value);
                            }
                          } else {
                            // Check if it's from all products or all customized products
                            const regularProduct = allProducts.find(p => p._id === value);
                            const customizedProduct = allCustomizedProducts.find(p => p._id === value);
                            
                            if (regularProduct) {
                              handleItemChange(index, 'productId', value);
                            } else if (customizedProduct) {
                              handleItemChange(index, 'customizedProductId', value);
                            }
                          }
                        }}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm appearance-none text-secondary"
                        required
                        disabled={!formData.leadId && !allProducts.length && !allCustomizedProducts.length && !allBundles.length}
                      >
                        <option value="">Select Product</option>
                        {selectedLead?.products.length > 0 && (
                          <optgroup key="lead-products" label="Lead's Interested Products">
                            {selectedLead.products.map((product, productIndex) => {
                              const uniqueKey = product.isCustomizedProduct 
                                ? `lead-custom-${product.id || productIndex}`
                                : `lead-regular-${product.id || productIndex}`;
                              
                              return (
                                <option 
                                  key={uniqueKey}
                                  value={product.isBundleItem ? '' : product.id}
                                  disabled={product.isBundleItem}
                                  className={product.isBundleItem ? 'text-gray-400 italic' : ''}
                                >
                                  {product.name}
                                  {product.isBundleItem ? ` (Bundle: ${product.bundleCode} - Not yet supported)` : ''}
                                  {product.isCustomizedProduct ? ' (Customized)' : ''}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        
                        {/* Show available products based on lead's product type */}
                        {selectedLead && (
                          <>
                            {/* If lead has individual products, show other individual products */}
                            {selectedLead.products.some(p => !p.isCustomizedProduct && !p.isBundleItem) && (
                              <optgroup key="other-individual-products" label="Other Individual Products">
                                {allProducts
                                  .filter(p => !selectedLead.products.some(sp => sp.id === p._id))
                                  .map(product => (
                                    <option key={`individual-${product._id}`} value={product._id}>
                                      {product.name} ({product.category})
                                    </option>
                                  ))}
                              </optgroup>
                            )}
                            
                            {/* If lead has customized products, show other customized products */}
                            {selectedLead.products.some(p => p.isCustomizedProduct) && (
                              <optgroup key="other-customized-products" label="Other Customized Products">
                                {allCustomizedProducts
                                  .filter(p => !selectedLead.products.some(sp => sp.id === p._id))
                                  .map(product => (
                                    <option key={`customized-${product._id}`} value={product._id}>
                                      {product.name} (Customized - {product.leadId?.firstName || 'Unknown'} {product.leadId?.lastName || ''})
                                    </option>
                                  ))}
                              </optgroup>
                            )}
                          </>
                        )}
                        
                        {/* When no lead is selected, show all products */}
                        {!selectedLead && (
                          <>
                            <optgroup key="all-individual-products" label="Individual Products">
                              {allProducts.map(product => (
                                <option key={`all-individual-${product._id}`} value={product._id}>
                                  {product.name} ({product.category})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup key="all-customized-products" label="Customized Products">
                              {allCustomizedProducts.map(product => (
                                <option key={`all-customized-${product._id}`} value={product._id}>
                                  {product.name} (Customized - {product.leadId?.firstName || 'Unknown'} {product.leadId?.lastName || ''})
                                </option>
                              ))}
                            </optgroup>
                          </>
                        )}
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

          {/* Customized Product Details Section */}
          {formData.items.some(item => item.customizedProductId) && (
            <section>
              <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">
                Customized Product Details
              </h2>
              <div className="space-y-6">
                {formData.items
                  .filter(item => item.customizedProductId)
                  .map((item, itemIndex) => {
                    const productId = item.customizedProductId;
                    const productDetails = customizedProductDetails[productId] || {};
                    const specifications = productDetails.specifications || { power: '', efficiency: '', warranty: '', dimensions: '' };
                    
                    // Find the product name from either selectedLead products or allCustomizedProducts
                    let productName = `Product Details - Item ${itemIndex + 1}`;
                    
                    // First check if it's from the selected lead's products
                    const leadProduct = selectedLead?.products.find(p => p.id === productId && p.isCustomizedProduct);
                    if (leadProduct) {
                      productName = `${leadProduct.name} - Additional Details`;
                    } else {
                      // Check if it's from allCustomizedProducts
                      const customizedProduct = allCustomizedProducts.find(cp => cp._id === productId);
                      if (customizedProduct) {
                        productName = `${customizedProduct.name} - Additional Details`;
                      }
                    }
                    
                    return (
                      <div key={`customized-${productId}`} className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          {productName}
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

                        {/* Image Upload */}
                        <div className="mb-6">
                          <h4 className="text-md font-medium text-gray-900 mb-3">Product Images</h4>
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            {/* Image Upload Area */}
                            <div
                              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                isDragging 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                              }`}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, productId)}
                              onClick={() => document.getElementById(`image-upload-${productId}`).click()}
                            >
                              <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
                              <p className={`text-sm ${isDragging ? 'text-primary' : 'text-gray-500'} text-center`}>
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className={`text-xs ${isDragging ? 'text-primary' : 'text-gray-500'} text-center`}>
                                PNG, JPG or JPEG (MAX. 5MB) • Up to 5 images
                              </p>
                            </div>
                            <input
                              id={`image-upload-${productId}`}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleImageUpload(productId, e.target.files)}
                              className="hidden"
                            />

                            {/* Display uploaded images */}
                            {productDetails.images && productDetails.images.length > 0 && (
                              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                                {productDetails.images.map((image, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={image}
                                      alt={`Product ${index + 1}`}
                                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImage(productId, index)}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

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