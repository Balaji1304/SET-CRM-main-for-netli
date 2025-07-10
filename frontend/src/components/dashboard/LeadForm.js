import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Calendar, Paperclip, ChevronDown, Check, ArrowLeft, Plus, Trash2, X, AlertTriangle, Loader2, Package } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createLead, getLead, updateLead } from '../../services/leadService';
import { getProducts } from '../../services/productService';
import { getPowerPlantConfigurations } from '../../services/bundleService';
import { generateUniqueId, createDefaultFormState, ensureUniqueIds } from '../../utils/generateId';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Yes, Confirm', cancelText = 'Cancel', isDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-tertiary p-6 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ease-out">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-secondary">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-fourth">
            <X className="w-5 h-5 text-gray-500"/>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors duration-150 ease-in-out"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 ease-in-out flex items-center justify-center min-w-[100px] 
                        ${isDestructive 
                            ? 'bg-red-600 hover:bg-red-700 text-tertiary' 
                            : 'bg-primary hover:opacity-90 text-tertiary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const FORM_OPTIONS = {
  leadTypes: [
    { value: 'new_customer', label: 'New Customer' },
    { value: 'referral', label: 'Referral' },
    { value: 'event_lead', label: 'Event Lead' },
    { value: 'exhibition', label: 'Exhibition' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'website', label: 'Website Inquiry' },
    { value: 'cold_call', label: 'Cold Call' },
    { value: 'walk_in', label: 'Walk-in' }
  ],
  customerTypes: [
    { value: 'individual', label: 'Individual' },
    { value: 'plumber', label: 'Plumber' },
    { value: 'dealer', label: 'Dealer' },
    { value: 'builder', label: 'Builder' },
    { value: 'architect', label: 'Architect' },
    { value: 'business_owner', label: 'Business Owner' },
    { value: 'other', label: 'Other' }
  ],
  interestStages: [
    { value: 'new_lead', label: 'New Lead' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' }
  ],
  statuses: [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'closed_won', label: 'Closed - Won' },
    { value: 'closed_lost', label: 'Closed - Lost' }
  ],
  // sources: [
  //   { value: 'exhibition', label: 'Exhibition' },
  //   { value: 'facebook', label: 'Facebook' },
  //   { value: 'instagram', label: 'Instagram' },
  //   { value: 'linkedin', label: 'LinkedIn' },
  //   { value: 'google_ads', label: 'Google Ads' },
  //   { value: 'website', label: 'Website Inquiry' },
  //   { value: 'referral', label: 'Referral' },
  //   { value: 'cold_call', label: 'Cold Call' },
  //   { value: 'walk_in', label: 'Walk-in' },
  //   { value: 'other', label: 'Other' }
  // ],
};

  // Using the utility function to create default form state
  const defaultFormState = createDefaultFormState();

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
  const [selectedProductType, setSelectedProductType] = useState('individual'); // 'individual' or 'bundle'

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
    const newDefaultState = createDefaultFormState();
    setFormData(newDefaultState);
    setInitialFormData(newDefaultState);
    setHasUnsavedChanges(false);
    setSectionErrors({});
    setSubmissionError(null);
    setSelectedProductType('individual');
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
            products: (leadData.products && leadData.products.length > 0) 
              ? ensureUniqueIds(leadData.products) 
              : [{ ...createDefaultFormState().products[0] }],
          };
          setFormData(formattedLead);
          setInitialFormData(JSON.parse(JSON.stringify(formattedLead)));
          setIsEditMode(true);
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
        products: (leadData.products && leadData.products.length > 0) 
            ? ensureUniqueIds(leadData.products) 
            : [{ ...createDefaultFormState().products[0] }],
      };
      setFormData(formattedLead);
      setInitialFormData(JSON.parse(JSON.stringify(formattedLead)));
      setIsEditMode(true);
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
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProductPropertyChange = (index, field, value) => {
    const updatedProducts = formData.products.map((p, i) => {
      if (i === index) {
        const updatedProduct = { ...p, [field]: value };
        
        // Ensure product has an ID
        if (!updatedProduct.id) {
          updatedProduct.id = generateUniqueId();
        }
        
    if (field === 'category') {
          updatedProduct.name = '';
          updatedProduct.price = createDefaultFormState().products[0].price;
          updatedProduct.productId = '';
          updatedProduct.type = 'individual';
        }
        
    if (field === 'name' && value) {
          const category = updatedProduct.category;
      const selectedProduct = productsData[category]?.find(p => p.name === value);
      if (selectedProduct) {
            updatedProduct.price = selectedProduct.price.toString();
            updatedProduct.productId = selectedProduct._id;
            updatedProduct.brand = selectedProduct.brand;
      }
    }
        
        return updatedProduct;
      }
      return p;
    });
    
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  const addProductField = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { ...createDefaultFormState().products[0] }]
    }));
  };

  const removeProductField = (index) => {
    if (formData.products.length > 1) {
      setFormData(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.leadType) errors.leadInfo = { ...errors.leadInfo, leadType: 'Lead Type is required.' };
    if (!formData.status) errors.leadInfo = { ...errors.leadInfo, status: 'Status is required.' };
    if (!formData.dateCollected) errors.leadInfo = { ...errors.leadInfo, dateCollected: 'Enquiry Date is required.' };

    if (!formData.firstName) errors.personalInfo = { ...errors.personalInfo, firstName: 'First Name is required.' };
    if (!formData.lastName) errors.personalInfo = { ...errors.personalInfo, lastName: 'Last Name is required.' };
    if (!formData.email) errors.personalInfo = { ...errors.personalInfo, email: 'Email is required.' };
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.personalInfo = { ...errors.personalInfo, email: 'Email is invalid.' };
    if (!formData.phone) errors.personalInfo = { ...errors.personalInfo, phone: 'Phone number is required.' };
    if (!formData.whatsapp) errors.personalInfo = { ...errors.personalInfo, whatsapp: 'WhatsApp number is required.' };

    if (!formData.customerType) errors.businessInfo = { ...errors.businessInfo, customerType: 'Customer Type is required.' };
    
    const validProducts = formData.products.filter(p => p.category && p.name && p.quantity && p.price && p.productId);
    if (validProducts.length === 0) {
        errors.productInfo = { general: 'At least one complete product entry is required.' };
    } else {
        formData.products.forEach((product, index) => {
            if ((product.category || product.name || product.quantity || product.price) && 
                !(product.category && product.name && product.quantity && product.price && product.productId)) {
                if (!errors.productInfo) errors.productInfo = {}; 
                errors.productInfo[index] = 'Please complete all fields (Category, Product, Quantity, Price) for this product.';
            }
        });
    }

    if (!formData.interestStage) errors.additionalInfo = { ...errors.additionalInfo, interestStage: 'Stage of Interest is required.' };

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
      const productsToSubmit = formData.products
        .filter(p => p.category && p.name && p.quantity && p.price && p.productId)
        .map(p => ({
          productId: p.productId,
          category: p.category,
          name: p.name,
          quantity: parseInt(p.quantity, 10),
          price: parseFloat(p.price),
        }));

      const payload = { ...formData, products: productsToSubmit };
      payload.products.forEach(p => delete p.id);
      // Add geolocation if available
      if (geo.latitude && geo.longitude) {
        payload.latitude = geo.latitude;
        payload.longitude = geo.longitude;
      }

      const response = isEditMode ? await updateLead(leadId, payload) : await createLead(payload);

      if (response.success) {
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
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        className={`mt-1 block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400 ${sectionErrors[section]?.[name] ? 'border-red-500' : ''}`}
      />
            </div>
  );

  const renderSelectField = (name, label, options, required = false, section, halfWidth = false) => (
    <div className={halfWidth ? 'w-full' : 'w-full'}> 
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
                  </label>
      <div className="relative mt-1">
                    <select
          id={name}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          required={required}
          className={`block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm appearance-none text-secondary ${sectionErrors[section]?.[name] ? 'border-red-500' : ''}`}
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
    <div className="flex flex-col h-full">
      <div className="border-b border-fourth pb-5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
            {isEditMode && (
                <button 
                    type="button" 
                    onClick={() => handleNavigate('/dashboard/leads')}
                    className="p-2 rounded-md hover:bg-fourth text-secondary"
                    aria-label="Back to leads"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-secondary">
            {isEditMode ? 'Edit Lead' : 'Create New Lead'}
            </h1>
              </div>
            </div>

      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        <form onSubmit={handleFormSubmit} className="p-6 md:p-8 space-y-8 overflow-y-auto flex-1">
          {submissionError && (
            <div className="mb-6 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{submissionError}</span>
              </div>
          )}

          <section>
            {renderSectionHeader('Lead Information', 'leadInfo')}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderSelectField('leadType', 'Lead Type', FORM_OPTIONS.leadTypes, true, 'leadInfo')}
              {renderSelectField('status', 'Status', FORM_OPTIONS.statuses, true, 'leadInfo')}
              {renderInputField('dateCollected', ' Enquiry Date', 'date', '', true, 'leadInfo')}
                </div>
          </section>

          <section>
            {renderSectionHeader('Personal Information', 'personalInfo')}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInputField('firstName', 'First Name', 'text', 'Enter first name', true, 'personalInfo')}
              {renderInputField('lastName', 'Last Name', 'text', 'Enter last name', true, 'personalInfo')}
              {renderInputField('email', 'Email Address', 'email', 'name@example.com', true, 'personalInfo')}
              <div className="w-full">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative mt-1 flex rounded-lg shadow-sm">
                      <select
                        name="countryCode"
                        id="countryCode" 
                        value={formData.countryCode}
                        onChange={handleInputChange}
                        className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-fourth bg-gray-50 text-gray-500 sm:text-sm focus:ring-1 focus:ring-primary focus:border-primary"
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
                        className={`flex-1 block w-full min-w-0 px-3 py-2 bg-white border border-fourth rounded-none rounded-r-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400 ${sectionErrors.personalInfo?.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                </div>
              <div className="w-full flex flex-col md:flex-row md:items-end gap-2">
                <div className="flex-1">
                  {renderInputField('whatsapp', 'WhatsApp Number', 'tel', 'Enter WhatsApp number', true, 'personalInfo')}
                </div>
                <div className="flex-shrink-0 flex flex-col items-start">
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed w-full md:w-auto"
                    disabled={geoStatus === 'loading'}
                  >
                    {geoStatus === 'loading' ? 'Capturing Location...' : '📍 Capture Current Location'}
                  </button>
                  {(geo.latitude && geo.longitude) && (
                    <div className="text-xs text-gray-600 bg-gray-50 border border-fourth rounded p-2 mt-1 w-full md:w-auto">
                      <span className="font-semibold">Lat:</span> {geo.latitude}<br />
                      <span className="font-semibold">Lng:</span> {geo.longitude}
                    </div>
                  )}
                  {geoStatus === 'error' && (
                    <div className="text-xs text-red-500 mt-1 w-full md:w-auto">{geoError}</div>
                  )}
                  </div>
                </div>
              </div>
            <div className="mt-6">
                {renderInputField('address', 'Address', 'text', 'Enter full address', false, 'personalInfo')} 
                </div>
          </section>

          <section>
            {renderSectionHeader('Business Information', 'businessInfo')}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInputField('businessName', 'Business Name', 'text', 'Enter business name', false, 'businessInfo')}
              {renderSelectField('customerType', 'Customer Type', FORM_OPTIONS.customerTypes, true, 'businessInfo')}
                </div>
          </section>

          <section>
            {renderSectionHeader('Products & Budget', 'productInfo')}
            {(productFetchError || bundleFetchError) && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      {productFetchError && <div>{productFetchError}</div>}
                      {bundleFetchError && <div>{bundleFetchError}</div>}
                    </div>
                </div>
              )}
            
            {/* Product Type Selection */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-fourth">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Product Type</h4>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="productType"
                    value="individual"
                    checked={selectedProductType === 'individual'}
                    onChange={(e) => setSelectedProductType(e.target.value)}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Individual Products</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="productType"
                    value="bundle"
                    checked={selectedProductType === 'bundle'}
                    onChange={(e) => setSelectedProductType(e.target.value)}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <Package className="w-4 h-4 ml-2 mr-1 text-primary" />
                  <span className="text-sm text-gray-700">Power Plant Systems (2KVA, 4KVA, 5KVA, 10KVA)</span>
                </label>
              </div>
            </div>
            <div className="space-y-4">
              {formData.products.map((product, index) => (
                <div key={product.id} className="p-4 border border-fourth rounded-lg space-y-4 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-end bg-white shadow-sm">
                  <div className="md:col-span-3">
                    <label htmlFor={`product_category_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                            id={`product_category_${index}`} 
                        value={product.category}
                            onChange={(e) => handleProductPropertyChange(index, 'category', e.target.value)}
                        disabled={isLoadingProducts}
                            required
                            className={`w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm appearance-none text-secondary ${sectionErrors.productInfo?.[index] && !product.category ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select Category</option>
                            {productCategories.map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                      </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <label htmlFor={`product_name_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Product <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                            id={`product_name_${index}`} 
                        value={product.name}
                            onChange={(e) => handleProductPropertyChange(index, 'name', e.target.value)}
                        disabled={!product.category || isLoadingProducts}
                        required
                            className={`w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm appearance-none text-secondary ${sectionErrors.productInfo?.[index] && !product.name ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select Product</option>
                            {product.category && productsData[product.category]?.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
                      </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor={`product_quantity_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                        id={`product_quantity_${index}`} 
                      value={product.quantity}
                      min="1"
                        onChange={(e) => handleProductPropertyChange(index, 'quantity', e.target.value)}
                        required
                        className={`w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400 ${sectionErrors.productInfo?.[index] && !product.quantity ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor={`product_price_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Price <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                        id={`product_price_${index}`} 
                      value={product.price}
                        min="0" step="0.01" 
                        readOnly={!!product.productId}
                        onChange={(e) => handleProductPropertyChange(index, 'price', e.target.value)}
                      required
                        className={`w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400 ${sectionErrors.productInfo?.[index] && !product.price ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                  {formData.products.length > 1 && (
                    <button
                      type="button"
                        onClick={() => removeProductField(index)} 
                        className="p-2 text-red-500 hover:bg-red-100/50 rounded-lg transition-colors duration-150 w-full md:w-auto"
                        aria-label="Remove product"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    )}
                  </div>
                  {sectionErrors.productInfo?.[index] && (
                    <p className="md:col-span-12 text-xs text-red-500 mt-1">{sectionErrors.productInfo[index]}</p>
                  )}
                </div>
              ))}
            </div>
              <button
                type="button"
              onClick={addProductField} 
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-primary/50 text-primary rounded-lg hover:bg-primary/10 hover:border-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              >
              <Plus className="w-5 h-5" /> Add Product
              </button>
            <div className="mt-6 flex justify-end items-center border-t border-fourth pt-4">
              <span className="text-sm font-medium text-gray-700 mr-2">Estimated Total:</span>
              <span className="text-xl font-bold text-secondary">
                ₹{formData.products.reduce((acc, p) => acc + (parseFloat(p.quantity) * parseFloat(p.price) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            <div className="mt-0">
              <label htmlFor="productRequirements" className="block text-sm font-medium text-gray-700 mb-1">Product Requirements / Notes</label>
              <textarea
                id="productRequirements" 
                name="productRequirements"
                rows="3" 
                value={formData.productRequirements}
                onChange={handleInputChange}
                placeholder="Enter any specific requirements or notes about the products..."
                className="block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400"
              />
            </div>
          </section>

          <section>
            {renderSectionHeader('Additional Lead Details', 'additionalInfo')}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSelectField('interestStage', 'Stage of Interest', FORM_OPTIONS.interestStages, true, 'additionalInfo')}
                <div>
                <label htmlFor="followUpRequired" className="block text-sm font-medium text-gray-700 mb-1">Follow-Up Required?</label>
                <div className="mt-1 flex items-center gap-2 p-2.5 border border-fourth rounded-lg bg-white shadow-sm">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  name="followUpRequired"
                  checked={formData.followUpRequired}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                    <span className="text-sm text-secondary">Yes, schedule a follow-up</span>
              </div>
              {formData.followUpRequired && (
                <div className="mt-3">
                  <label htmlFor="followUpDateTime" className="block text-sm font-medium text-gray-700 mb-1">Follow-Up Date & Time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    id="followUpDateTime"
                    name="followUpDateTime"
                    value={formData.followUpDateTime}
                    onChange={handleInputChange}
                    required
                    className={`block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400 ${sectionErrors.additionalInfo?.followUpDateTime ? 'border-red-500' : ''}`}
                  />
                  {sectionErrors.additionalInfo?.followUpDateTime && (
                    <p className="text-xs text-red-500 mt-1">{sectionErrors.additionalInfo.followUpDateTime}</p>
                  )}
                </div>
              )}
              </div>
            </div>
            <div className="mt-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
              <textarea 
                id="notes" 
                name="notes" 
                rows="4" 
                value={formData.notes} 
                onChange={handleInputChange}
                placeholder="Add any other relevant notes for this lead..."
                className="block w-full px-3 py-2 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary placeholder-gray-400"
              />
            </div>
            <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-fourth border-dashed rounded-lg bg-white hover:border-primary/70 transition-colors">
                  <div className="space-y-1 text-center">
                    <Paperclip className="mx-auto h-10 w-10 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                      >
                        <span>Upload files</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                  </div>
                </div>
              </div>
          </section>

          <div className="pt-8 mt-auto">
            </div>
        </form>
        <div className="bg-tertiary/80 backdrop-blur-sm border-t border-fourth p-4 sticky bottom-0 left-0 right-0 flex justify-end space-x-3 rounded-b-lg">
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
            className="px-5 py-2.5 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors duration-150 ease-in-out disabled:opacity-50"
            disabled={isSubmitting || (!hasUnsavedChanges && !isEditMode)}
              >
            Reset
              </button>
              <button
                type="submit"
            form="leadForm"
            onClick={handleFormSubmit}
            disabled={isSubmitting || !hasUnsavedChanges}
            className="px-5 py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
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
  );
} 