import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Calendar, Paperclip, ChevronDown, Check, ArrowLeft, Plus, Trash2, X, AlertTriangle, Loader2, Package } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createLead, getLead, updateLead } from '../../services/leadService';
import { getProducts } from '../../services/productService';
import { getPowerPlantConfigurations } from '../../services/bundleService';
import { createCustomizedProduct, updateCustomizedProduct } from '../../services/customizedProductService';
import { generateUniqueId, ensureUniqueIds } from '../../utils/generateId';

// Custom styles for better mobile experience
const customStyles = `
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
  
  @media (max-width: 640px) {
    .touch-target {
      min-height: 48px;
      padding: 12px 16px;
    }
  }
`;

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Yes, Confirm', cancelText = 'Cancel', isDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{customStyles}</style>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
        <div className="bg-tertiary p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-secondary">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-fourth touch-target">
              <X className="w-5 h-5 text-gray-500"/>
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            {message}
          </p>
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors duration-150 ease-in-out touch-target"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-opacity duration-150 ease-in-out flex items-center justify-center min-w-[100px] touch-target 
                          ${isDestructive 
                              ? 'bg-red-600 hover:bg-red-700 text-tertiary' 
                              : 'bg-primary hover:opacity-90 text-tertiary'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const FORM_OPTIONS = {
  leadTypes: [
    { value: 'referral', label: 'Referral' },
    { value: 'indiamart', label: 'IndiaMART' },
    { value: 'exhibition', label: 'Exhibition' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'website', label: 'Website Inquiry' },
    { value: 'cold_call', label: 'Cold Call' },
    { value: 'walk_in', label: 'Walk-in' },
    { value: 'paper_ad', label: 'Paper Ad' },
    { value: 'existing_customer', label: 'Existing Customer' },
    { value: 'other', label: 'Other' }
  ],
  customerTypes: [
    { value: 'end_user', label: 'End User' },
    { value: 'plumber', label: 'Plumber' },
    { value: 'dealer', label: 'Dealer' },
    { value: 'builder', label: 'Builder' },
    { value: 'other', label: 'Other' }
  ],
  statuses: [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'closed_won', label: 'Closed - Won' },
    { value: 'closed_lost', label: 'Closed - Lost' }
  ],

};


  const defaultFormState = {
    leadType: '',
    customLeadType: '',
    status: 'pending',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    whatsapp: '',
    billingAddress: '',
    shippingAddress: '',
    businessName: '',
    customerType: '',
    customCustomerType: '',
    gstinUin: '',
    products: [
    { id: `${Date.now()}_0`, category: '', name: '', quantity: '1', unitPrice: '0', totalPrice: '0', productId: '' }
    ],
    customizedProducts: [
    { id: `${Date.now()}_0`, name: '', unitPrice: '0', quantity: '1', totalPrice: '0' }
    ],
    productRequirements: '',
    dateCollected: new Date().toISOString().split('T')[0],
    followUpRequired: false,
    followUpDateTime: '',
    notes: ''
  };


export default function LeadForm() {
  const { state: locationState } = useLocation();
  const navigate = useNavigate();
  const { id: leadId } = useParams();

  const [formData, setFormData] = useState(defaultFormState);
  const [initialFormData, setInitialFormData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingLead, setIsLoadingLead] = useState(false);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogProps, setConfirmDialogProps] = useState({});
  const [pendingNavigationPath, setPendingNavigationPath] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [sectionErrors, setSectionErrors] = useState({});

  const sectionRefs = {
    leadInfo: useRef(null),
    personalInfo: useRef(null),
    businessInfo: useRef(null),
    productInfo: useRef(null),
    additionalInfo: useRef(null)
  };

  const [productsData, setProductsData] = useState({});
  const [productCategories, setProductCategories] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productFetchError, setProductFetchError] = useState(null);
  
  // Bundle-related state
  const [bundlesData, setBundlesData] = useState({});
  const [isLoadingBundles, setIsLoadingBundles] = useState(true);
  const [bundleFetchError, setBundleFetchError] = useState(null);
  const [selectedProductType, setSelectedProductType] = useState('individual'); // 'individual', 'bundle', or 'customized'
  const [selectedBundles, setSelectedBundles] = useState([]); // Array of selected bundles with quantities

  // Customized product state
  const [customizedProducts, setCustomizedProducts] = useState([]);

  // Geolocation state
  const [geo, setGeo] = useState({ latitude: '', longitude: '' });
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | success | error
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    const fetchProductsAndBundles = async () => {
      setIsLoadingProducts(true);
      setIsLoadingBundles(true);
      setProductFetchError(null);
      setBundleFetchError(null);
      
      try {
        // Fetch regular products
        const productsResponse = await getProducts();
        if (productsResponse.success && Array.isArray(productsResponse.data)) {
          const productsByCategory = {};
          const categories = new Set();
          productsResponse.data.forEach(product => {
            const category = product.category || 'uncategorized';
            categories.add(category);
            if (!productsByCategory[category]) {
              productsByCategory[category] = [];
            }
            productsByCategory[category].push({ 
              _id: product._id, 
              name: product.name, 
              price: product.price,
              brand: product.brand 
            });
          });
          setProductsData(productsByCategory);
          setProductCategories(Array.from(categories).sort());
        } else {
          throw new Error(productsResponse.message || 'Product data is not in expected format.');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProductFetchError('Failed to load products. Some features may be limited.');
      } finally {
        setIsLoadingProducts(false);
      }

      try {
        // Fetch power plant bundles
        const bundlesResponse = await getPowerPlantConfigurations();
        if (bundlesResponse.success && bundlesResponse.data) {
          setBundlesData(bundlesResponse.data);
        } else {
          throw new Error(bundlesResponse.message || 'Bundle data is not in expected format.');
        }
      } catch (error) {
        console.error('Error fetching bundles:', error);
        setBundleFetchError('Failed to load power plant bundles. Some features may be limited.');
      } finally {
        setIsLoadingBundles(false);
      }
    };
    
    fetchProductsAndBundles();
  }, []);

  const resetFormToDefaults = useCallback(() => {
    const newDefaultState = {
      ...defaultFormState,
      products: [{ 
        id: generateUniqueId(), 
        category: '', 
        name: '', 
        quantity: '1', 
        unitPrice: '0', 
        totalPrice: '0', 
        productId: '' 
      }],
      dateCollected: new Date().toISOString().split('T')[0]
    };
    setFormData(newDefaultState);
    setInitialFormData(newDefaultState);
    setHasUnsavedChanges(false);
    setSectionErrors({});
    setSubmissionError(null);
    setSelectedProductType('individual');
    setSelectedBundles([]);
    setCustomizedProducts([]);
  }, []);

  useEffect(() => {
    const fetchLeadDetails = async (id) => {
      setIsLoadingLead(true);
      setSubmissionError(null);
      try {
        const response = await getLead(id);
        if (response.success) {
          const leadData = response.data;
          const formattedLead = {
            ...defaultFormState,
            ...leadData,
            dateCollected: leadData.dateCollected ? new Date(leadData.dateCollected).toISOString().split('T')[0] : defaultFormState.dateCollected,
            followUpDateTime: leadData.followUpDateTime ? new Date(leadData.followUpDateTime).toISOString().slice(0, 16) : '',
            products: (leadData.products && leadData.products.length > 0) 
              ? leadData.products.map((p, index) => ({ ...p, id: p.id || p._id || `${Date.now()}_${index}` })) 
              : [{ ...defaultFormState.products[0], id: `${Date.now()}_0` }],
          };
          
          setFormData(formattedLead);
          setInitialFormData(JSON.parse(JSON.stringify(formattedLead)));
          setIsEditMode(true);

          // Set product type and restore bundle data
          if (leadData.selectedProductType === 'bundle' && leadData.products?.some(p => p.isBundleItem)) {
            setSelectedProductType('bundle');
            // Convert products to selected bundles format
            const bundleProducts = leadData.products.filter(p => p.isBundleItem);
            const bundlesToRestore = bundleProducts.map(p => ({
              id: `bundle_${Date.now()}_${Math.random()}`,
              bundleId: p.productId,
              bundleCode: p.bundleCode,
              name: p.name,
              quantity: parseInt(p.quantity) || 1,
              unitPrice: parseFloat(p.unitPrice) || 0,
              totalPrice: parseFloat(p.totalPrice) || 0,
              bundleItems: p.bundleItems || []
            }));
            setSelectedBundles(bundlesToRestore);
          } else if (leadData.selectedProductType === 'customized' && leadData.products?.some(p => p.isCustomizedProduct)) {
            setSelectedProductType('customized');
            // Convert products to customized products format
            const customizedProductData = leadData.products
              .filter(p => p.isCustomizedProduct)
              .map(p => ({
                id: `custom_${Date.now()}_${Math.random()}`,
                customizedProductId: p.customizedProductId,
                name: p.name,
                quantity: parseInt(p.quantity) || 1,
                unitPrice: parseFloat(p.unitPrice) || 0
              }));
            setCustomizedProducts(customizedProductData);
          } else {
            setSelectedProductType('individual');
          }
        } else {
          throw new Error(response.message || 'Failed to fetch lead details.');
        }
      } catch (err) {
        console.error('Failed to fetch lead:', err);
        setSubmissionError(err.message || 'Could not load lead data. Please try again.');
        setIsEditMode(false);
      } finally {
        setIsLoadingLead(false);
      }
    };

    if (leadId) {
      fetchLeadDetails(leadId);
    } else if (locationState?.lead) {
      const leadData = locationState.lead;
      const formattedLead = {
        ...defaultFormState,
        ...leadData,
        dateCollected: leadData.dateCollected ? new Date(leadData.dateCollected).toISOString().split('T')[0] : defaultFormState.dateCollected,
        followUpDateTime: leadData.followUpDateTime ? new Date(leadData.followUpDateTime).toISOString().slice(0, 16) : '',
        products: (leadData.products && leadData.products.length > 0) 
            ? leadData.products.map((p, index) => ({ ...p, id: p.id || p._id || `${Date.now()}_${index}` })) 
            : [{ ...defaultFormState.products[0], id: `${Date.now()}_0` }],
      };
      
      setFormData(formattedLead);
      setInitialFormData(JSON.parse(JSON.stringify(formattedLead)));
      setIsEditMode(true);

      // Set product type and restore bundle data
      if (leadData.selectedProductType === 'bundle' && leadData.products?.some(p => p.isBundleItem)) {
        setSelectedProductType('bundle');
        // Convert products to selected bundles format
        const bundleProducts = leadData.products.filter(p => p.isBundleItem);
        const bundlesToRestore = bundleProducts.map(p => ({
          id: `bundle_${Date.now()}_${Math.random()}`,
          bundleId: p.productId,
          bundleCode: p.bundleCode,
          name: p.name,
          quantity: parseInt(p.quantity) || 1,
          unitPrice: parseFloat(p.unitPrice) || 0,
          totalPrice: parseFloat(p.totalPrice) || 0,
          bundleItems: p.bundleItems || []
        }));
        setSelectedBundles(bundlesToRestore);
      } else if (leadData.selectedProductType === 'customized' && leadData.products?.some(p => p.isCustomizedProduct)) {
        setSelectedProductType('customized');
        // Convert products to customized products format
        const customizedProductData = leadData.products
          .filter(p => p.isCustomizedProduct)
          .map(p => ({
            id: `custom_${Date.now()}_${Math.random()}`,
            customizedProductId: p.customizedProductId,
            name: p.name,
            quantity: parseInt(p.quantity) || 1,
            unitPrice: parseFloat(p.unitPrice) || 0
          }));
        setCustomizedProducts(customizedProductData);
      } else {
        setSelectedProductType('individual');
      }
    } else {
      resetFormToDefaults();
      setIsEditMode(false);
    }
  }, [leadId, locationState, resetFormToDefaults]);

  useEffect(() => {
    const currentDataString = JSON.stringify(formData);
    const initialDataString = JSON.stringify(initialFormData);
    setHasUnsavedChanges(currentDataString !== initialDataString);
  }, [formData, initialFormData]);

  // Restore bundle selection details after bundles data is loaded (for edit mode)
  useEffect(() => {
    if (
      isEditMode &&
      selectedProductType === 'bundle' &&
      selectedBundles.length > 0 &&
      Object.keys(bundlesData).length > 0
    ) {
      const allBundles = Object.values(bundlesData).flat();
      const updatedBundles = selectedBundles.map(selectedBundle => {
        const foundBundle = allBundles.find(b => b._id === selectedBundle.bundleId);
        
        if (foundBundle) {
          return {
            ...selectedBundle,
            bundleData: foundBundle // Store full bundle data for reference
          };
        } else {
          console.warn('Bundle not found in available bundles:', selectedBundle.bundleId);
          return selectedBundle;
        }
      });
      
      // Check if any bundles were not found
      const missingBundles = selectedBundles.filter(sb => 
        !allBundles.find(b => b._id === sb.bundleId)
      );
      
      if (missingBundles.length > 0) {
        const missingNames = missingBundles.map(b => b.name).join(', ');
        setSubmissionError(`Some original bundles are no longer available: ${missingNames}. Please select different bundles.`);
      }
      
      setSelectedBundles(updatedBundles);
      console.log('Bundles restored for edit mode:', updatedBundles.length);
    }
  }, [isEditMode, selectedProductType, bundlesData]);

  // Ensure all products have unique IDs
  useEffect(() => {
    if (formData.products && formData.products.some(p => !p.id)) {
      setFormData(prev => ({
        ...prev,
        products: ensureUniqueIds(prev.products)
      }));
    }
  }, [formData.products]);

  const handleNavigate = (path) => {
    if (hasUnsavedChanges) {
      setPendingNavigationPath(path);
      setConfirmDialogProps({
        isOpen: true,
        title: isEditMode ? 'Unsaved Changes' : 'Discard New Lead',
        message: isEditMode 
          ? 'You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.' 
          : 'The new lead information has not been saved. Are you sure you want to discard it?',
        onConfirm: () => {
          setShowConfirmDialog(false);
          setHasUnsavedChanges(false);
          navigate(path);
        },
        onClose: () => setShowConfirmDialog(false),
        isDestructive: true,
        confirmText: 'Yes, Discard'
      });
      setShowConfirmDialog(true);
    } else {
      navigate(path);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (value ?? '') 
    }));
  };

  const handleProductPropertyChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    
    if (index < updatedProducts.length) {
      updatedProducts[index] = { ...updatedProducts[index], [field]: value ?? '' };
      
      // Ensure product has an ID
      if (!updatedProducts[index].id) {
        updatedProducts[index].id = generateUniqueId();
      }
      
      if (field === 'category') {
        updatedProducts[index].name = '';
        updatedProducts[index].unitPrice = '0';
        updatedProducts[index].totalPrice = '0';
        updatedProducts[index].productId = '';
      }

      if (field === 'name' && value) {
        const category = updatedProducts[index].category;
        const selectedProduct = productsData[category]?.find(p => p.name === value);
        if (selectedProduct) {
          updatedProducts[index].unitPrice = selectedProduct.price.toString();
          updatedProducts[index].totalPrice = (parseFloat(updatedProducts[index].quantity || '1') * parseFloat(selectedProduct.price)).toString();
          updatedProducts[index].productId = selectedProduct._id;
        }
      }
      
      // Calculate totalPrice when quantity changes
      if (field === 'quantity') {
        const quantity = parseFloat(value || '0');
        const unitPrice = parseFloat(updatedProducts[index].unitPrice || '0');
        updatedProducts[index].totalPrice = ((quantity || 0) * (unitPrice || 0)).toString();
      }
    }
    
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  const addProductField = () => {
    setFormData(prev => ({
      ...prev,

      products: [...prev.products, { ...defaultFormState.products[0], id: `${Date.now()}_${prev.products.length}` }]

    }));
  };

  const removeProductField = (index) => {
    if (formData.products.length > 1) {
      setFormData(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));
    }
  };

  const increaseQuantity = (index) => {
    const currentQuantity = parseInt(formData.products[index].quantity) || 0;
    handleProductPropertyChange(index, 'quantity', (currentQuantity + 1).toString());
  };

  const decreaseQuantity = (index) => {
    const currentQuantity = parseInt(formData.products[index].quantity) || 0;
    if (currentQuantity > 1) {
      handleProductPropertyChange(index, 'quantity', (currentQuantity - 1).toString());
    }
  };

  // Customized Products Handlers
  const addCustomizedProduct = () => {
    setCustomizedProducts(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}_${prev.length}`,
        name: '',
        quantity: 1,
        unitPrice: 0
      }
    ]);
  };

  const removeCustomizedProduct = (index) => {
    setCustomizedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleCustomizedProductChange = (index, field, value) => {
    setCustomizedProducts(prev => {
      const updated = [...prev];
      if (index < updated.length) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleProductTypeChange = (type) => {
    // If in edit mode and there are existing products, show confirmation
    if (isEditMode && (formData.products.length > 0 || selectedBundles.length > 0 || customizedProducts.length > 0) && type !== selectedProductType) {
      const getTypeText = (productType) => {
        switch(productType) {
          case 'bundle': return 'Solar Power Plant System';
          case 'customized': return 'Customized Products';
          default: return 'Individual Products';
        }
      };
      
      const currentTypeText = getTypeText(selectedProductType);
      const newTypeText = getTypeText(type);
      
      setConfirmDialogProps({
        isOpen: true,
        title: 'Change Product Type',
        message: `Are you sure you want to change from "${currentTypeText}" to "${newTypeText}"? This will clear all current product selections and cannot be undone.`,
        onConfirm: () => {
          performProductTypeChange(type);
          setShowConfirmDialog(false);
        },
        onClose: () => setShowConfirmDialog(false),
        confirmText: 'Yes, Change Type',
        isDestructive: true
      });
      setShowConfirmDialog(true);
    } else {
      performProductTypeChange(type);
    }
  };

  const performProductTypeChange = (type) => {
    setSelectedProductType(type);
    if (type === 'individual') {
      setSelectedBundles([]);
      setCustomizedProducts([]);
      // Reset to default individual products
      setFormData(prev => ({
        ...prev,
        products: [{ id: `${Date.now()}_0`, category: '', name: '', quantity: '1', unitPrice: '0', totalPrice: '0', productId: '' }]
      }));
    } else if (type === 'bundle') {
      // Reset products for bundle mode
      setSelectedBundles([]);
      setCustomizedProducts([]);
      setFormData(prev => ({
        ...prev,
        products: []
      }));
    } else if (type === 'customized') {
      // Reset for customized products mode
      setSelectedBundles([]);
      setFormData(prev => ({
        ...prev,
        products: []
      }));
      // Initialize with one empty customized product
      setCustomizedProducts([{
        id: `custom_${Date.now()}_0`,
        name: '',
        quantity: 1,
        unitPrice: 0
      }]);
    }
  };

  const addBundleSelection = (bundle) => {
    const newBundle = {
      id: `bundle_${Date.now()}_${Math.random()}`,
      bundleId: bundle._id,
      bundleCode: bundle.bundleCode,
      name: bundle.name,
      quantity: 1,
      unitPrice: bundle.price,
      totalPrice: bundle.price,
      bundleData: bundle
    };
    
    setSelectedBundles(prev => [...prev, newBundle]);
    updateFormDataWithBundles([...selectedBundles, newBundle]);
  };

  const removeBundleSelection = (bundleId) => {
    const updatedBundles = selectedBundles.filter(b => b.id !== bundleId);
    setSelectedBundles(updatedBundles);
    updateFormDataWithBundles(updatedBundles);
  };

  const updateBundleQuantity = (bundleId, quantity) => {
    const updatedBundles = selectedBundles.map(bundle => 
      bundle.id === bundleId 
        ? { 
            ...bundle, 
            quantity: parseInt(quantity) || 1,
            totalPrice: (bundle.unitPrice * (parseInt(quantity) || 1))
          }
        : bundle
    );
    setSelectedBundles(updatedBundles);
    updateFormDataWithBundles(updatedBundles);
  };

  const updateFormDataWithBundles = (bundles) => {
    const bundleProducts = bundles.map(bundle => ({
      id: bundle.id,
      category: 'solar_power_plant_system',
      name: bundle.name,
      quantity: bundle.quantity.toString(),
      unitPrice: bundle.unitPrice.toString(),
      totalPrice: bundle.totalPrice.toString(),
      productId: bundle.bundleId,
      bundleCode: bundle.bundleCode,
      isBundleItem: true,
      bundleItems: bundle.bundleData?.items || bundle.bundleItems || []
    }));
    
    setFormData(prev => ({
      ...prev,
      products: bundleProducts
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.leadType) errors.leadInfo = { ...errors.leadInfo, leadType: 'Lead Type is required.' };
    if (formData.leadType === 'other' && !formData.customLeadType) errors.leadInfo = { ...errors.leadInfo, customLeadType: 'Please specify the lead type.' };
    if (!formData.status) errors.leadInfo = { ...errors.leadInfo, status: 'Status is required.' };
    if (!formData.dateCollected) errors.leadInfo = { ...errors.leadInfo, dateCollected: 'Enquiry Date is required.' };

    if (!formData.firstName) errors.personalInfo = { ...errors.personalInfo, firstName: 'First Name is required.' };
    if (!formData.email) errors.personalInfo = { ...errors.personalInfo, email: 'Email is required.' };
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.personalInfo = { ...errors.personalInfo, email: 'Email is invalid.' };
    if (!formData.phone) errors.personalInfo = { ...errors.personalInfo, phone: 'Phone number is required.' };
    if (!formData.whatsapp) errors.personalInfo = { ...errors.personalInfo, whatsapp: 'WhatsApp number is required.' };
    if (!formData.billingAddress) errors.personalInfo = { ...errors.personalInfo, billingAddress: 'Billing address is required.' };

    if (!formData.customerType) errors.businessInfo = { ...errors.businessInfo, customerType: 'Customer Type is required.' };
    if (formData.customerType === 'other' && !formData.customCustomerType) errors.businessInfo = { ...errors.businessInfo, customCustomerType: 'Please specify the customer type.' };
    
    // Product validation based on type
    if (selectedProductType === 'individual') {
      const validProducts = formData.products.filter(p => p.category && p.name && p.quantity && p.unitPrice && p.totalPrice && p.productId);
      if (validProducts.length === 0) {
        errors.productInfo = { general: 'At least one complete product entry is required.' };
      } else {
        formData.products.forEach((product, index) => {
          if ((product.category || product.name || product.quantity || product.unitPrice || product.totalPrice) && 
              !(product.category && product.name && product.quantity && product.unitPrice && product.totalPrice && product.productId)) {
            if (!errors.productInfo) errors.productInfo = {}; 
            errors.productInfo[index] = 'Please complete all fields (Category, Product, Quantity) for this product.';
          }
        });
      }
    } else if (selectedProductType === 'bundle') {
      if (selectedBundles.length === 0) {
        errors.productInfo = { general: 'Please select at least one Solar Power Plant System bundle.' };
      } else {
        // Validate each bundle
        selectedBundles.forEach((bundle, index) => {
          if (bundle.quantity < 1) {
            if (!errors.productInfo) errors.productInfo = {};
            errors.productInfo[`bundle_${index}`] = `Bundle "${bundle.name}" quantity must be at least 1.`;
          }
        });
      }
    } else if (selectedProductType === 'customized') {
      if (customizedProducts.length === 0) {
        errors.productInfo = { general: 'Please add at least one customized product.' };
      } else {
        // Validate each customized product
        const validCustomizedProducts = customizedProducts.filter(p => p.name && p.quantity > 0 && p.unitPrice > 0);
        if (validCustomizedProducts.length === 0) {
          errors.productInfo = { general: 'At least one complete customized product entry is required.' };
        } else {
          customizedProducts.forEach((product, index) => {
            if (!product.name || product.quantity <= 0 || product.unitPrice <= 0) {
              if (!errors.productInfo) errors.productInfo = {};
              errors.productInfo[`custom_${index}`] = 'Please complete all fields (Product Name, Quantity > 0, Unit Price > 0) for this customized product.';
            }
          });
        }
      }
    }

    if (formData.followUpRequired && !formData.followUpDateTime) {
      errors.additionalInfo = { ...errors.additionalInfo, followUpDateTime: 'Follow-up date and time is required.' };
    }

    setSectionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Geolocation handler
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoStatus('loading');
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoStatus('success');
      },
      (error) => {
        setGeoStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please allow access to use this feature.');
        } else {
          setGeoError('Unable to retrieve your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setSubmissionError('Please correct the errors in the form.');
      const firstErrorKey = Object.keys(sectionErrors).find(key => Object.keys(sectionErrors[key] || {}).length > 0);
      if (firstErrorKey && sectionRefs[firstErrorKey]?.current) {
        sectionRefs[firstErrorKey].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      let productsToSubmit = [];
      
      if (selectedProductType === 'individual') {
        productsToSubmit = formData.products
          .filter(p => p.category && p.name && p.quantity && p.unitPrice && p.totalPrice && p.productId)
          .map(p => ({
            productId: p.productId,
            category: p.category,
            name: p.name,
            quantity: parseInt(p.quantity, 10),
            unitPrice: parseFloat(p.unitPrice),
            totalPrice: parseFloat(p.totalPrice),
          }));
      } else if (selectedProductType === 'bundle') {
        productsToSubmit = selectedBundles.map(bundle => ({
          productId: bundle.bundleId,
          bundleCode: bundle.bundleCode,
          category: 'solar_power_plant_system',
          name: bundle.name,
          quantity: parseInt(bundle.quantity, 10),
          unitPrice: parseFloat(bundle.unitPrice),
          totalPrice: parseFloat(bundle.totalPrice),
          isBundleItem: true,
          bundleItems: bundle.bundleData?.items || bundle.bundleItems || []
        }));
      } else if (selectedProductType === 'customized') {
        // For customized products, we'll include basic product info in the lead
        // and create detailed customized product records after lead creation
        productsToSubmit = customizedProducts
          .filter(p => p.name && p.quantity > 0 && p.unitPrice > 0)
          .map(product => ({
            category: 'customized',
            name: product.name,
            quantity: parseInt(product.quantity, 10),
            unitPrice: parseFloat(product.unitPrice),
            totalPrice: parseFloat(product.quantity * product.unitPrice),
            isCustomizedProduct: true
          }));
      }

      const payload = { 
        ...formData, 
        products: productsToSubmit,
        selectedProductType: selectedProductType
      };
      payload.products.forEach(p => delete p.id);
      // Add geolocation if available
      if (geo.latitude && geo.longitude) {
        payload.latitude = geo.latitude;
        payload.longitude = geo.longitude;
      }

      const response = isEditMode ? await updateLead(leadId, payload) : await createLead(payload);

      if (response.success) {
        // If creating a new lead with customized products, create the detailed customized product records
        if (!isEditMode && selectedProductType === 'customized' && customizedProducts.length > 0) {
          try {
            const createdLeadId = response.data._id;
            const customizedProductPromises = customizedProducts
              .filter(p => p.name && p.quantity > 0 && p.unitPrice > 0)
              .map(async (product, index) => {
                const customizedProductData = {
                  name: product.name,
                  unitPrice: product.unitPrice,
                  leadId: createdLeadId
                };
                const result = await createCustomizedProduct(customizedProductData);
                return { ...result, originalIndex: index };
              });

            const createdCustomizedProducts = await Promise.all(customizedProductPromises);
            
            // Update the lead with the customized product IDs
            const updatedProducts = productsToSubmit.map((product, index) => {
              const createdProduct = createdCustomizedProducts.find(cp => cp.originalIndex === index);
              if (createdProduct && createdProduct.success) {
                return {
                  ...product,
                  customizedProductId: createdProduct.data._id
                };
              }
              return product;
            });

            // Update the lead with the customizedProductId references
            await updateLead(createdLeadId, {
              products: updatedProducts
            });

            console.log('Customized product records created and lead updated successfully');
          } catch (customizedProductError) {
            console.error('Error creating customized product records:', customizedProductError);
            // Don't fail the whole operation if customized product creation fails
            // The lead was created successfully with the basic product info
          }
        }

        // If editing a lead with customized products, update the customized product records
        if (isEditMode && selectedProductType === 'customized' && customizedProducts.length > 0) {
          try {
            const customizedProductPromises = customizedProducts
              .filter(p => p.name && p.quantity > 0 && p.unitPrice > 0)
              .map(async (product, index) => {
                const customizedProductData = {
                  name: product.name,
                  unitPrice: product.unitPrice,
                  leadId: leadId
                };

                if (product.customizedProductId) {
                  // Update existing customized product
                  const result = await updateCustomizedProduct(product.customizedProductId, customizedProductData);
                  return { ...result, originalIndex: index, existingId: product.customizedProductId };
                } else {
                  // Create new customized product for this lead
                  const result = await createCustomizedProduct(customizedProductData);
                  return { ...result, originalIndex: index };
                }
              });

            const processedCustomizedProducts = await Promise.all(customizedProductPromises);
            
            // Update lead products with any new customized product IDs
            let needsLeadUpdate = false;
            const updatedProducts = productsToSubmit.map((product, index) => {
              const processedProduct = processedCustomizedProducts.find(cp => cp.originalIndex === index);
              if (processedProduct && processedProduct.success && !processedProduct.existingId) {
                // This is a newly created customized product, add the ID
                needsLeadUpdate = true;
                return {
                  ...product,
                  customizedProductId: processedProduct.data._id
                };
              }
              return product;
            });

            if (needsLeadUpdate) {
              await updateLead(leadId, {
                products: updatedProducts
              });
            }

            console.log('Customized product records updated successfully');
          } catch (customizedProductError) {
            console.error('Error updating customized product records:', customizedProductError);
            // Don't fail the whole operation if customized product update fails
            // The lead was updated successfully with the basic product info
          }
        }

        setHasUnsavedChanges(false);
        navigate('/dashboard/leads', { state: { toastMessage: `Lead ${isEditMode ? 'updated' : 'created'} successfully!` } });
      } else {
        throw new Error(response.message || `Failed to ${isEditMode ? 'update' : 'create'} lead.`);
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} lead:`, err);
      setSubmissionError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSectionHeader = (title, sectionKey) => (
    <div ref={sectionRefs[sectionKey]} className="mb-3">
      <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">{title}</h2>
      {sectionErrors[sectionKey] && typeof sectionErrors[sectionKey] === 'object' && Object.values(sectionErrors[sectionKey]).map((err, i) => (
          <p key={i} className="text-sm text-red-500 mt-1">- {err}</p>
      ))}
      {sectionErrors[sectionKey] && typeof sectionErrors[sectionKey] === 'string' && (
         <p className="text-sm text-red-500 mt-1">- {sectionErrors[sectionKey]}</p>
      )}
          </div>
  );

  const renderInputField = (name, label, type = 'text', placeholder = '', required = false, section, halfWidth = false) => (
    <div className={halfWidth ? 'w-full' : 'w-full'}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1 sm:mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name] ?? ''}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        className={`mt-1 block w-full px-3 py-2.5 sm:py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm sm:text-sm text-secondary placeholder-gray-400 touch-target ${sectionErrors[section]?.[name] ? 'border-red-500' : ''}`}
      />
            </div>
  );

  const renderSelectField = (name, label, options, required = false, section, halfWidth = false) => (
    <div className={halfWidth ? 'w-full' : 'w-full'}> 
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1 sm:mb-1">
        {label} {required && <span className="text-red-500">*</span>}
                  </label>
      <div className="relative mt-1">
                    <select
          id={name}
          name={name}
          value={formData[name] ?? ''}
          onChange={handleInputChange}
          required={required}
          className={`block w-full px-3 py-2.5 sm:py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm sm:text-sm appearance-none text-secondary touch-target ${sectionErrors[section]?.[name] ? 'border-red-500' : ''}`}
                    >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>
  );

  if (isLoadingLead) {
    return (
      <div className="flex flex-col flex-1 min-h-[calc(100vh-var(--header-height,150px))] items-center justify-center bg-tertiary">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading lead data...</p>
                  </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        <div className="border-b border-fourth pb-4 sm:pb-5 mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
              {isEditMode && (
                  <button 
                      type="button" 
                      onClick={() => handleNavigate('/dashboard/leads')}
                      className="p-2 sm:p-2 rounded-md hover:bg-fourth text-secondary touch-target"
                      aria-label="Back to leads"
                  >
                      <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5" />
                  </button>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-secondary">
              {isEditMode ? 'Edit Lead' : 'Create New Lead'}
              </h1>
                </div>
              </div>

      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1">
          {submissionError && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm sm:text-base">{submissionError}</span>
              </div>
          )}

          <section>
            {renderSectionHeader('Lead Information', 'leadInfo')}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {renderSelectField('leadType', 'Lead Type', FORM_OPTIONS.leadTypes, true, 'leadInfo')}
              {formData.leadType === 'other' && (
                <div className="w-full">
                  <label htmlFor="customLeadType" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-1">
                    Specify Lead Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customLeadType"
                    name="customLeadType"
                    value={formData.customLeadType ?? ''}
                    onChange={handleInputChange}
                    placeholder="Enter lead type"
                    required
                    className={`mt-1 block w-full px-3 py-2.5 sm:py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm sm:text-sm text-secondary placeholder-gray-400 touch-target ${sectionErrors.leadInfo?.customLeadType ? 'border-red-500' : ''}`}
                  />
                </div>
              )}
              {renderSelectField('status', 'Status', FORM_OPTIONS.statuses, true, 'leadInfo')}
              {renderInputField('dateCollected', ' Enquiry Date', 'date', '', true, 'leadInfo')}
                </div>
          </section>

          <section>
            {renderSectionHeader('Personal Information', 'personalInfo')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {renderInputField('firstName', 'First Name', 'text', 'Enter first name', true, 'personalInfo')}
              {renderInputField('lastName', 'Last Name', 'text', 'Enter last name', false, 'personalInfo')}
              {renderInputField('email', 'Email Address', 'email', 'name@example.com', true, 'personalInfo')}
              <div className="w-full">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative mt-1 flex rounded-lg shadow-sm">
                      <select
                        name="countryCode"
                        id="countryCode" 
                        value={formData.countryCode}
                        onChange={handleInputChange}
                        className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-fourth bg-gray-50 text-gray-500 text-sm sm:text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                      >
                        <option value="+91">+91 (IN)</option>
                        <option value="+1">+1 (US)</option>
                        <option value="+44">+44 (UK)</option>
                      </select>
                    <input
                      type="tel"
                        id="phone"
                      name="phone"
                      value={formData.phone}
                        onChange={handleInputChange}
                      placeholder="(555) 000-0000"
                        required
                        className={`flex-1 block w-full min-w-0 px-3 py-2.5 bg-white border border-fourth rounded-none rounded-r-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm sm:text-sm text-secondary placeholder-gray-400 ${sectionErrors.personalInfo?.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                </div>

              <div className="w-full sm:col-span-2">
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                  <div className="flex-1">
                    {renderInputField('whatsapp', 'WhatsApp Number', 'tel', 'Enter WhatsApp number', true, 'personalInfo')}
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-start lg:items-end">
                    <button
                      type="button"
                      onClick={handleCaptureLocation}
                      className="w-full lg:w-auto px-4 py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed touch-target"
                      disabled={geoStatus === 'loading'}
                    >
                      {geoStatus === 'loading' ? 'Capturing...' : '📍 Capture Location'}
                    </button>
                    {(geo.latitude && geo.longitude) && (
                      <div className="text-xs text-gray-600 bg-gray-50 border border-fourth rounded p-2 mt-2 w-full lg:w-auto">
                        <span className="font-semibold">Lat:</span> {geo.latitude.toFixed(6)}<br />
                        <span className="font-semibold">Lng:</span> {geo.longitude.toFixed(6)}
                      </div>
                    )}
                    {geoStatus === 'error' && (
                      <div className="text-xs text-red-500 mt-2 w-full lg:w-auto">{geoError}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {renderInputField('billingAddress', 'Billing Address', 'text', 'Enter billing address', true, 'personalInfo')} 
                {renderInputField('shippingAddress', 'Shipping Address', 'text', 'Enter shipping address (leave blank if same as billing)', false, 'personalInfo')} 
            </div>
          </section>

          <section>
            {renderSectionHeader('Business Information', 'businessInfo')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {renderInputField('businessName', 'Business Name', 'text', 'Enter business name', false, 'businessInfo')}
              {renderSelectField('customerType', 'Customer Type', FORM_OPTIONS.customerTypes, true, 'businessInfo')}
              {formData.customerType === 'other' && (
                <div className="w-full sm:col-span-2">
                  <label htmlFor="customCustomerType" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-1">
                    Specify Customer Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customCustomerType"
                    name="customCustomerType"
                    value={formData.customCustomerType ?? ''}
                    onChange={handleInputChange}
                    placeholder="Enter customer type"
                    required
                    className={`mt-1 block w-full px-3 py-2.5 sm:py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm sm:text-sm text-secondary placeholder-gray-400 touch-target ${sectionErrors.businessInfo?.customCustomerType ? 'border-red-500' : ''}`}
                  />
                </div>
              )}
              </div>
              <div className="mt-4 sm:mt-6">
                {renderInputField('gstinUin', 'GSTIN/UIN', 'text', 'Enter GSTIN or UIN number', false, 'businessInfo')}
              </div>
          </section>

          <section>
            {renderSectionHeader('Products & Budget', 'productInfo')}

            {(productFetchError || bundleFetchError) && (
                <div className="mb-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm sm:text-base">{productFetchError || bundleFetchError}</span>
                </div>
              )}

            {/* Product Type Selection */}
            <div className="bg-white rounded-lg border border-fourth shadow-sm p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-secondary">Product Type Selection</h4>
                {isEditMode && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                    📝 Editing Mode
                  </span>
                )}
              </div>
              
              {isEditMode && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This lead was originally created with{' '}
                    <span className="font-medium">
                      {selectedProductType === 'bundle' ? 'Solar Power Plant System' : selectedProductType === 'customized' ? 'Customized Products' : 'Individual Products'}
                    </span>
                    . You can change the product type, but this will clear the current product selection.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                  selectedProductType === 'individual' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="productType"
                    value="individual"
                    checked={selectedProductType === 'individual'}
                    onChange={(e) => handleProductTypeChange(e.target.value)}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-secondary">Individual Products</span>
                      {selectedProductType === 'individual' && (
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Select individual products from our catalog</p>
                  </div>
                </label>
                <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                  selectedProductType === 'bundle' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="productType"
                    value="bundle"
                    checked={selectedProductType === 'bundle'}
                    onChange={(e) => handleProductTypeChange(e.target.value)}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-secondary">Solar Power Plant Systems</span>
                      {selectedProductType === 'bundle' && (
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Choose from pre-configured solar power plant bundles</p>
                  </div>
                </label>
                <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                  selectedProductType === 'customized' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="productType"
                    value="customized"
                    checked={selectedProductType === 'customized'}
                    onChange={(e) => handleProductTypeChange(e.target.value)}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-secondary">Customized Products</span>
                      {selectedProductType === 'customized' && (
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Request products not in our catalog</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Bundle Selection Interface */}
            {selectedProductType === 'bundle' && (
              <>
                {/* Selected Bundles Table - Desktop & Tablet */}
                <div className="hidden md:block bg-white rounded-lg border border-fourth shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 border-b border-fourth">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[30%]">
                            Bundle Name <span className="text-red-500">*</span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[20%]">
                            KVA Rating
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider w-[14%]">
                            Qty <span className="text-red-500">*</span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[18%]">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[18%]">
                            Total Price
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider w-[8%]">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-fourth">
                        {selectedBundles.map((bundle, index) => (
                          <tr key={bundle.id} className="hover:bg-gray-50 transition-colors duration-150">
                            {/* Bundle Name */}
                            <td className="px-4 py-4">
                              <div>
                                <div className="font-medium text-secondary">{bundle.name}</div>
                                <div className="text-xs text-gray-500">{bundle.bundleCode}</div>
                                <div className="text-xs text-gray-500">
                                  {bundle.bundleData?.items?.length || 0} components
                                </div>
                              </div>
                            </td>

                            {/* KVA Rating */}
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {bundle.bundleData?.subcategory?.toUpperCase() || 'N/A'}
                              </span>
                            </td>

                            {/* Quantity */}
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => updateBundleQuantity(bundle.id, bundle.quantity - 1)}
                                  className="p-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={bundle.quantity <= 1}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                  </svg>
                                </button>
                                <input
                                  type="number"
                                  value={bundle.quantity}
                                  min="1"
                                  onChange={(e) => updateBundleQuantity(bundle.id, e.target.value)}
                                  className="w-12 px-1 py-1.5 bg-white border border-fourth rounded text-center text-sm text-secondary transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateBundleQuantity(bundle.id, bundle.quantity + 1)}
                                  className="p-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors duration-150"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                              </div>
                            </td>

                            {/* Unit Price */}
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-secondary">
                                ₹{bundle.unitPrice.toLocaleString()}
                              </div>
                            </td>

                            {/* Total Price */}
                            <td className="px-4 py-4">
                              <div className="text-sm font-bold text-primary">
                                ₹{bundle.totalPrice.toLocaleString()}
                              </div>
                            </td>

                            {/* Action */}
                            <td className="px-4 py-4 text-center">
                              <button
                                type="button"
                                onClick={() => removeBundleSelection(bundle.id)}
                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors duration-150"
                                title="Remove bundle"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                                     {/* Bundle Error Messages */}
                   {Object.keys(sectionErrors.productInfo || {}).filter(key => key.startsWith('bundle_')).length > 0 && (
                     <div className="p-4 bg-red-50 border-l-4 border-red-400">
                       {Object.keys(sectionErrors.productInfo || {}).map((key) => (
                         key.startsWith('bundle_') && (
                           <p key={key} className="text-sm text-red-700">{sectionErrors.productInfo[key]}</p>
                         )
                       ))}
                     </div>
                   )}

                   {/* Add Bundle Section */}
                   <div className="p-6 bg-gray-50 border-t border-fourth">
                     <h5 className="text-base font-medium text-secondary mb-4">Add Solar Power Plant System</h5>
                    {isLoadingBundles ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Loading available bundles...</p>
                      </div>
                    ) : bundleFetchError ? (
                      <div className="text-center py-4">
                        <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-600">Failed to load bundles. Please try again.</p>
                      </div>
                    ) : Object.keys(bundlesData).length === 0 ? (
                      <div className="text-center py-4">
                        <Package className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No power plant configurations available.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                        {Object.values(bundlesData).flat().map((bundle) => {
                          const isAlreadySelected = selectedBundles.some(sb => sb.bundleId === bundle._id);
                          return (
                            <div 
                              key={bundle._id}
                              className={`border rounded-lg p-3 transition-all ${
                                isAlreadySelected
                                  ? 'border-gray-300 bg-gray-100 opacity-60' 
                                  : 'border-gray-200 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                              }`}
                              onClick={() => !isAlreadySelected && addBundleSelection(bundle)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h6 className="font-medium text-sm text-secondary">{bundle.name}</h6>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                      {bundle.subcategory?.toUpperCase() || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                {isAlreadySelected ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Plus className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{bundle.bundleCode}</p>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div className="flex justify-between">
                                  <span>Components:</span>
                                  <span>{bundle.items?.length || 0}</span>
                                </div>
                                <div className="flex justify-between font-medium text-primary">
                                  <span>Price:</span>
                                  <span>₹{bundle.price?.toLocaleString()}</span>
                                </div>
                              </div>
                              {isAlreadySelected && (
                                <div className="mt-2 text-xs text-gray-500 font-medium">
                                  ✓ Already Selected
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Bundles Cards - Mobile */}
                <div className="block md:hidden space-y-4">
                  {selectedBundles.map((bundle, index) => (
                    <div key={bundle.id} className="bg-white rounded-lg border border-fourth shadow-sm p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-sm font-semibold text-secondary">Bundle #{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeBundleSelection(bundle.id)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors duration-150"
                          title="Remove bundle"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="font-medium text-secondary">{bundle.name}</div>
                          <div className="text-sm text-gray-600">{bundle.bundleCode}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {bundle.bundleData?.subcategory?.toUpperCase() || 'N/A'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {bundle.bundleData?.items?.length || 0} components
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => updateBundleQuantity(bundle.id, bundle.quantity - 1)}
                              className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={bundle.quantity <= 1}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <input
                              type="number"
                              value={bundle.quantity}
                              min="1"
                              onChange={(e) => updateBundleQuantity(bundle.id, e.target.value)}
                              className="flex-1 px-4 py-3 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base text-secondary text-center transition-all duration-150"
                            />
                            <button
                              type="button"
                              onClick={() => updateBundleQuantity(bundle.id, bundle.quantity + 1)}
                              className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors duration-150"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                          <div>
                            <div className="text-sm text-gray-600">Unit Price</div>
                            <div className="font-medium text-secondary">₹{bundle.unitPrice.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Total Price</div>
                            <div className="font-bold text-primary">₹{bundle.totalPrice.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                                     {/* Bundle Error Messages - Mobile */}
                   {(sectionErrors.productInfo?.general || Object.keys(sectionErrors.productInfo || {}).filter(key => key.startsWith('bundle_')).length > 0) && (
                     <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                       {sectionErrors.productInfo?.general && (
                         <p className="text-sm text-red-700 mb-2">{sectionErrors.productInfo.general}</p>
                       )}
                       {Object.keys(sectionErrors.productInfo || {}).map((key) => (
                         key.startsWith('bundle_') && (
                           <p key={key} className="text-sm text-red-700">{sectionErrors.productInfo[key]}</p>
                         )
                       ))}
                     </div>
                   )}

                   {/* Add Bundle Button - Mobile */}
                   <div className="bg-white rounded-lg border border-fourth shadow-sm p-4">
                     <h5 className="text-base font-medium text-secondary mb-4">Add Solar Power Plant System</h5>
                    {isLoadingBundles ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Loading available bundles...</p>
                      </div>
                    ) : bundleFetchError ? (
                      <div className="text-center py-4">
                        <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-600">Failed to load bundles. Please try again.</p>
                      </div>
                    ) : Object.keys(bundlesData).length === 0 ? (
                      <div className="text-center py-4">
                        <Package className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No power plant configurations available.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {Object.values(bundlesData).flat().map((bundle) => {
                          const isAlreadySelected = selectedBundles.some(sb => sb.bundleId === bundle._id);
                          return (
                            <div 
                              key={bundle._id}
                              className={`border rounded-lg p-3 transition-all ${
                                isAlreadySelected
                                  ? 'border-gray-300 bg-gray-100 opacity-60' 
                                  : 'border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                              }`}
                              onClick={() => !isAlreadySelected && addBundleSelection(bundle)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h6 className="font-medium text-sm text-secondary">{bundle.name}</h6>
                                  <p className="text-xs text-gray-600">{bundle.bundleCode}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                      {bundle.subcategory?.toUpperCase() || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                {isAlreadySelected ? (
                                  <Check className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Plus className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                <div>Components: {bundle.items?.length || 0}</div>
                                <div className="font-medium text-primary">₹{bundle.price?.toLocaleString()}</div>
                              </div>
                              {isAlreadySelected && (
                                <div className="mt-2 text-xs text-gray-500 font-medium">
                                  ✓ Already Selected
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Customized Products Section */}
            {selectedProductType === 'customized' && (
              <>
                {/* Customized Products Table - Desktop & Tablet */}
                <div className="hidden md:block bg-white rounded-lg border border-fourth shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 border-b border-fourth">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[35%]">
                            Product Name <span className="text-red-500">*</span>
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider w-[15%]">
                            Qty <span className="text-red-500">*</span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[20%]">
                            Unit Price <span className="text-red-500">*</span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[20%]">
                            Total Price
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider w-[10%]">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-fourth">
                        {customizedProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={product.name}
                                onChange={(e) => handleCustomizedProductChange(index, 'name', e.target.value)}
                                placeholder="Enter product name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => handleCustomizedProductChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                min="1"
                                className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-center"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={product.unitPrice}
                                onChange={(e) => handleCustomizedProductChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                placeholder="Enter unit price"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-secondary">
                                ₹{(product.quantity * product.unitPrice).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeCustomizedProduct(index)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Remove product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Add Product Button */}
                  <div className="p-4 border-t border-fourth bg-gray-50">
                    <button
                      type="button"
                      onClick={addCustomizedProduct}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Customized Product
                    </button>
                  </div>
                </div>

                {/* Customized Products Cards - Mobile */}
                <div className="md:hidden space-y-4">
                  {customizedProducts.map((product, index) => (
                    <div key={index} className="bg-white rounded-lg border border-fourth shadow-sm p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-1">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) => handleCustomizedProductChange(index, 'name', e.target.value)}
                            placeholder="Enter product name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-secondary mb-1">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => handleCustomizedProductChange(index, 'quantity', parseInt(e.target.value) || 0)}
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-secondary mb-1">
                              Unit Price <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={product.unitPrice}
                              onChange={(e) => handleCustomizedProductChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              placeholder="Enter unit price"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-sm font-medium text-secondary">
                            Total: ₹{(product.quantity * product.unitPrice).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomizedProduct(index)}
                            className="text-red-600 hover:text-red-800 transition-colors p-1"
                            title="Remove product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Product Button - Mobile */}
                  <button
                    type="button"
                    onClick={addCustomizedProduct}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Customized Product
                  </button>
                </div>
              </>
            )}
            
            {/* Individual Products Section */}
            {selectedProductType === 'individual' && (
              <>
                {/* Products Table - Desktop & Tablet */}
                <div className="hidden md:block bg-white rounded-lg border border-fourth shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-fourth">
                    <tr>
                      <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[24%] lg:w-[22%]">
                        Category <span className="text-red-500">*</span>
                      </th>
                      <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[32%] lg:w-[30%]">
                        Product Name <span className="text-red-500">*</span>
                      </th>
                      <th className="px-1 lg:px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider w-[16%] lg:w-[14%]">
                        Qty <span className="text-red-500">*</span>
                      </th>
                      <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[14%] lg:w-[16%]">
                        Unit Price <span className="text-red-500">*</span>
                      </th>
                      <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[14%] lg:w-[16%]">
                        Total Price
                      </th>
                      <th className="px-1 lg:px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider w-[6%] lg:w-[8%]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-fourth">
                    {formData.products.map((product, index) => (
                      <tr key={`${product.id}_${index}`} className="hover:bg-gray-50 transition-colors duration-150">
                        {/* Category */}
                        <td className="px-2 lg:px-4 py-4">
                          <div className="relative">
                            <select
                              id={`product_category_${index}`} 
                              value={product.category ?? ''}
                              onChange={(e) => handleProductPropertyChange(index, 'category', e.target.value)}
                              disabled={isLoadingProducts}
                              required
                              className={`w-full px-2 lg:px-3 py-2 lg:py-2.5 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-xs lg:text-sm appearance-none text-secondary transition-all duration-150 ${sectionErrors.productInfo?.[index] && !product.category ? 'border-red-500 ring-red-500' : ''}`}
                            >
                              <option value="">Select Category</option>
                              {productCategories.map(cat => (
                                <option key={cat} value={cat}>
                                  {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 lg:w-4 h-3 lg:h-4 pointer-events-none" />
                          </div>
                        </td>

                        {/* Product Name */}
                        <td className="px-2 lg:px-4 py-4">
                          <div className="relative">
                            <select
                              id={`product_name_${index}`} 
                              value={product.name ?? ''}
                              onChange={(e) => handleProductPropertyChange(index, 'name', e.target.value)}
                              disabled={!product.category || isLoadingProducts}
                              required
                              className={`w-full px-2 lg:px-3 py-2 lg:py-2.5 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-xs lg:text-sm appearance-none text-secondary transition-all duration-150 ${sectionErrors.productInfo?.[index] && !product.name ? 'border-red-500 ring-red-500' : ''} ${!product.category ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            >
                              <option value="">Select Product</option>
                              {product.category && productsData[product.category]?.map(p => (
                                <option key={p._id} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 lg:w-4 h-3 lg:h-4 pointer-events-none" />
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-1 lg:px-4 py-4">
                          <div className="flex items-center justify-center space-x-0.5 lg:space-x-1">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(index)}
                              className="p-0.5 lg:p-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              disabled={parseInt(product.quantity) <= 1}
                              title="Decrease quantity"
                            >
                              <svg className="w-2.5 lg:w-3 h-2.5 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <input
                              type="number"
                              id={`product_quantity_${index}`} 
                              value={product.quantity ?? '1'}
                              min="1"
                              onChange={(e) => handleProductPropertyChange(index, 'quantity', e.target.value)}
                              required
                              className={`w-8 lg:w-12 px-1 py-1 lg:py-1.5 bg-white border border-fourth rounded text-center text-xs lg:text-sm text-secondary transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${sectionErrors.productInfo?.[index] && !product.quantity ? 'border-red-500 ring-red-500' : ''}`}
                            />
                            <button
                              type="button"
                              onClick={() => increaseQuantity(index)}
                              className="p-0.5 lg:p-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors duration-150 flex-shrink-0"
                              title="Increase quantity"
                            >
                              <svg className="w-2.5 lg:w-3 h-2.5 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="px-2 lg:px-4 py-4">
                          <div className="relative">
                            <span className="absolute left-2 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs lg:text-sm font-medium z-10">₹</span>
                            <input
                              type="number"
                              id={`product_unitPrice_${index}`} 
                              value={product.unitPrice ?? '0'}
                              min="0" 
                              step="0.01" 
                              readOnly
                              className="w-full pl-6 lg:pl-9 pr-6 lg:pr-8 py-2 lg:py-2.5 bg-gray-50 border border-fourth rounded-lg shadow-sm text-xs lg:text-sm text-secondary font-medium cursor-not-allowed"
                              placeholder="0.00"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 lg:pr-3">
                              <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 bg-blue-400 rounded-full" title="Auto-filled from product selection"></div>
                            </div>
                          </div>
                        </td>

                        {/* Total Price */}
                        <td className="px-2 lg:px-4 py-4">
                          <div className="relative">
                            <span className="absolute left-2 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs lg:text-sm font-medium">₹</span>
                            <input
                              type="number"
                              id={`product_totalPrice_${index}`} 
                              value={product.totalPrice ?? '0'}
                              min="0" 
                              step="0.01" 
                              readOnly
                              className="w-full pl-6 lg:pl-9 pr-6 lg:pr-8 py-2 lg:py-2.5 bg-gray-50 border border-fourth rounded-lg shadow-sm text-xs lg:text-sm text-secondary font-medium cursor-not-allowed"
                              placeholder="0.00"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 lg:pr-3">
                              <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 bg-green-400 rounded-full" title="Auto-calculated"></div>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-1 lg:px-4 py-4 text-center">
                          {formData.products.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProductField(index)} 
                              className="p-1 lg:p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors duration-150"
                              aria-label="Remove product"
                              title="Remove this product"
                            >
                              <Trash2 className="w-3 lg:w-4 h-3 lg:h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                                    {/* Error Messages */}
              {Object.keys(sectionErrors.productInfo || {}).map((key) => (
                key !== 'general' && !key.startsWith('bundle_') && (
                  <div key={key} className="px-6 py-2 bg-red-50 border-l-4 border-red-400">
                    <p className="text-sm text-red-700">Product {parseInt(key) + 1}: {sectionErrors.productInfo[key]}</p>
                  </div>
                )
              ))}
              {sectionErrors.productInfo?.general && (
                <div className="px-6 py-3 bg-red-50 border-l-4 border-red-400">
                  <p className="text-sm text-red-700">{sectionErrors.productInfo.general}</p>
                </div>
              )}

              {/* Add Product Button */}
              <div className="p-6 bg-gray-50 border-t border-fourth">
                <button
                  type="button"
                  onClick={addProductField} 
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-primary/50 text-primary rounded-lg hover:bg-primary/5 hover:border-primary transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 font-medium"
                >
                  <Plus className="w-5 h-5" /> 
                  Add Another Product
                </button>
              </div>
            </div>

            {/* Products Cards - Mobile */}
            <div className="block md:hidden space-y-4">
              {formData.products.map((product, index) => (
                <div key={`${product.id}_${index}`} className="bg-white rounded-lg border border-fourth shadow-sm p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-sm font-semibold text-secondary">Product #{index + 1}</h4>
                    {formData.products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProductField(index)} 
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors duration-150 touch-target"
                        aria-label="Remove product"
                        title="Remove this product"

                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* Category */}
                    <div>
                      <label htmlFor={`mobile_product_category_${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id={`mobile_product_category_${index}`} 
                          value={product.category ?? ''}
                          onChange={(e) => handleProductPropertyChange(index, 'category', e.target.value)}
                          disabled={isLoadingProducts}
                          required
                          className={`w-full px-4 py-3 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base appearance-none text-secondary transition-all duration-150 touch-target ${sectionErrors.productInfo?.[index] && !product.category ? 'border-red-500 ring-red-500' : ''}`}
                        >
                          <option value="">Select Category</option>
                          {productCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Product Name */}
                    <div>
                      <label htmlFor={`mobile_product_name_${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id={`mobile_product_name_${index}`} 
                          value={product.name ?? ''}
                          onChange={(e) => handleProductPropertyChange(index, 'name', e.target.value)}
                          disabled={!product.category || isLoadingProducts}
                          required
                          className={`w-full px-4 py-3 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base appearance-none text-secondary transition-all duration-150 touch-target ${sectionErrors.productInfo?.[index] && !product.name ? 'border-red-500 ring-red-500' : ''} ${!product.category ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="">Select Product</option>
                          {product.category && productsData[product.category]?.map(p => (
                            <option key={p._id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Quantity and Prices */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label htmlFor={`mobile_product_quantity_${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(index)}
                            className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-target flex-shrink-0"
                            disabled={parseInt(product.quantity) <= 1}
                            title="Decrease quantity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            id={`mobile_product_quantity_${index}`} 
                            value={product.quantity ?? '1'}
                            min="1"
                            onChange={(e) => handleProductPropertyChange(index, 'quantity', e.target.value)}
                            required
                            className={`flex-1 px-4 py-3 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base text-secondary text-center transition-all duration-150 touch-target min-w-0 ${sectionErrors.productInfo?.[index] && !product.quantity ? 'border-red-500 ring-red-500' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => increaseQuantity(index)}
                            className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors duration-150 touch-target flex-shrink-0"
                            title="Increase quantity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`mobile_product_unitPrice_${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                          Unit Price <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium z-10">₹</span>
                          <input
                            type="number"
                            id={`mobile_product_unitPrice_${index}`} 
                            value={product.unitPrice ?? '0'}
                            min="0" 
                            step="0.01" 
                            readOnly
                            className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-fourth rounded-lg shadow-sm text-base text-secondary font-medium cursor-not-allowed touch-target"
                            placeholder="0.00"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                            <div className="w-3 h-3 bg-blue-400 rounded-full" title="Auto-filled from product selection"></div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`mobile_product_totalPrice_${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                          Total Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium z-10">₹</span>
                          <input
                            type="number"
                            id={`mobile_product_totalPrice_${index}`} 
                            value={product.totalPrice ?? '0'}
                            min="0" 
                            step="0.01" 
                            readOnly
                            className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-fourth rounded-lg shadow-sm text-base text-secondary font-medium cursor-not-allowed touch-target"
                            placeholder="0.00"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                            <div className="w-3 h-3 bg-green-400 rounded-full" title="Auto-calculated"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sectionErrors.productInfo?.[index] && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{sectionErrors.productInfo[index]}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* General Error Message - Mobile */}
              {sectionErrors.productInfo?.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{sectionErrors.productInfo.general}</p>
                </div>
              )}

              {/* Add Product Button - Mobile */}
              <button
                type="button"
                onClick={addProductField} 
                className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-primary/50 text-primary rounded-lg hover:bg-primary/5 hover:border-primary transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 font-medium text-base touch-target"
              >
                <Plus className="w-6 h-6" /> 
                Add Another Product
              </button>
            </div>

                </>
              )}

            {/* Budget Summary */}
            <div className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-secondary mb-1">Budget Summary</h4>
                  <p className="text-sm text-gray-600">
                    {selectedProductType === 'individual' 
                      ? 'Total estimated cost for all products' 
                      : selectedProductType === 'bundle'
                      ? 'Total estimated cost for all solar power plant systems'
                      : 'Total estimated cost for all customized products'
                    }
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-gray-600 mb-1">Grand Total</div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary">
                    ₹{(() => {
                      if (selectedProductType === 'individual') {
                        return formData.products.reduce((acc, p) => acc + (parseFloat(p.totalPrice) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (selectedProductType === 'bundle') {
                        return selectedBundles.reduce((acc, b) => acc + b.totalPrice, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (selectedProductType === 'customized') {
                        return customizedProducts.reduce((acc, p) => acc + (p.quantity * p.unitPrice || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      }
                      return '0.00';
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedProductType === 'individual' 
                      ? `${formData.products.filter(p => p.totalPrice && parseFloat(p.totalPrice) > 0).length} product(s) selected`
                      : selectedProductType === 'bundle'
                      ? `${selectedBundles.length} solar power plant system(s) selected`
                      : `${customizedProducts.filter(p => p.name && p.quantity > 0 && p.unitPrice > 0).length} customized product(s) selected`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Product Requirements */}
            <div className="mt-4 sm:mt-6">
              <label htmlFor="productRequirements" className="block text-sm font-medium text-gray-700 mb-2">Product Requirements / Notes</label>
              <textarea
                id="productRequirements" 
                name="productRequirements"
                rows="4" 
                value={formData.productRequirements}
                onChange={handleInputChange}
                placeholder="Enter any specific requirements, customizations, or additional notes about the products..."
                className="block w-full px-4 py-3 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base text-secondary placeholder-gray-400 transition-all duration-150 touch-target"
              />
            </div>
          </section>

          <section>
            {renderSectionHeader('Additional Lead Details', 'additionalInfo')}
            
            {/* Main Content Grid */}
            <div className="bg-white rounded-lg border border-fourth shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 space-y-6">
                
                {/* Follow-Up Section */}
                <div className="border-t border-fourth pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Follow-Up Management</h4>
                      <p className="text-sm text-gray-600 mb-4">Set up automatic follow-up reminders for this lead</p>
                      
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, followUpRequired: !prev.followUpRequired }))}
                        className={`inline-flex items-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 touch-target ${
                          formData.followUpRequired
                            ? 'bg-primary text-white shadow-md hover:bg-primary/90'
                            : 'bg-gray-100 text-gray-700 border border-fourth hover:bg-gray-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded mr-2 flex items-center justify-center ${
                          formData.followUpRequired ? 'bg-white/20' : 'bg-gray-300'
                        }`}>
                          {formData.followUpRequired && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {formData.followUpRequired ? 'Follow-up Scheduled' : 'Schedule Follow-up'}
                      </button>
                    </div>

                    {formData.followUpRequired && (
                      <div className="flex-1 max-w-sm">
                        <label htmlFor="followUpDateTime" className="block text-sm font-medium text-gray-700 mb-2">
                          Follow-Up Date & Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          id="followUpDateTime"
                          name="followUpDateTime"
                          value={formData.followUpDateTime}
                          onChange={handleInputChange}
                          required
                          min={new Date().toISOString().slice(0, 16)}
                          className={`block w-full px-4 py-3 sm:py-2.5 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm text-secondary touch-target ${sectionErrors.additionalInfo?.followUpDateTime ? 'border-red-500 ring-red-500' : ''}`}
                        />
                        {sectionErrors.additionalInfo?.followUpDateTime && (
                          <p className="text-xs text-red-500 mt-1">{sectionErrors.additionalInfo.followUpDateTime}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {formData.followUpRequired && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="text-blue-800 font-medium">Follow-up Reminder</p>
                          <p className="text-blue-600 mt-1">
                            You'll receive a notification to follow up with this lead at the scheduled time.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* General Notes */}
                <div className="border-t border-fourth pt-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    General Notes & Comments
                  </label>
                  <textarea 
                    id="notes" 
                    name="notes" 
                    rows="4" 
                    value={formData.notes} 
                    onChange={handleInputChange}
                    placeholder="Add any additional notes, observations, or important details about this lead..."
                    className="block w-full px-4 py-3 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm text-secondary placeholder-gray-400 touch-target resize-none"
                  />
                  <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                    <span>Optional field for any additional information</span>
                    <span>{formData.notes.length}/500</span>
                  </div>
                </div>

                {/* Attachments */}
                <div className="border-t border-fourth pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments & Documents
                  </label>
                  <div className="border-2 border-dashed border-fourth rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-gray-50">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                        <Paperclip className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary touch-target"
                        >
                          <span>Click to upload files</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" />
                        </label>
                        <span className="text-gray-500"> or drag and drop</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, PDF, DOC up to 10MB each
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-6 sm:pt-8 mt-auto">
            </div>
        </form>
        <div className="bg-tertiary/80 backdrop-blur-sm border-t border-fourth p-4 sm:p-4 sticky bottom-0 left-0 right-0 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 rounded-b-lg">
              <button
                type="button"
            onClick={() => {
                setConfirmDialogProps({
                isOpen: true,
                title: 'Reset Form',
                message: 'Are you sure you want to reset all fields to their default values? Any unsaved changes will be lost.',
                onConfirm: () => { resetFormToDefaults(); setShowConfirmDialog(false); },
                onClose: () => setShowConfirmDialog(false),
                confirmText: 'Yes, Reset',
                isDestructive: true
                });
                setShowConfirmDialog(true);
            }}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors duration-150 ease-in-out disabled:opacity-50 touch-target"
            disabled={isSubmitting || (!hasUnsavedChanges && !isEditMode)}
              >
            Reset
              </button>
              <button
                type="submit"
            form="leadForm"
            onClick={handleFormSubmit}
            disabled={isSubmitting || !hasUnsavedChanges}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] touch-target"
              >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : (isEditMode ? 'Save Changes' : 'Create Lead')}
              </button>
        </div>
      </div>

      {showConfirmDialog && 
      <ConfirmDialog
          isOpen={confirmDialogProps.isOpen}
          onClose={confirmDialogProps.onClose}
          onConfirm={confirmDialogProps.onConfirm}
          title={confirmDialogProps.title}
          message={confirmDialogProps.message}
          confirmText={confirmDialogProps.confirmText}
          cancelText={confirmDialogProps.cancelText}
          isDestructive={confirmDialogProps.isDestructive}
      />
      }
    </div>
    </>
  );
} 