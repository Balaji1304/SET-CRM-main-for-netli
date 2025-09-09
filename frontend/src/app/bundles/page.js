import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Package, Plus, Edit2, Trash2, Eye, Filter, Search, Loader2, AlertTriangle, ArrowLeft, Save, Upload, X, Info, ShoppingCart, Tag, Layers, TrendingUp, Calendar, Users, Building2, Zap, Settings, FileText } from 'lucide-react';
import { getBundles, deleteBundle, createBundle, getBundle, updateBundle, getCompatibleProducts, getDefaultBundleTerms } from '../../services/bundleService';
import ConfirmDialog from '../../components/ConfirmDialog';

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
    
    /* Ensure dropdowns don't overflow */
    .mobile-select {
      max-width: 100%;
      min-width: 120px;
      text-overflow: ellipsis;
    }
    
    /* Compact filter layout */
    .mobile-filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 8px;
    }
    
    /* Responsive text handling */
    .mobile-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    
    /* Improved modal responsiveness */
    .mobile-modal-content {
      max-height: 95vh;
      overflow-y: auto;
    }
    
    /* Better spacing for mobile cards */
    .mobile-card-compact {
      padding: 12px;
      margin-bottom: 8px;
    }
    
    /* Ensure buttons don't wrap */
    .mobile-button-container {
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      min-width: 0;
    }
    
    /* Force card width constraints */
    .mobile-card-container {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    
    /* Compact action buttons for very small screens */
    .mobile-action-compact {
      padding: 6px !important;
      margin: 0 1px !important;
    }
  }
  
  @media (max-width: 375px) {
    /* Extra small screens like iPhone SE */
    .mobile-card-compact {
      padding: 8px;
    }
    
    .mobile-header-text {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
    
    .mobile-action-buttons {
      gap: 2px !important;
    }
  }

  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-hover-lift {
    transform: translateY(0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card-hover-lift:hover {
    transform: translateY(-4px);
  }

  .gradient-overlay {
    background: linear-gradient(135deg, rgba(255, 115, 0, 0.1) 0%, rgba(255, 136, 0, 0.05) 100%);
  }
`;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function BundlesPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Add state for form management
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  
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
    items: [],
    price: 0,
    images: [],
    systemConfiguration: {
      systemDescription: '',
      installedCapacityKWP: '',
      moduleSpecification: '',
      inverterSpecification: '',
      areaRequired: ''
    },
    termsAndConditions: '',
    isActive: true
  });
  const [formLoading, setFormLoading] = useState(false);
  
  // Image upload states
  const [isDragging, setIsDragging] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // UI states
  const [bundleToDelete, setBundleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState(null);
  
  // Custom KVA state
  const [customKvaValue, setCustomKvaValue] = useState('');

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
        items: [],
        price: 0,
        systemConfiguration: {
          systemDescription: '',
          installedCapacityKWP: '',
          moduleSpecification: '',
          inverterSpecification: '',
          areaRequired: ''
        },
        termsAndConditions: '',
        isActive: true
      };
      
      setBundleForm(initialForm);
      
      // Load solar components for create mode
      fetchSolarComponents();
      
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
        // Ensure systemConfiguration is properly initialized
        const bundleData = {
          ...response.data,
          images: response.data.imageUrls || [], // Convert imageUrls to images for form consistency
          systemConfiguration: {
            systemDescription: response.data.systemConfiguration?.systemDescription || '',
            installedCapacityKWP: response.data.systemConfiguration?.installedCapacityKWP || '',
            moduleSpecification: response.data.systemConfiguration?.moduleSpecification || '',
            inverterSpecification: response.data.systemConfiguration?.inverterSpecification || '',
            areaRequired: response.data.systemConfiguration?.areaRequired || ''
          }
        };
        
        // Check if subcategory is a custom value (not in predefined list)
        const predefinedSubcategories = ['2kva', '4kva', '5kva', '10kva'];
        if (bundleData.subcategory && !predefinedSubcategories.includes(bundleData.subcategory)) {
          // This is a custom KVA value
          setCustomKvaValue(bundleData.subcategory.replace(/kva$/i, '')); // Remove 'kva' suffix for display
          bundleData.subcategory = 'custom'; // Set dropdown to custom
        }
        
        setBundleForm(bundleData);
        // Load solar components after setting the bundle form
        await fetchSolarComponents();
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
        
        if (response.data.length > 0) {
          if (isCreateMode && (!bundleForm.items || bundleForm.items.length === 0)) {
            // Only initialize bundle form with default items when creating a new bundle
            const initialItems = response.data.map(component => ({
              solarItem: component._id,
              quantity: 0
            }));
            setBundleForm(prev => ({
              ...prev,
              items: initialItems
            }));
          } else if (isEditMode && bundleForm.items) {
            // In edit mode, ensure all available components are represented
            // Add missing components with quantity 0
            setBundleForm(prev => {
              const existingItemIds = prev.items.map(item => 
                typeof item.solarItem === 'object' ? item.solarItem._id : item.solarItem
              );
              
              const missingComponents = response.data.filter(component => 
                !existingItemIds.includes(component._id)
              );
              
              const missingItems = missingComponents.map(component => ({
                solarItem: component._id,
                quantity: 0
              }));
              
              return {
                ...prev,
                items: [...prev.items, ...missingItems]
              };
            });
          }
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
    setIsSubmitting(true);
    setSubmissionError(null);
    
    try {
      // Validate required fields before submission
      if (!bundleForm.name || !bundleForm.bundleCode) {
        throw new Error('System Name and System Code are required');
      }
      
      // Validate custom KVA value if custom is selected
      if (bundleForm.subcategory === 'custom' && !customKvaValue.trim()) {
        throw new Error('Custom KVA Rating is required when Custom is selected');
      }
      
      // Process subcategory - if custom, use the custom value, otherwise use selected value
      let processedSubcategory = bundleForm.subcategory;
      if (bundleForm.subcategory === 'custom' && customKvaValue.trim()) {
        // Clean and format the custom KVA value
        let cleanKva = customKvaValue.trim().toLowerCase();
        // Remove any existing 'kva' suffix and extra spaces
        cleanKva = cleanKva.replace(/\s*kva\s*$/i, '');
        // Add 'kva' suffix
        processedSubcategory = `${cleanKva}kva`;
      }
      
      // Prepare form data
      const formData = {
        name: bundleForm.name.trim(),
        bundleCode: bundleForm.bundleCode.trim().toUpperCase(),
        category: bundleForm.category || 'power_plants_system',
        subcategory: processedSubcategory,
        description: bundleForm.description ? bundleForm.description.trim() : 'Solar power plant system',
        items: (bundleForm.items || []).map(item => ({
          solarItem: typeof item.solarItem === 'object' ? item.solarItem._id : item.solarItem,
          quantity: item.quantity || 0
        })),
        price: Number(bundleForm.price) || 0,
        images: bundleForm.images || [],
        systemConfiguration: {
          systemDescription: bundleForm.systemConfiguration?.systemDescription?.trim() || '',
          installedCapacityKWP: Number(bundleForm.systemConfiguration?.installedCapacityKWP) || null,
          moduleSpecification: bundleForm.systemConfiguration?.moduleSpecification?.trim() || '',
          inverterSpecification: bundleForm.systemConfiguration?.inverterSpecification?.trim() || '',
          areaRequired: bundleForm.systemConfiguration?.areaRequired?.trim() || ''
        },
        termsAndConditions: bundleForm.termsAndConditions || ''
      };
      
      console.log('Submitting bundle data:', formData);
      
      let response;
      if (isEditMode) {
        response = await updateBundle(id, formData);
      } else {
        response = await createBundle(formData);
      }
      
      if (response.success) {
        setHasUnsavedChanges(false);
        navigate('/dashboard/bundles');
      } else {
        throw new Error(response.message || `Failed to ${isEditMode ? 'update' : 'create'} system`);
      }
    } catch (err) {
      setSubmissionError(err.message);
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} system:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = async (field, value) => {
    setBundleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateComponentQuantity = (componentId, quantity) => {
    setBundleForm(prev => ({
      ...prev,
      items: prev.items.map(item => {
        // Handle both populated (object) and unpopulated (ID string) solarItem
        const solarItemId = typeof item.solarItem === 'object' ? item.solarItem._id : item.solarItem;
        return solarItemId === componentId
          ? { ...item, quantity: quantity }
          : item;
      })
    }));
  };

  // Image handling functions
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    // Validate number of files
    if (bundleForm.images.length + files.length > 5) {
      setSubmissionError('You can only upload up to 5 images');
      return;
    }
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        setSubmissionError(`File ${file.name} is not a supported image type`);
      }
      if (!isValidSize) {
        setSubmissionError(`File ${file.name} is too large. Maximum size is 5MB`);
      }
      
      return isValidType && isValidSize;
    });
    
    Promise.all(
      validFiles.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    )
    .then(images => {
      setBundleForm(prev => ({
        ...prev,
        images: [...prev.images, ...images]
      }));
    });
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    handleFiles(files);
  };

  const handleRemoveImage = (indexToRemove) => {
    setBundleForm(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
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

  // Function to handle viewing bundle details
  const handleViewBundle = (bundle) => {
    setSelectedBundle(bundle);
    setShowBundleModal(true);
  };

  // Function to close bundle modal
  const closeBundleModal = () => {
    setShowBundleModal(false);
    setSelectedBundle(null);
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
        throw new Error(response.message || 'Failed to delete system');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting bundle:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper functions for consistent UI
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate('/dashboard/bundles');
    }
  };

  const handleConfirmLeave = () => {
    setShowConfirmDialog(false);
    navigate('/dashboard/bundles');
  };

  // Track unsaved changes
  useEffect(() => {
    if (isCreateMode || isEditMode) {
      const hasChanges = bundleForm.name || bundleForm.bundleCode || bundleForm.description || 
                        bundleForm.price > 0 || bundleForm.termsAndConditions || 
                        (bundleForm.items && bundleForm.items.length > 0) ||
                        (bundleForm.images && bundleForm.images.length > 0) ||
                        bundleForm.systemConfiguration?.systemDescription ||
                        bundleForm.systemConfiguration?.installedCapacityKWP ||
                        bundleForm.systemConfiguration?.moduleSpecification ||
                        bundleForm.systemConfiguration?.inverterSpecification ||
                        bundleForm.systemConfiguration?.areaRequired ||
                        (bundleForm.subcategory === 'custom' && customKvaValue);
      setHasUnsavedChanges(hasChanges);
    }
  }, [bundleForm, customKvaValue, isCreateMode, isEditMode]);

  // Add beforeunload event listener for unsaved changes
  useEffect(() => {
    if (isCreateMode || isEditMode) {
      const handleBeforeUnload = (e) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = '';
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges, isCreateMode, isEditMode]);

  const renderSectionHeader = (title) => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">{title}</h2>
    </div>
  );

  const renderInputField = (name, label, type = 'text', placeholder = '', required = false, rows = null) => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {rows ? (
        <textarea
          id={name}
          name={name}
          value={bundleForm[name] || ''}
          onChange={(e) => handleFormChange(name, e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 placeholder-gray-400 touch-target resize-vertical"
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={bundleForm[name] || ''}
          onChange={(e) => handleFormChange(name, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          placeholder={placeholder}
          required={required}
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 placeholder-gray-400 touch-target"
        />
      )}
    </div>
  );

  const renderSelectField = (name, label, options, required = false) => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={bundleForm[name] || ''}
          onChange={(e) => handleFormChange(name, e.target.value)}
          required={required}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target appearance-none"
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );

  const getSubcategoryBadgeClass = (subcategory) => {
    const classes = {
      '2kva': 'bg-green-500/90 text-white border-green-400',
      '4kva': 'bg-blue-500/90 text-white border-blue-400',
      '5kva': 'bg-purple-500/90 text-white border-purple-400',
      '10kva': 'bg-orange-500/90 text-white border-orange-400',
      'custom': 'bg-gray-700/90 text-white border-gray-600'
    };
    return classes[subcategory] || 'bg-gray-700/90 text-white border-gray-600';
  };

  // Bundle Details Modal Component
  const BundleDetailsModal = ({ bundle, onClose }) => {
    // Prevent background scroll when modal is open
    useEffect(() => {
      if (bundle) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [bundle]);

    const getKvaDisplayName = (subcategory) => {
      const displayNames = {
        '2kva': '2 KVA',
        '4kva': '4 KVA',
        '5kva': '5 KVA',
        '10kva': '10 KVA',
        'custom': 'Custom KVA'
      };
      return displayNames[subcategory] || subcategory;
    };

    return createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mobile-modal-content transform transition-all duration-300 ease-out">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#FF7300] to-[#FF8800] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-white mobile-truncate">Solar Power Plant System Details</h2>
                <p className="text-orange-100 text-xs sm:text-sm mobile-truncate">Complete system configuration and components</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors duration-150 touch-target flex-shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="max-h-[calc(95vh-80px)] overflow-y-auto">
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              {/* System Name and Details */}
              <div className="border-b border-gray-100 pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 break-words">{bundle.name}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium mobile-truncate">Code: {bundle.bundleCode}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm mobile-truncate">{getKvaDisplayName(bundle.subcategory)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border-2 backdrop-blur-sm ${getSubcategoryBadgeClass(bundle.subcategory)}`}>
                      {getKvaDisplayName(bundle.subcategory)}
                    </span>
                  </div>
                </div>
                
                {bundle.description && (
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 sm:p-4 rounded-lg mt-3 sm:mt-4 break-words">
                    {bundle.description}
                  </p>
                )}
              </div>

              {/* Key Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {/* Price Information */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="bg-blue-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">System Price</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Complete system cost</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900 break-all">
                    {formatCurrency(bundle.price)}
                  </div>
                </div>

                {/* Components Count */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="bg-green-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Components</h4>
                      <p className="text-xs sm:text-sm text-gray-600">System parts</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">
                    {bundle.items?.filter(item => item.quantity > 0).length || 0}
                  </div>
                </div>

                {/* Total Items */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-xl border border-purple-200 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="bg-purple-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Total Items</h4>
                      <p className="text-xs sm:text-sm text-gray-600">All quantities</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">
                    {bundle.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                  </div>
                </div>
              </div>

              {/* System Configuration */}
              {bundle.systemConfiguration && (
                <div className="bg-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200">
                  <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">System Configuration</h4>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {bundle.systemConfiguration.installedCapacityKWP && (
                      <div className="bg-white p-3 sm:p-4 rounded-lg border">
                        <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Installed Capacity</span>
                        <span className="text-sm sm:text-lg font-semibold text-gray-900">{bundle.systemConfiguration.installedCapacityKWP} KWP</span>
                      </div>
                    )}
                    {bundle.systemConfiguration.areaRequired && (
                      <div className="bg-white p-3 sm:p-4 rounded-lg border">
                        <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Area Required</span>
                        <span className="text-sm sm:text-lg font-semibold text-gray-900">{bundle.systemConfiguration.areaRequired}</span>
                      </div>
                    )}
                    {bundle.systemConfiguration.moduleSpecification && (
                      <div className="bg-white p-3 sm:p-4 rounded-lg border col-span-full">
                        <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Module Specification</span>
                        <span className="text-xs sm:text-sm text-gray-900 break-words">{bundle.systemConfiguration.moduleSpecification}</span>
                      </div>
                    )}
                    {bundle.systemConfiguration.inverterSpecification && (
                      <div className="bg-white p-3 sm:p-4 rounded-lg border col-span-full">
                        <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Inverter Specification</span>
                        <span className="text-xs sm:text-sm text-gray-900 break-words">{bundle.systemConfiguration.inverterSpecification}</span>
                      </div>
                    )}
                    {bundle.systemConfiguration.systemDescription && (
                      <div className="bg-white p-3 sm:p-4 rounded-lg border col-span-full">
                        <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">System Description</span>
                        <p className="text-xs sm:text-sm text-gray-900 break-words">{bundle.systemConfiguration.systemDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Components List */}
              {bundle.items && bundle.items.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200">
                  <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">System Components</h4>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {bundle.items.filter(item => item.quantity > 0).map((item, index) => (
                      <div key={index} className="bg-white p-3 sm:p-4 rounded-lg border flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm sm:text-base mobile-truncate">
                            {item.solarItem?.name || item.name || 'Component'}
                          </div>
                          {item.solarItem?.warranty && (
                            <div className="text-xs sm:text-sm text-gray-500">Warranty: {item.solarItem.warranty}</div>
                          )}
                          {item.solarItem?.componentType && (
                            <div className="text-xs text-gray-400 capitalize mt-1">
                              Type: {item.solarItem.componentType}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-xs sm:text-sm font-medium text-gray-500">Quantity</div>
                            <div className="text-sm sm:text-lg font-semibold text-gray-900">{item.quantity}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Images */}
              {bundle.imageUrls && bundle.imageUrls.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200">
                  <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">System Images</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {bundle.imageUrls.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`${bundle.name} - Image ${index + 1}`}
                          className="w-full h-32 sm:h-48 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all duration-200" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Terms and Conditions */}
              {bundle.termsAndConditions && (
                <div className="bg-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200">
                  <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">Terms and Conditions</h4>
                  </div>
                  <div className="bg-white p-3 sm:p-4 rounded-lg border">
                    <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line break-words">{bundle.termsAndConditions}</p>
                  </div>
                </div>
              )}

              {/* Status and Dates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                <div className="bg-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200">
                  <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">System Status</h4>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center py-1 sm:py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Status</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${bundle.isActive !== false ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-xs sm:text-sm font-medium text-gray-900">
                          {bundle.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    {bundle.createdAt && (
                      <div className="flex justify-between items-center py-1 sm:py-2 border-b border-gray-200 last:border-b-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Created</span>
                        <span className="text-xs sm:text-sm text-gray-900">
                          {new Date(bundle.createdAt).toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}
                    {bundle.updatedAt && (
                      <div className="flex justify-between items-center py-1 sm:py-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Last Updated</span>
                        <span className="text-xs sm:text-sm text-gray-900">
                          {new Date(bundle.updatedAt).toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/dashboard/bundles/${bundle._id}/edit`);
                    }}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#FF7300] text-white rounded-lg font-medium hover:bg-[#FF8800] transition-colors duration-150 touch-target text-sm sm:text-base"
                  >
                    <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    Edit System
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
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
      <>
        <style>{customStyles}</style>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-gray-200 pb-4 sm:pb-5 mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleCancel}
                className="p-2 sm:p-2 rounded-md hover:bg-gray-100 text-gray-600 touch-target"
                aria-label="Back to bundles"
              >
                <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                {isCreateMode ? 'Create New Solar Power Plant System' : 'Edit Solar Power Plant System'}
              </h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1">
              {submissionError && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">{submissionError}</span>
                </div>
              )}

              {/* Bundle Category - First and Most Important */}
              <section>
                {renderSectionHeader('System Category')}
                <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#FF7300] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Select System Type</h3>
                      <p className="text-sm text-gray-600">Choose the KVA rating for your solar power plant system. This helps categorize and price your system correctly.</p>
                    </div>
                  </div>
                  {/* Custom KVA Rating Dropdown */}
                  <div className="w-full">
                    <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">
                      KVA Rating <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="subcategory"
                        name="subcategory"
                        value={bundleForm.subcategory || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleFormChange('subcategory', value);
                          // Clear custom KVA value when switching away from custom
                          if (value !== 'custom') {
                            setCustomKvaValue('');
                          }
                        }}
                        required={true}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target appearance-none"
                      >
                        <option value="">Select kva rating</option>
                        <option value="2kva">2 KVA</option>
                        <option value="4kva">4 KVA</option>
                        <option value="5kva">5 KVA</option>
                        <option value="10kva">10 KVA</option>
                        <option value="custom">Custom</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Custom KVA Input - Show when custom is selected */}
                  {bundleForm.subcategory === 'custom' && (
                    <div className="mt-4">
                      <label htmlFor="customKva" className="block text-sm font-medium text-gray-700 mb-2">
                        Custom KVA Rating <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="customKva"
                          name="customKva"
                          value={customKvaValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow only numbers, decimals, and common KVA suffixes
                            const sanitizedValue = value.replace(/[^0-9.kvaKVA\s]/g, '');
                            setCustomKvaValue(sanitizedValue);
                          }}
                          placeholder="e.g., 7.5 KVA or 15kva"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target"
                          required={bundleForm.subcategory === 'custom'}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-400 text-sm">KVA</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your custom KVA rating (e.g., "7.5" or "15"). The "KVA" suffix will be added automatically.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Basic Information */}
              <section>
                {renderSectionHeader('Basic Information')}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {renderInputField('name', 'System Name', 'text', 'e.g., Solar Power System 5KVA', true)}
                  {renderInputField('bundleCode', 'System Code', 'text', 'e.g., SPB-5KVA-001', true)}
                </div>
                <div className="mt-4 sm:mt-6">
                  {renderInputField('description', 'Description', 'text', 'Describe the system and its components, including what makes it special...', false, 4)}
                  <p className="text-sm text-gray-500 mt-1">
                    {(bundleForm.description || '').length}/1000 characters
                  </p>
                </div>
              </section>

              {/* System Details */}
              <section>
                {renderSectionHeader('System Details')}
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:gap-6">
                  {renderInputField('price', 'System Price (₹)', 'number', '100000', true)}
                </div>
              </section>

              {/* System Configuration */}
              <section>
                {renderSectionHeader('System Configuration')}
                <div className="space-y-4 sm:space-y-6">
                  {/* System Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Description
                    </label>
                    <input
                      type="text"
                      value={bundleForm.systemConfiguration?.systemDescription || ''}
                      onChange={(e) => setBundleForm(prev => ({
                        ...prev,
                        systemConfiguration: {
                          ...prev.systemConfiguration,
                          systemDescription: e.target.value
                        }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target"
                      placeholder="e.g., Grid Connect Solar PV System"
                      maxLength="100"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {(bundleForm.systemConfiguration?.systemDescription || '').length}/100 characters
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Installed Capacity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Installed Capacity (KWP)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={bundleForm.systemConfiguration?.installedCapacityKWP || ''}
                        onChange={(e) => setBundleForm(prev => ({
                          ...prev,
                          systemConfiguration: {
                            ...prev.systemConfiguration,
                            installedCapacityKWP: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target"
                        placeholder="e.g., 15"
                      />
                    </div>

                    {/* Area Required */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Area Required (Approx.)
                      </label>
                      <input
                        type="text"
                        value={bundleForm.systemConfiguration?.areaRequired || ''}
                        onChange={(e) => setBundleForm(prev => ({
                          ...prev,
                          systemConfiguration: {
                            ...prev.systemConfiguration,
                            areaRequired: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target"
                        placeholder="e.g., 1500 Sq.Ft"
                        maxLength="30"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {(bundleForm.systemConfiguration?.areaRequired || '').length}/30 characters
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Module Specification */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Module Specification
                      </label>
                      <input
                        type="text"
                        value={bundleForm.systemConfiguration?.moduleSpecification || ''}
                        onChange={(e) => setBundleForm(prev => ({
                          ...prev,
                          systemConfiguration: {
                            ...prev.systemConfiguration,
                            moduleSpecification: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target"
                        placeholder="e.g., Mono Crystalline Silicon"
                        maxLength="50"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {(bundleForm.systemConfiguration?.moduleSpecification || '').length}/50 characters
                      </p>
                    </div>

                    {/* Inverter Specification */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Inverter Specification
                      </label>
                      <input
                        type="text"
                        value={bundleForm.systemConfiguration?.inverterSpecification || ''}
                        onChange={(e) => setBundleForm(prev => ({
                          ...prev,
                          systemConfiguration: {
                            ...prev.systemConfiguration,
                            inverterSpecification: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target"
                        placeholder="e.g., 15KVA"
                        maxLength="30"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {(bundleForm.systemConfiguration?.inverterSpecification || '').length}/30 characters
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Solar Components */}
              <section>
                {renderSectionHeader('Solar Power Plant Components')}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
                  <p className="text-sm text-gray-600 mb-6">
                    Configure the quantities for each component in your solar power plant system. All components are available but quantities can be set to 0 if not needed.
                  </p>
                  
                  {loadingSolarComponents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#FF7300]" />
                      <span className="ml-2 text-gray-600">Loading solar components...</span>
                    </div>
                  ) : solarComponents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No solar components found. Please add components to continue.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {solarComponents.map((component, index) => {
                        const bundleItem = bundleForm.items.find(item => {
                          // Handle both populated (object) and unpopulated (ID string) solarItem
                          const solarItemId = typeof item.solarItem === 'object' ? item.solarItem._id : item.solarItem;
                          return solarItemId === component._id;
                        });
                        const quantity = bundleItem?.quantity || 0;
                        
                        // Define component type colors
                        const getComponentTypeColor = (type) => {
                          const colors = {
                            'module': 'bg-blue-100 text-blue-700 border-blue-300',
                            'structure': 'bg-green-100 text-green-700 border-green-300',
                            'electrical': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                            'conditioning': 'bg-purple-100 text-purple-700 border-purple-300',
                            'protection': 'bg-red-100 text-red-700 border-red-300',
                            'cable': 'bg-gray-100 text-gray-700 border-gray-300'
                          };
                          return colors[type] || 'bg-gray-100 text-gray-700 border-gray-300';
                        };
                        
                        return (
                          <div key={component._id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-sm transition-shadow">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                              {/* Component Info */}
                              <div className="md:col-span-2">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 mb-1 leading-tight">{component.name}</h4>
                                    {component.componentType && (
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getComponentTypeColor(component.componentType)}`}>
                                        {component.componentType.charAt(0).toUpperCase() + component.componentType.slice(1)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Warranty: {component.warranty}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Quantity Input */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="9999"
                                  value={quantity}
                                  onChange={(e) => updateComponentQuantity(component._id, parseInt(e.target.value) || 0)}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target text-center font-medium"
                                  placeholder="0"
                                />
                                <p className="text-xs text-gray-500 mt-1 text-center">
                                  {quantity > 0 ? `${quantity} ${quantity === 1 ? 'unit' : 'units'}` : 'Not included'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* System Images */}
              <section>
                {renderSectionHeader('System Images')}
                <div 
                  className={`relative border-2 border-dashed rounded-lg p-6 sm:p-8 transition-all duration-200 ${
                    isDragging 
                      ? 'border-[#FF7300] bg-orange-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <div className="mx-auto flex justify-center">
                      <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">
                        Drop system images here
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG or JPEG (MAX. 5MB) • Up to 5 images
                      </p>
                    </div>
                  </div>
                  <label className="absolute inset-0 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      max="5"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {bundleForm.images && bundleForm.images.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Preview</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {bundleForm.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                            <img
                              src={image}
                              alt={`Preview ${index + 1}`}
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-gray-500">
                      {bundleForm.images.length} image{bundleForm.images.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </section>

              {/* Terms and Conditions */}
              <section>
                {renderSectionHeader('Terms and Conditions')}
                <div>
                  {renderInputField('termsAndConditions', 'Terms and Conditions', 'text', 'Enter terms and conditions for this system...', false, 6)}
                  <p className="text-sm text-gray-500 mt-1">
                    These terms will be included in quotations for this system. {(bundleForm.termsAndConditions || '').length}/5000 characters
                  </p>
                </div>
              </section>
            </form>

            {/* Footer Actions */}
            <div className="bg-white border-t border-gray-200 p-4 sm:p-6 sticky bottom-0 left-0 right-0 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-target"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleFormSubmit}
                className="w-full sm:w-auto px-6 py-3 bg-[#FF7300] text-white rounded-lg text-sm font-medium hover:bg-[#FF8800] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px] touch-target"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isCreateMode ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  isCreateMode ? 'Create System' : 'Update System'
                )}
              </button>
            </div>
          </div>

          <ConfirmDialog
            isOpen={showConfirmDialog}
            onClose={() => setShowConfirmDialog(false)}
            onConfirm={handleConfirmLeave}
            title="Unsaved Changes"
            message="You have unsaved changes. Are you sure you want to leave?"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-gray-200 pb-3 sm:pb-5 mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF7300] flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 mobile-truncate">
              Solar Power Plant Systems
            </h1>
          </div>
          <button
            onClick={() => navigate('/dashboard/bundles/create')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-[#FF7300] text-white rounded-lg text-sm font-medium hover:bg-[#FF8800] transition-colors touch-target"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            Create System
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="mobile-filter-grid sm:grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {/* Search */}
            <div className="sm:col-span-2 md:col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Systems</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, code, or description..."
                  className="pl-10 w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target"
                />
              </div>
            </div>

            {/* KVA Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">KVA Rating</label>
              <select
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                className="mobile-select w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target appearance-none"
              >
                <option value="">All Ratings</option>
                <option value="2kva">2 KVA</option>
                <option value="4kva">4 KVA</option>
                <option value="5kva">5 KVA</option>
                <option value="10kva">10 KVA</option>
                <option value="custom">Custom</option>
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
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-target"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bundles Grid */}
        <div className="flex-1">
          {isListMode && filteredBundles.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl border-2 border-dashed border-orange-200 shadow-sm p-6 sm:p-12 text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-[#FF7300]" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">No systems found</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed">
                {bundles.length === 0 
                  ? "Start building your solar power plant system catalog. Create professional system configurations with components, images, and pricing." 
                  : "No systems match your current filters. Try adjusting your search criteria to see more results."
                }
              </p>
              {bundles.length === 0 && (
                <button
                  onClick={() => navigate('/dashboard/bundles/create')}
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#FF7300] text-white rounded-xl text-sm sm:text-base font-semibold hover:bg-[#FF8800] transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg touch-target"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Create Your First System
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
              {isListMode && filteredBundles.map((bundle) => (
                <div key={bundle._id} className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl card-hover-lift transition-all duration-300 overflow-hidden mobile-card-container">
                  
                  {/* Hero Image Section */}
                  <div className="relative h-36 sm:h-48 bg-gradient-to-br from-orange-50 to-orange-100 gradient-overlay">
                    {bundle.imageUrls && bundle.imageUrls.length > 0 ? (
                      <div className="relative h-full w-full">
                        <img
                          src={bundle.imageUrls[0]}
                          alt={bundle.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Image overlay with count */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        {bundle.imageUrls.length > 1 && (
                          <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-black/70 text-white backdrop-blur-sm">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {bundle.imageUrls.length}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <Package className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 opacity-50" />
                          <span className="text-xs sm:text-sm">No images</span>
                        </div>
                      </div>
                    )}
                    
                    {/* KVA Badge */}
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                      <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold border-2 backdrop-blur-sm ${getSubcategoryBadgeClass(bundle.subcategory)}`}>
                        {(() => {
                          const predefinedSubcategories = ['2kva', '4kva', '5kva', '10kva'];
                          if (predefinedSubcategories.includes(bundle.subcategory)) {
                            return bundle.subcategory?.toUpperCase();
                          } else {
                            return bundle.subcategory?.toUpperCase() || 'CUSTOM';
                          }
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3 sm:p-6 mobile-card-compact">
                    {/* Header */}
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-[#FF7300] transition-colors cursor-pointer mobile-header-text"
                              onClick={() => handleViewBundle(bundle)}
                              title="Click to view details">
                            {bundle.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block mt-1 mobile-truncate">
                            {bundle.bundleCode}
                          </p>
                        </div>
                      </div>
                      
                      {bundle.description && (
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {bundle.description}
                        </p>
                      )}
                    </div>

                    {/* System Configuration */}
                    {bundle.systemConfiguration && (
                      <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs">
                          {bundle.systemConfiguration.installedCapacityKWP && (
                            <div>
                              <span className="text-gray-500 block">Capacity</span>
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {bundle.systemConfiguration.installedCapacityKWP} KWP
                              </span>
                            </div>
                          )}
                          {bundle.systemConfiguration.areaRequired && (
                            <div>
                              <span className="text-gray-500 block">Area</span>
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {bundle.systemConfiguration.areaRequired}
                              </span>
                            </div>
                          )}
                          {bundle.systemConfiguration.moduleSpecification && (
                            <div className="col-span-2">
                              <span className="text-gray-500 block">Module</span>
                              <span className="font-semibold text-gray-900 text-xs line-clamp-1">
                                {bundle.systemConfiguration.moduleSpecification}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm sm:text-lg font-bold text-blue-600">
                          {bundle.items?.filter(item => item.quantity > 0).length || 0}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">Components</div>
                      </div>
                      
                      <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                        <div className="text-sm sm:text-lg font-bold text-green-600">
                          {bundle.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                        </div>
                        <div className="text-xs text-green-600 font-medium">Total Items</div>
                      </div>
                      
                      <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                        <div className="text-xs text-orange-600 font-medium">Price</div>
                        <div className="text-xs sm:text-sm font-bold text-[#FF7300] line-clamp-1">
                          {formatCurrency(bundle.price)}
                        </div>
                      </div>
                    </div>

                    {/* System Status */}
                    <div className="mb-3 sm:mb-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${bundle.isActive !== false ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-xs font-medium text-gray-600">
                          {bundle.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      {bundle.createdAt && (
                        <span className="text-xs text-gray-500">
                          {new Date(bundle.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-1 mobile-action-buttons">
                        <button
                          onClick={() => handleViewBundle(bundle)}
                          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#FF7300] hover:bg-orange-50 rounded-lg transition-all duration-200 touch-target mobile-action-compact"
                          title="View System Details"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/bundles/${bundle._id}/edit`)}
                          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#FF7300] hover:bg-orange-50 rounded-lg transition-all duration-200 touch-target mobile-action-compact"
                          title="Edit System"
                        >
                          <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteBundle(bundle)}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 touch-target mobile-action-compact"
                        title="Delete System"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Bundle Details Modal */}
      {showBundleModal && selectedBundle && (
        <BundleDetailsModal 
          bundle={selectedBundle} 
          onClose={closeBundleModal} 
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setBundleToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete System"
        message={`Are you sure you want to delete "${bundleToDelete?.name}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        isDestructive={true}
      />
    </div>
    </>
  );
} 