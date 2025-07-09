import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Calendar, Paperclip, ChevronDown, Check, ArrowLeft, Plus, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createLead, getLead, updateLead } from '../../services/leadService';
import { getProducts } from '../../services/productService';

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

};

  const defaultFormState = {
    leadType: '',
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
    gstinUin: '',
    products: [
    { id: Date.now().toString(), category: '', name: '', quantity: '1', unitPrice: '0', totalPrice: '0', productId: '' }
    ],
    productRequirements: '',
    interestStage: 'new_lead',
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

  // Geolocation state
  const [geo, setGeo] = useState({ latitude: '', longitude: '' });
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | success | error
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      setProductFetchError(null);
      try {
        const response = await getProducts();
        if (response.success && Array.isArray(response.data)) {
          const productsByCategory = {};
          const categories = new Set();
          response.data.forEach(product => {
            const category = product.category || 'uncategorized';
            categories.add(category);
            if (!productsByCategory[category]) {
              productsByCategory[category] = [];
            }
            productsByCategory[category].push({ _id: product._id, name: product.name, price: product.price });
          });
          setProductsData(productsByCategory);
          setProductCategories(Array.from(categories).sort());
        } else {
          throw new Error(response.message || 'Product data is not in expected format.');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProductFetchError('Failed to load products. Some features may be limited.');
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const resetFormToDefaults = useCallback(() => {
    setFormData(defaultFormState);
    setInitialFormData(defaultFormState);
    setHasUnsavedChanges(false);
    setSectionErrors({});
    setSubmissionError(null);
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
              ? leadData.products.map(p => ({ ...p, id: p.id || p._id || Date.now().toString() })) 
              : [{ ...defaultFormState.products[0], id: Date.now().toString() }],
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
        followUpDateTime: leadData.followUpDateTime ? new Date(leadData.followUpDateTime).toISOString().slice(0, 16) : '',
        products: (leadData.products && leadData.products.length > 0) 
            ? leadData.products.map(p => ({ ...p, id: p.id || p._id || Date.now().toString() })) 
            : [{ ...defaultFormState.products[0], id: Date.now().toString() }],
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
    const updatedProducts = formData.products.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    if (field === 'category') {
      updatedProducts[index].name = '';
      updatedProducts[index].unitPrice = defaultFormState.products[0].unitPrice;
      updatedProducts[index].totalPrice = defaultFormState.products[0].totalPrice;
      updatedProducts[index].productId = '';
    }
    if (field === 'name' && value) {
      const category = updatedProducts[index].category;
      const selectedProduct = productsData[category]?.find(p => p.name === value);
      if (selectedProduct) {
        updatedProducts[index].unitPrice = selectedProduct.price.toString();
        updatedProducts[index].totalPrice = (parseFloat(updatedProducts[index].quantity) * parseFloat(selectedProduct.price)).toString();
        updatedProducts[index].productId = selectedProduct._id;
      }
    }
    
    // Calculate totalPrice when quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(updatedProducts[index].quantity);
      const unitPrice = field === 'unitPrice' ? parseFloat(value) : parseFloat(updatedProducts[index].unitPrice);
      updatedProducts[index].totalPrice = ((quantity || 0) * (unitPrice || 0)).toString();
    }
    
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  const addProductField = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { ...defaultFormState.products[0], id: Date.now().toString() }]
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
    if (!formData.billingAddress) errors.personalInfo = { ...errors.personalInfo, billingAddress: 'Billing address is required.' };

    if (!formData.customerType) errors.businessInfo = { ...errors.businessInfo, customerType: 'Customer Type is required.' };
    
    const validProducts = formData.products.filter(p => p.category && p.name && p.quantity && p.unitPrice && p.totalPrice && p.productId);
    if (validProducts.length === 0) {
        errors.productInfo = { general: 'At least one complete product entry is required.' };
    } else {
        formData.products.forEach((product, index) => {
            if ((product.category || product.name || product.quantity || product.unitPrice || product.totalPrice) && 
                !(product.category && product.name && product.quantity && product.unitPrice && product.totalPrice && product.productId)) {
                if (!errors.productInfo) errors.productInfo = {}; 
                errors.productInfo[index] = 'Please complete all fields (Category, Product, Quantity, Unit Price) for this product.';
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
        .filter(p => p.category && p.name && p.quantity && p.unitPrice && p.totalPrice && p.productId)
        .map(p => ({
          productId: p.productId,
          category: p.category,
          name: p.name,
          quantity: parseInt(p.quantity, 10),
          unitPrice: parseFloat(p.unitPrice),
          totalPrice: parseFloat(p.totalPrice),
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
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1 sm:mb-1">
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
          value={formData[name]}
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
              {renderSelectField('status', 'Status', FORM_OPTIONS.statuses, true, 'leadInfo')}
              {renderInputField('dateCollected', ' Enquiry Date', 'date', '', true, 'leadInfo')}
                </div>
          </section>

          <section>
            {renderSectionHeader('Personal Information', 'personalInfo')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
              </div>
              <div className="mt-4 sm:mt-6">
                {renderInputField('gstinUin', 'GSTIN/UIN', 'text', 'Enter GSTIN or UIN number', false, 'businessInfo')}
              </div>
          </section>

          <section>
            {renderSectionHeader('Products & Budget', 'productInfo')}
            {productFetchError && (
                <div className="mb-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm sm:text-base">{productFetchError}</span>
                </div>
              )}
            
            {/* Products Table - Desktop & Tablet */}
            <div className="hidden md:block bg-white rounded-lg border border-fourth shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-fourth">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[22%]">
                        Category <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[28%]">
                        Product Name <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[12%]">
                        Quantity <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[15%]">
                        Unit Price <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-[15%]">
                        Total Price
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider w-[8%]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-fourth">
                    {formData.products.map((product, index) => (
                      <tr key={product.id || index} className="hover:bg-gray-50 transition-colors duration-150">
                        {/* Category */}
                        <td className="px-4 py-4">
                          <div className="relative">
                            <select
                              id={`product_category_${index}`} 
                              value={product.category}
                              onChange={(e) => handleProductPropertyChange(index, 'category', e.target.value)}
                              disabled={isLoadingProducts}
                              required
                              className={`w-full px-3 py-2.5 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm appearance-none text-secondary transition-all duration-150 ${sectionErrors.productInfo?.[index] && !product.category ? 'border-red-500 ring-red-500' : ''}`}
                            >
                              <option value="">Select Category</option>
                              {productCategories.map(cat => (
                                <option key={cat} value={cat}>
                                  {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                          </div>
                        </td>

                        {/* Product Name */}
                        <td className="px-4 py-4">
                          <div className="relative">
                            <select
                              id={`product_name_${index}`} 
                              value={product.name}
                              onChange={(e) => handleProductPropertyChange(index, 'name', e.target.value)}
                              disabled={!product.category || isLoadingProducts}
                              required
                              className={`w-full px-3 py-2.5 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm appearance-none text-secondary transition-all duration-150 ${sectionErrors.productInfo?.[index] && !product.name ? 'border-red-500 ring-red-500' : ''} ${!product.category ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            >
                              <option value="">Select Product</option>
                              {product.category && productsData[product.category]?.map(p => (
                                <option key={p._id} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            id={`product_quantity_${index}`} 
                            value={product.quantity}
                            min="1"
                            onChange={(e) => handleProductPropertyChange(index, 'quantity', e.target.value)}
                            required
                            className={`w-full px-3 py-2.5 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm text-secondary placeholder-gray-400 transition-all duration-150 ${sectionErrors.productInfo?.[index] && !product.quantity ? 'border-red-500 ring-red-500' : ''}`}
                            placeholder="1"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="px-4 py-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₹</span>
                            <input
                              type="number"
                              id={`product_unitPrice_${index}`} 
                              value={product.unitPrice}
                              min="0" 
                              step="0.01" 
                              onChange={(e) => handleProductPropertyChange(index, 'unitPrice', e.target.value)}
                              required
                              className={`w-full pl-9 pr-3 py-2.5 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm text-secondary placeholder-gray-400 transition-all duration-150 ${sectionErrors.productInfo?.[index] && !product.unitPrice ? 'border-red-500 ring-red-500' : ''}`}
                              placeholder="0.00"
                            />
                          </div>
                        </td>

                        {/* Total Price */}
                        <td className="px-4 py-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₹</span>
                            <input
                              type="number"
                              id={`product_totalPrice_${index}`} 
                              value={product.totalPrice}
                              min="0" 
                              step="0.01" 
                              readOnly
                              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-fourth rounded-lg shadow-sm text-sm text-secondary font-medium cursor-not-allowed"
                              placeholder="0.00"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <div className="w-2 h-2 bg-green-400 rounded-full" title="Auto-calculated"></div>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4 text-center">
                          {formData.products.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProductField(index)} 
                              className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors duration-150"
                              aria-label="Remove product"
                              title="Remove this product"
                            >
                              <Trash2 className="w-4 h-4" />
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
                key !== 'general' && (
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
                <div key={product.id || index} className="bg-white rounded-lg border border-fourth shadow-sm p-4">
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
                          value={product.category}
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
                          value={product.name}
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
                        <input
                          type="number"
                          id={`mobile_product_quantity_${index}`} 
                          value={product.quantity}
                          min="1"
                          onChange={(e) => handleProductPropertyChange(index, 'quantity', e.target.value)}
                          required
                          className={`w-full px-4 py-3 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base text-secondary placeholder-gray-400 transition-all duration-150 touch-target ${sectionErrors.productInfo?.[index] && !product.quantity ? 'border-red-500 ring-red-500' : ''}`}
                          placeholder="1"
                        />
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
                            value={product.unitPrice}
                            min="0" 
                            step="0.01" 
                            onChange={(e) => handleProductPropertyChange(index, 'unitPrice', e.target.value)}
                            required
                            className={`w-full pl-10 pr-4 py-3 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base text-secondary placeholder-gray-400 transition-all duration-150 touch-target ${sectionErrors.productInfo?.[index] && !product.unitPrice ? 'border-red-500 ring-red-500' : ''}`}
                            placeholder="0.00"
                          />
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
                            value={product.totalPrice}
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

            {/* Budget Summary */}
            <div className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-secondary mb-1">Budget Summary</h4>
                  <p className="text-sm text-gray-600">Total estimated cost for all products</p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-gray-600 mb-1">Grand Total</div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary">
                    ₹{formData.products.reduce((acc, p) => acc + (parseFloat(p.totalPrice) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.products.filter(p => p.totalPrice && parseFloat(p.totalPrice) > 0).length} product(s) selected
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
                
                {/* Interest Stage */}
                <div>
                  <label htmlFor="interestStage" className="block text-sm font-medium text-gray-700 mb-2">
                    Stage of Interest <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="interestStage"
                      name="interestStage"
                      value={formData.interestStage}
                      onChange={handleInputChange}
                      required
                      className={`block w-full px-4 py-3 sm:py-2.5 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-sm appearance-none text-secondary touch-target ${sectionErrors.additionalInfo?.interestStage ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select stage of interest</option>
                      {FORM_OPTIONS.interestStages.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                  {sectionErrors.additionalInfo?.interestStage && (
                    <p className="text-xs text-red-500 mt-1">{sectionErrors.additionalInfo.interestStage}</p>
                  )}
                </div>

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