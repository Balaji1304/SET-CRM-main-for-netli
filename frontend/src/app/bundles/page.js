import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Package, Plus, Edit2, Trash2, Eye, Filter, Search, Loader2, AlertTriangle, ArrowLeft, Save } from 'lucide-react';
import { getBundles, deleteBundle, createBundle, getBundle, updateBundle, getCompatibleProducts, getDefaultBundleTerms } from '../../services/bundleService';
import ConfirmDialog from '../../components/ConfirmDialog';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatBrandName = (brand) => {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

export default function BundlesPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Determine the current mode based on the URL
  const isCreateMode = location.pathname.includes('/create');
  const isEditMode = location.pathname.includes('/edit');
  const isListMode = !isCreateMode && !isEditMode;

  const [bundles, setBundles] = useState([]);
  const [filteredBundles, setFilteredBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Product selection state
  const [solarComponents, setSolarComponents] = useState([]);
  const [loadingSolarComponents, setLoadingSolarComponents] = useState(false);
  
  // Bundle form state
  const [bundleForm, setBundleForm] = useState({
    name: '',
    bundleCode: '',
    description: '',
    category: 'power_plants_system',
    subcategory: '2kva',
    supportedBrands: [],
    items: [],
    price: 0,
    specifications: {
      powerOutput: '',
      efficiency: '',
      warranty: '',
      installationType: ''
    },
    termsAndConditions: '',
    isActive: true
  });
  const [formLoading, setFormLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // UI states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isListMode) {
      fetchBundles();
    } else if (isEditMode && id) {
      fetchBundleForEdit(id);
    } else if (isCreateMode) {
      // Clear any potential localStorage/sessionStorage pollution
      try {
        localStorage.removeItem('bundleForm');
        sessionStorage.removeItem('bundleForm');
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }
      
      // Reset form for create mode with clean state
      const initialForm = {
        name: '',
        bundleCode: '',
        description: '',
        category: 'power_plants_system',
        subcategory: '2kva',
        supportedBrands: [],
        items: [],
        price: 0,
        specifications: {
          powerOutput: '',
          efficiency: '',
          warranty: '',
          installationType: ''
        },
        termsAndConditions: '',
        isActive: true
      };
      
      setBundleForm(initialForm);
      
      // Auto-fill default terms and conditions for bundles
      const loadDefaultTerms = async () => {
        try {
          const response = await getDefaultBundleTerms();
          if (response.success && response.data.termsAndConditions) {
            setBundleForm(prev => ({
              ...prev,
              termsAndConditions: response.data.termsAndConditions
            }));
          }
        } catch (error) {
          console.error('Error fetching default bundle terms:', error);
        }
      };
      
      loadDefaultTerms();
      
      // Load solar components for selection
      fetchSolarComponents();
      setLoading(false);
    }
  }, [isListMode, isEditMode, isCreateMode, id]);

  useEffect(() => {
    if (isListMode) {
      filterBundles();
    }
  }, [bundles, searchTerm, subcategoryFilter, brandFilter, statusFilter, isListMode]);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBundles();
      
      if (response.success) {
        setBundles(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch bundles');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching bundles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBundleForEdit = async (bundleId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBundle(bundleId);
      
      if (response.success) {
        setBundleForm(response.data);
        fetchSolarComponents(); // Load solar components for editing
      } else {
        throw new Error(response.message || 'Failed to fetch bundle');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching bundle:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSolarComponents = async () => {
    try {
      setLoadingSolarComponents(true);
      const response = await getCompatibleProducts(); // This now returns all solar components
      
      if (response.success) {
        setSolarComponents(response.data);
        // Initialize bundle form with all 7 components
        if (response.data.length > 0 && (!bundleForm.items || bundleForm.items.length === 0)) {
          const initialItems = response.data.map(component => ({
            solarItem: component._id,
            quantity: 0
          }));
          setBundleForm(prev => ({
            ...prev,
            items: initialItems
          }));
        }
      } else {
        console.error('Failed to fetch solar components:', response.message);
      }
    } catch (err) {
      console.error('Error fetching solar components:', err);
    } finally {
      setLoadingSolarComponents(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setFormLoading(true);
      setError(null);
      
      // Validate required fields before submission
      if (!bundleForm.name || !bundleForm.bundleCode) {
        throw new Error('Name and Bundle Code are required');
      }
      
      // Prepare form data
      const formData = {
        name: bundleForm.name.trim(),
        bundleCode: bundleForm.bundleCode.trim().toUpperCase(),
        category: bundleForm.category || 'power_plants_system',
        subcategory: bundleForm.subcategory,
        // Security fix: Ensure description doesn't contain sensitive data or console output
        description: bundleForm.description && 
          !bundleForm.description.includes('mongodb') && 
          !bundleForm.description.includes('✅') &&
          !bundleForm.description.includes('📝') &&
          !bundleForm.description.includes('Connected to MongoDB') &&
          !bundleForm.description.includes('SchemaType.doValidate') &&
          bundleForm.description.length < 500
          ? bundleForm.description.trim() 
          : 'Power plant bundle system',
        items: bundleForm.items || [],
        price: Number(bundleForm.price) || 0,
        specifications: bundleForm.specifications || {},
        supportedBrands: bundleForm.supportedBrands || [],
        termsAndConditions: bundleForm.termsAndConditions || '',
        isActive: bundleForm.isActive !== false
      };
      
      // Debug: Check for sensitive data leaks
      if (bundleForm.description && 
          (bundleForm.description.includes('mongodb') || 
           bundleForm.description.includes('✅') ||
           bundleForm.description.includes('Connected to MongoDB'))) {
        console.error('🚨 SECURITY ALERT: Sensitive data detected in form!');
        console.error('Original description:', bundleForm.description);
        console.error('This is a security issue that needs investigation.');
        
        // Force clear the form
        setBundleForm({
          name: '',
          bundleCode: '',
          description: '',
          category: 'power_plants_system',
          subcategory: '2kva',
          supportedBrands: [],
          items: [],
          price: 0,
          specifications: {
            powerOutput: '',
            efficiency: '',
            warranty: '',
            installationType: ''
          },
          isActive: true
        });
        
        setError('Form has been cleared due to security issue. Please try again.');
        return;
      }
      
      console.log('Submitting bundle data:', formData);
      
      let response;
      if (isEditMode) {
        response = await updateBundle(id, formData);
      } else {
        response = await createBundle(formData);
      }
      
      if (response.success) {
        navigate('/dashboard/bundles');
      } else {
        throw new Error(response.message || `Failed to ${isEditMode ? 'update' : 'create'} bundle`);
      }
    } catch (err) {
      setError(err.message);
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} bundle:`, err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormChange = async (field, value) => {
    setBundleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecificationChange = (field, value) => {
    setBundleForm(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [field]: value
      }
    }));
  };

  const handleBrandToggle = (brand) => {
    setBundleForm(prev => ({
      ...prev,
      supportedBrands: prev.supportedBrands.includes(brand)
        ? prev.supportedBrands.filter(b => b !== brand)
        : [...prev.supportedBrands, brand]
    }));
  };

  const updateComponentQuantity = (componentId, quantity) => {
    setBundleForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.solarItem === componentId
          ? { ...item, quantity: quantity }
          : item
      )
    }));
  };



  const filterBundles = () => {
    let filtered = bundles;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(bundle =>
        bundle.name.toLowerCase().includes(searchLower) ||
        bundle.bundleCode.toLowerCase().includes(searchLower) ||
        bundle.description.toLowerCase().includes(searchLower)
      );
    }

    // Subcategory filter
    if (subcategoryFilter) {
      filtered = filtered.filter(bundle => bundle.subcategory === subcategoryFilter);
    }

    // Brand filter
    if (brandFilter) {
      filtered = filtered.filter(bundle => 
        bundle.supportedBrands.includes(brandFilter)
      );
    }

    // Status filter
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(bundle => bundle.isActive === isActive);
    }

    setFilteredBundles(filtered);
  };

  const handleDeleteBundle = async (bundle) => {
    setBundleToDelete(bundle);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!bundleToDelete) return;

    try {
      setIsDeleting(true);
      const response = await deleteBundle(bundleToDelete._id);
      
      if (response.success) {
        setBundles(prev => prev.filter(b => b._id !== bundleToDelete._id));
        setShowConfirmDialog(false);
        setBundleToDelete(null);
      } else {
        throw new Error(response.message || 'Failed to delete bundle');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting bundle:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getSubcategoryBadgeClass = (subcategory) => {
    const classes = {
      '2kva': 'bg-green-100 text-green-700 border-green-300',
      '4kva': 'bg-blue-100 text-blue-700 border-blue-300',
      '5kva': 'bg-purple-100 text-purple-700 border-purple-300',
      '10kva': 'bg-orange-100 text-orange-700 border-orange-300',
      'custom': 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return classes[subcategory] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[400px] p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[400px] p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show create/edit form
  if (isCreateMode || isEditMode) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-fourth pb-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/bundles')}
              className="p-2 hover:bg-fourth rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-secondary" />
            </button>
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-secondary">
              {isCreateMode ? 'Create Bundle' : 'Edit Bundle'}
            </h1>
          </div>
          <button
            onClick={handleFormSubmit}
            disabled={formLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {formLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {formLoading ? 'Saving...' : 'Save Bundle'}
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto">
          <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto space-y-8">
            {/* Basic Information */}
            <div className="bg-tertiary rounded-lg border border-fourth p-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bundle Name *</label>
                  <input
                    type="text"
                    value={bundleForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="e.g., Solar Power System 5KVA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bundle Code *</label>
                  <input
                    type="text"
                    value={bundleForm.bundleCode}
                    onChange={(e) => handleFormChange('bundleCode', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="e.g., SPB-5KVA-001"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={bundleForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="Describe the bundle and its components..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">KVA Rating *</label>
                  <select
                    value={bundleForm.subcategory}
                    onChange={(e) => handleFormChange('subcategory', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="2kva">2 KVA</option>
                    <option value="4kva">4 KVA</option>
                    <option value="5kva">5 KVA</option>
                    <option value="10kva">10 KVA</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={bundleForm.isActive}
                    onChange={(e) => handleFormChange('isActive', e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹) *</label>
                  <input
                    type="number"
                    value={bundleForm.price}
                    onChange={(e) => handleFormChange('price', parseFloat(e.target.value) || 0)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="100000"
                  />
                </div>
              </div>
            </div>

            {/* Supported Brands */}
            <div className="bg-tertiary rounded-lg border border-fourth p-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Supported Brands</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['panasonic', 'growatt', 'vikram', 'tata', 'luminous', 'exide', 'other'].map((brand) => (
                  <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bundleForm.supportedBrands.includes(brand)}
                      onChange={() => handleBrandToggle(brand)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-secondary">{formatBrandName(brand)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Specifications */}
            <div className="bg-tertiary rounded-lg border border-fourth p-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Power Output</label>
                  <input
                    type="text"
                    value={bundleForm.specifications.powerOutput}
                    onChange={(e) => handleSpecificationChange('powerOutput', e.target.value)}
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="e.g., 5000W"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Efficiency</label>
                  <input
                    type="text"
                    value={bundleForm.specifications.efficiency}
                    onChange={(e) => handleSpecificationChange('efficiency', e.target.value)}
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="e.g., 95%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Warranty</label>
                  <input
                    type="text"
                    value={bundleForm.specifications.warranty}
                    onChange={(e) => handleSpecificationChange('warranty', e.target.value)}
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="e.g., 5 years"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Installation Type</label>
                  <input
                    type="text"
                    value={bundleForm.specifications.installationType}
                    onChange={(e) => handleSpecificationChange('installationType', e.target.value)}
                    className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="e.g., Rooftop, Ground Mount"
                  />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-tertiary rounded-lg border border-fourth p-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Terms and Conditions</h3>
              <p className="text-sm text-gray-600 mb-4">
                These terms and conditions will be included in quotations for this solar power plant bundle. Default terms are automatically loaded for all bundles.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms and Conditions</label>
                <textarea
                  value={bundleForm.termsAndConditions}
                  onChange={(e) => handleFormChange('termsAndConditions', e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary resize-vertical"
                  placeholder="Enter terms and conditions for this bundle..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {bundleForm.termsAndConditions.length}/5000 characters
                </p>
              </div>
            </div>

            {/* Solar Components */}
            <div className="bg-tertiary rounded-lg border border-fourth p-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Solar Power Plant Components</h3>
              <p className="text-sm text-gray-600 mb-6">
                Configure the quantities for each component in your solar power plant system. All components are required but quantities can be set to 0 if not needed.
              </p>
              
              {loadingSolarComponents ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading solar components...</p>
                </div>
              ) : solarComponents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No solar components found. Please add components to continue.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {solarComponents.map((component, index) => {
                    const bundleItem = bundleForm.items.find(item => item.solarItem === component._id);
                    const quantity = bundleItem?.quantity || 0;
                    
                    return (
                      <div key={component._id} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center">
                          {/* Component Info */}
                          <div className="md:col-span-5">
                            <h4 className="font-medium text-secondary">{component.name}</h4>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Warranty: {component.warranty}</span>
                            </div>
                          </div>
                          
                          {/* Quantity Input */}
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="0"
                              value={quantity}
                              onChange={(e) => updateComponentQuantity(component._id, parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-center"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-fourth pb-5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-secondary">
            Product Bundles
          </h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/bundles/create')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Create Bundle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-tertiary rounded-lg border border-fourth p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search bundles..."
                className="pl-10 w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Subcategory Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KVA Rating</label>
            <select
              value={subcategoryFilter}
              onChange={(e) => setSubcategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm"
            >
              <option value="">All Ratings</option>
              <option value="2kva">2 KVA</option>
              <option value="4kva">4 KVA</option>
              <option value="5kva">5 KVA</option>
              <option value="10kva">10 KVA</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm"
            >
              <option value="">All Brands</option>
              <option value="panasonic">Panasonic</option>
              <option value="growatt">Growatt</option>
              <option value="vikram">Vikram</option>
              <option value="tata">Tata</option>
              <option value="luminous">Luminous</option>
              <option value="exide">Exide</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSubcategoryFilter('');
                setBrandFilter('');
                setStatusFilter('');
              }}
              className="w-full px-3 py-2 border border-fourth rounded-lg text-sm font-medium text-secondary hover:bg-fourth transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bundles Grid */}
      <div className="flex-1">
        {isListMode && filteredBundles.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-secondary mb-2">No bundles found</p>
            <p className="text-sm text-gray-600">
              {bundles.length === 0 
                ? "Create your first product bundle to get started." 
                : "Try adjusting your filters to see more results."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isListMode && filteredBundles.map((bundle) => (
              <div key={bundle._id} className="bg-tertiary rounded-lg border border-fourth shadow-sm overflow-hidden">
                {/* Bundle Header */}
                <div className="p-4 border-b border-fourth">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-secondary">{bundle.name}</h3>
                      <p className="text-sm text-gray-600">{bundle.bundleCode}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSubcategoryBadgeClass(bundle.subcategory)}`}>
                      {bundle.subcategory?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{bundle.description}</p>
                </div>

                {/* Bundle Details */}
                <div className="p-4">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Items:</span>
                      <span className="text-secondary font-medium">{bundle.items?.length || 0} products</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="text-primary font-bold">{formatCurrency(bundle.price)}</span>
                    </div>
                  </div>

                  {/* Supported Brands */}
                  {bundle.supportedBrands && bundle.supportedBrands.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-1">Supported Brands:</p>
                      <div className="flex flex-wrap gap-1">
                        {bundle.supportedBrands.slice(0, 3).map((brand) => (
                          <span key={brand} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {formatBrandName(brand)}
                          </span>
                        ))}
                        {bundle.supportedBrands.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            +{bundle.supportedBrands.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      bundle.isActive 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}>
                      {bundle.isActive ? 'Active' : 'Inactive'}
                    </span>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => navigate(`/dashboard/bundles/${bundle._id}`)}
                        className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors"
                        title="View Bundle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/bundles/${bundle._id}/edit`)}
                        className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors"
                        title="Edit Bundle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBundle(bundle)}
                        className="p-1 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Bundle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setBundleToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Bundle"
        message={`Are you sure you want to delete "${bundleToDelete?.name}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        isDestructive={true}
      />
    </div>
  );
} 