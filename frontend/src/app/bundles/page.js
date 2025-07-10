import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Edit2, Trash2, Eye, Filter, Search, Loader2, AlertTriangle } from 'lucide-react';
import { getBundles, deleteBundle } from '../../services/bundleService';
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
  const [bundles, setBundles] = useState([]);
  const [filteredBundles, setFilteredBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
    fetchBundles();
  }, []);

  useEffect(() => {
    filterBundles();
  }, [bundles, searchTerm, subcategoryFilter, brandFilter, statusFilter]);

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
        <p className="text-lg text-secondary">Loading bundles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[400px] p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Loading Bundles</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
        <button
          onClick={fetchBundles}
          className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
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
        {filteredBundles.length === 0 ? (
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
            {filteredBundles.map((bundle) => (
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
                      <span className="text-gray-600">Base Price:</span>
                      <span className="text-secondary font-medium">{formatCurrency(bundle.basePrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Final Price:</span>
                      <span className="text-primary font-bold">{formatCurrency(bundle.finalPrice)}</span>
                    </div>
                    {bundle.discountPercentage > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="text-green-600 font-medium">{bundle.discountPercentage}%</span>
                      </div>
                    )}
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