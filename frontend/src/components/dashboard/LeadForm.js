import { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Paperclip, ChevronDown, Check, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createLead, getLead, updateLead } from '../../services/leadService';
import { getProducts } from '../../services/productService';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-input rounded-lg text-sm font-medium hover:bg-orange-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

// Constants for form options
const FORM_OPTIONS = {
  leadTypes: [
    { value: 'new_customer', label: 'New Customer' },
    { value: 'referral', label: 'Referral' },
    { value: 'event_lead', label: 'Event Lead' }
  ],
  customerTypes: [
    { value: 'individual', label: 'Individual' },
    { value: 'plumber', label: 'Plumber' },
    { value: 'dealer', label: 'Dealer' },
    { value: 'business_owner', label: 'Business Owner' }
  ],
  interestStages: [
    { value: 'new_lead', label: 'New Lead' },
    { value: 'in_negotiation', label: 'In Negotiation' },
    { value: 'quotation_sent', label: 'Quotation Sent' }
  ],
  statuses: [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'closed', label: 'Closed' }
  ],
  sources: [
    { value: 'exhibition', label: 'Exhibition' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'website', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'cold_call', label: 'Cold Call' }
  ],
  productCategories: [
    { value: 'solar_panels', label: 'Solar Panels' },
    { value: 'inverters', label: 'Inverters' },
    { value: 'batteries', label: 'Batteries' },
    { value: 'mounting_systems', label: 'Mounting Systems' }
  ]
};

export default function LeadForm() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // Initial form state
  const defaultFormState = {
    leadType: '',
    status: 'pending',
    source: 'website',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    address: '',
    businessName: '',
    customerType: '',
    products: [
      {
        id: Date.now(),
        category: '',
        name: '',
        quantity: '',
        price: '',
        productId: ''
      }
    ],
    productRequirements: '',
    interestStage: '',
    dateCollected: new Date().toISOString().split('T')[0],
    followUpRequired: false
  };

  const [formData, setFormData] = useState(defaultFormState);

  // Add state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sectionErrors, setSectionErrors] = useState({
    leadInfo: null,
    personalInfo: null,
    businessInfo: null,
    productInfo: null,
    additionalInfo: null
  });

  // Create refs for each section
  const leadInfoRef = useRef(null);
  const personalInfoRef = useRef(null);
  const businessInfoRef = useRef(null);
  const productInfoRef = useRef(null);
  const additionalInfoRef = useRef(null);

  // Add new state for products data
  const [productsData, setProductsData] = useState({});
  const [productCategories, setProductCategories] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(null);

  // Fetch products when component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      setProductError(null);
      try {
        const response = await getProducts();
        if (response.success) {
          // Organize products by category
          const productsByCategory = {};
          const categories = new Set();
          
          response.data.forEach(product => {
            categories.add(product.category);
            if (!productsByCategory[product.category]) {
              productsByCategory[product.category] = [];
            }
            productsByCategory[product.category].push({
              _id: product._id,
              name: product.name,
              price: product.price
            });
          });

          setProductsData(productsByCategory);
          setProductCategories(Array.from(categories));
        } else {
          throw new Error(response.message || 'Failed to fetch products');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProductError('Failed to load products. Please try refreshing the page.');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Reset form to initial state
  const resetForm = () => {
    setFormData(defaultFormState);
    setInitialFormData({});
    setHasUnsavedChanges(false);
    setIsEditMode(false);
  };

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await getLead(id);
        if (response.success) {
          const formattedDate = response.data.dateCollected 
            ? new Date(response.data.dateCollected).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

          const leadData = {
            ...response.data,
            dateCollected: formattedDate,
            products: response.data.products || [
              {
                id: Date.now(),
                category: '',
                name: '',
                quantity: '',
                price: '',
                productId: ''
              }
            ]
          };
          setFormData(leadData);
          setInitialFormData(leadData);
          setIsEditMode(true);
        }
      } catch (error) {
        console.error('Failed to fetch lead:', error);
        navigate('/dashboard/leads');
      }
    };

    if (id) {
      fetchLead();
    } else if (state?.lead) {
      const formattedDate = state.lead.dateCollected 
        ? new Date(state.lead.dateCollected).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const leadData = {
        ...state.lead,
        dateCollected: formattedDate,
        products: state.lead.products || [
          {
            id: Date.now(),
            category: '',
            name: '',
            quantity: '',
            price: '',
            productId: ''
          }
        ]
      };
      setFormData(leadData);
      setInitialFormData(leadData);
      setIsEditMode(true);
    } else {
      // Reset form when navigating to add lead page
      resetForm();
    }
  }, [id, state, location.pathname]);

  useEffect(() => {
    if (Object.keys(initialFormData).length > 0) {
      const hasChanges = JSON.stringify(initialFormData) !== JSON.stringify(formData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, initialFormData]);

  // Handle navigation with unsaved changes
  const handleNavigation = (path) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowConfirmDialog(true);
    } else {
      navigate(path);
      resetForm();
    }
  };

  const handleBack = () => {
    handleNavigation('/dashboard/leads');
  };

  const handleConfirmLeave = () => {
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
      resetForm();
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSectionErrors({
      leadInfo: null,
      personalInfo: null,
      businessInfo: null,
      productInfo: null,
      additionalInfo: null
    });

    let hasErrors = false;
    const newSectionErrors = {
      leadInfo: null,
      personalInfo: null,
      businessInfo: null,
      productInfo: null,
      additionalInfo: null
    };

    // Lead Information validation
    const leadInfoErrors = [];
    if (!formData.leadType) leadInfoErrors.push('Lead Type');
    if (!formData.status) leadInfoErrors.push('Status');
    if (!formData.source) leadInfoErrors.push('Source');
    if (!formData.dateCollected) leadInfoErrors.push('Date of Lead Collection');

    if (leadInfoErrors.length > 0) {
      newSectionErrors.leadInfo = `Required: ${leadInfoErrors.join(', ')}`;
      hasErrors = true;
    }

    // Personal Information validation
    const personalInfoErrors = [];
    if (!formData.firstName) personalInfoErrors.push('First Name');
    if (!formData.lastName) personalInfoErrors.push('Last Name');
    if (!formData.email) personalInfoErrors.push('Email');
    else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      personalInfoErrors.push('Valid Email');
    }
    if (!formData.phone) personalInfoErrors.push('Phone Number');
    if (!formData.address) personalInfoErrors.push('Address');

    if (personalInfoErrors.length > 0) {
      newSectionErrors.personalInfo = `Required: ${personalInfoErrors.join(', ')}`;
      hasErrors = true;
    }

    // Business Information validation
    const businessInfoErrors = [];
    if (!formData.businessName) businessInfoErrors.push('Business Name');
    if (!formData.customerType) businessInfoErrors.push('Customer Type');

    if (businessInfoErrors.length > 0) {
      newSectionErrors.businessInfo = `Required: ${businessInfoErrors.join(', ')}`;
      hasErrors = true;
    }

    // Product Information validation
    const incompleteProducts = formData.products.filter(product => {
      // If any field is filled, all fields should be filled
      const hasAnyField = product.category || product.name || product.quantity || product.price;
      const hasAllFields = product.category && product.name && product.quantity && product.price;
      return hasAnyField && !hasAllFields;
    });

    const hasValidProduct = formData.products.some(product => {
      return product.category && product.name && product.quantity && product.price;
    });

    if (incompleteProducts.length > 0) {
      newSectionErrors.productInfo = 'Please complete all fields (Category, Product, Quantity, and Price) for each product entry';
      hasErrors = true;
    } else if (!hasValidProduct) {
      newSectionErrors.productInfo = 'At least one product with complete details is required';
      hasErrors = true;
    }

    // Additional Information validation
    if (!formData.interestStage) {
      newSectionErrors.additionalInfo = 'Stage of Interest is required';
      hasErrors = true;
    }

    setSectionErrors(newSectionErrors);

    if (hasErrors) {
      // Find the first section with an error and scroll to it
      const firstErrorSection = Object.entries(newSectionErrors).find(([_, error]) => error !== null)?.[0];
      if (firstErrorSection) {
        const sectionRef = {
          leadInfo: leadInfoRef,
          personalInfo: personalInfoRef,
          businessInfo: businessInfoRef,
          productInfo: productInfoRef,
          additionalInfo: additionalInfoRef
        }[firstErrorSection];
        
        sectionRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setIsSubmitting(false);
      return;
    }

    try {
      // Format the data according to our schema
      const leadData = {
        ...formData,
        leadType: formData.leadType.toLowerCase(),
        status: formData.status.toLowerCase(),
        source: formData.source.toLowerCase(),
        customerType: formData.customerType.toLowerCase(),
        interestStage: formData.interestStage.toLowerCase(),
        products: formData.products
          .filter(product => product.category && product.name && product.quantity && product.price && product.productId)
          .map(product => ({
            productId: product.productId,
            category: product.category.toLowerCase(),
            name: product.name,
            quantity: parseInt(product.quantity),
            price: parseFloat(product.price)
          }))
      };

      const response = isEditMode 
        ? await updateLead(id, leadData)
        : await createLead(leadData);

      if (response.success) {
        setHasUnsavedChanges(false);
        navigate('/dashboard/leads');
      } else {
        setError(response.message || `Failed to ${isEditMode ? 'update' : 'create'} lead`);
      }
    } catch (err) {
      setError(err.message || `An error occurred while ${isEditMode ? 'updating' : 'saving'} the lead`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update handleProductChange to include productId
  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    };
    
    // Clear product name and price when category changes
    if (field === 'category') {
      updatedProducts[index].name = '';
      updatedProducts[index].price = '';
      updatedProducts[index].productId = '';
    }
    
    // Auto-fill price and productId when product is selected
    if (field === 'name' && value) {
      const category = updatedProducts[index].category;
      const selectedProduct = productsData[category]?.find(p => p.name === value);
      if (selectedProduct) {
        updatedProducts[index].price = selectedProduct.price;
        updatedProducts[index].productId = selectedProduct._id;
      }
    }
    
    setFormData(prevState => ({
      ...prevState,
      products: updatedProducts
    }));
  };

  // Update addProductRow
  const addProductRow = () => {
    setFormData(prevState => ({
      ...prevState,
      products: [
        ...prevState.products,
        { category: '', name: '', quantity: '', price: '', productId: '' }
      ]
    }));
  };

  const removeProductRow = (index) => {
    setFormData(prevState => ({
      ...prevState,
      products: prevState.products.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button 
                type="button" 
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h2 className="text-3xl font-bold tracking-tight">
              {id ? 'Edit Lead' : 'Add New Lead'}
            </h2>
          </div>
          <p className="text-muted-foreground mt-1">
            {id ? 'Update lead information' : 'Create a new lead record'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm flex-1">
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Lead Information */}
            <div className="space-y-6" ref={leadInfoRef}>
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">Lead Information</h2>
                {sectionErrors.leadInfo && (
                  <p className="text-sm text-red-500 mt-1">{sectionErrors.leadInfo}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Lead Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="leadType"
                      value={formData.leadType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Select type</option>
                      {FORM_OPTIONS.leadTypes.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  </div>
                </div>

                {/* New Status Field */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Select status</option>
                      {FORM_OPTIONS.statuses.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  </div>
                </div>

                {/* New Source Field */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Source <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Select source</option>
                      {FORM_OPTIONS.sources.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-6" ref={personalInfoRef}>
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">Personal Information</h2>
                {sectionErrors.personalInfo && (
                  <p className="text-sm text-red-500 mt-1">{sectionErrors.personalInfo}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center">
                      <select
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="h-full py-0 pl-3 pr-7 border-transparent bg-transparent text-muted-foreground sm:text-sm focus:ring-0"
                      >
                        <option>+1</option>
                        <option>+44</option>
                        <option>+91</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-16 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter complete address"
                  />
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-6" ref={businessInfoRef}>
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">Business Information</h2>
                {sectionErrors.businessInfo && (
                  <p className="text-sm text-red-500 mt-1">{sectionErrors.businessInfo}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Customer Type</label>
                  <div className="relative">
                    <select
                      name="customerType"
                      value={formData.customerType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Select type</option>
                      {FORM_OPTIONS.customerTypes.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold">Product Information</h3>
              
              {productError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                  {productError}
                </div>
              )}
              
              {formData.products.map((product, index) => (
                <div 
                  key={index} 
                  className="flex flex-col md:flex-row gap-4 mb-4 p-4 border rounded-lg bg-white"
                >
                  {/* Product Category */}
                  <div className="w-full md:flex-1 mb-4 md:mb-0">
                    <label className="block text-sm font-medium mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="category"
                        value={product.category}
                        onChange={(e) => handleProductChange(index, 'category', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 appearance-none"
                        required
                        disabled={isLoadingProducts}
                      >
                        <option value="">Select Category</option>
                        {productCategories.map(category => (
                          <option key={category} value={category}>
                            {category.replace('_', ' ').split(' ').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Product Name */}
                  <div className="w-full md:flex-1 mb-4 md:mb-0">
                    <label className="block text-sm font-medium mb-1">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="name"
                        value={product.name}
                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 appearance-none"
                        disabled={!product.category || isLoadingProducts}
                        required
                      >
                        <option value="">Select Product</option>
                        {product.category && productsData[product.category]?.map(prod => (
                          <option key={prod.name} value={prod.name}>{prod.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="w-full md:w-32 mb-4 md:mb-0">
                    <label className="block text-sm font-medium mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={product.quantity}
                      onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                      min="1"
                    />
                  </div>

                  {/* Price */}
                  <div className="w-full md:w-40 mb-4 md:mb-0">
                    <label className="block text-sm font-medium mb-1">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={product.price}
                      onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                      min="0"
                      step="0.01"
                      readOnly={product.name !== ''}
                    />
                  </div>

                  {/* Remove Product Button */}
                  {formData.products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProductRow(index)}
                      className="w-full md:w-auto p-3 md:mt-6 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="md:hidden">Remove Product</span>
                    </button>
                  )}
                </div>
              ))}

              {/* Add Product Button */}
              <button
                type="button"
                onClick={addProductRow}
                className="w-full p-4 text-orange-500 hover:bg-orange-50 rounded-lg border-2 border-dashed border-orange-200 flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Another Product
              </button>
            </div>

            {/* Total Budget Display */}
            <div className="flex justify-end border-t border-input pt-4 mt-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Total Budget:</span>
                <span className="text-lg font-semibold text-orange-600">
                  ₹{formData.products.reduce((total, product) => {
                    if (product.quantity && product.price) {
                      return total + (parseFloat(product.quantity) * parseFloat(product.price));
                    }
                    return total;
                  }, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Product Requirements */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-foreground mb-1">
                Product Requirements
              </label>
              <textarea
                name="productRequirements"
                value={formData.productRequirements}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                placeholder="Enter any specific requirements or notes about the products..."
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-6" ref={additionalInfoRef}>
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">Additional Information</h2>
                {sectionErrors.additionalInfo && (
                  <p className="text-sm text-red-500 mt-1">{sectionErrors.additionalInfo}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Stage of Interest</label>
                  <div className="relative">
                    <select
                      name="interestStage"
                      value={formData.interestStage}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Select stage</option>
                      {FORM_OPTIONS.interestStages.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Date of Lead Collection <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                      type="date"
                      name="dateCollected"
                      value={formData.dateCollected}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  name="followUpRequired"
                  checked={formData.followUpRequired}
                  onChange={handleChange}
                  className="w-4 h-4 text-orange-500 border-input rounded focus:ring-orange-500"
                />
                <label htmlFor="followUpRequired" className="text-sm text-foreground">
                  Follow-Up Required
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Attachments</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-input border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <Paperclip className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-orange-500 hover:text-orange-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500"
                      >
                        <span>Upload files</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, PDF up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="sticky bottom-0 left-0 right-0 flex justify-end space-x-4 pt-4 pb-4 border-t border-input bg-white">
              <button
                type="button"
                className="px-6 py-2 border border-input rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                onClick={() => setFormData(defaultFormState)}
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingNavigation(null);
        }}
        onConfirm={handleConfirmLeave}
        title={isEditMode ? "Unsaved Changes" : "Discard New Lead"}
        message={
          isEditMode
            ? "You have unsaved changes to this lead. Are you sure you want to leave?"
            : "You have not saved this new lead. Are you sure you want to discard it?"
        }
      />
    </div>
  );
} 