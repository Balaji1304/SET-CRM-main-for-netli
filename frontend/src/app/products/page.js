import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, AlertTriangle, Loader2, X, Package, Layers, TrendingUp, Calendar, Info, ShoppingCart, Tag, Zap, Users, Building2, FileText, Filter, RotateCcw } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getProducts, deleteProduct, exportProducts } from '../../services/productService';
import ExportButton from '../../components/ExportButton';
import { downloadCSV } from '../../utils/csv';
import { useAuth } from '../../context/AuthContext';

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
`;

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortOption, setSortOption] = useState("name-asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const [exportLoading, setExportLoading] = useState(false);
  const { user } = useAuth();

  const itemsPerPage = 10;

  // Function to reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
    setSortOption("name-asc");
    setShowFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || categoryFilter !== "all" || stockFilter !== "all" || sortOption !== "name-asc";

  // Count active filters (excluding search term and sort for display)
  const activeFilterCount = [
    categoryFilter !== "all" ? categoryFilter : null,
    stockFilter !== "all" ? stockFilter : null
  ].filter(Boolean).length;

  // Fetch products when component mounts
  useEffect(() => {
    fetchProducts();
  }, []);

  const handleExport = async ({ startDate, endDate }) => {
    setExportLoading(true);
    try {
      const response = await exportProducts({ startDate, endDate });
      if (response.success) {
        downloadCSV(response.data, `products-${startDate}-to-${endDate}.csv`);
      } else {
        console.error('Failed to export products:', response.message);
      }
    } catch (error) {
      console.error('An error occurred during product export:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Function to fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getProducts();
      if (response.success) {
        setProducts(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch products');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while loading products. Please try again.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle product deletion
  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete && !isDeleting) {
      setIsDeleting(true);
      setError(null);
      try {
        const response = await deleteProduct(productToDelete._id);
        
        if (response.success) {
          setProducts(products.filter(p => p._id !== productToDelete._id));
          setShowDeleteDialog(false);
          setProductToDelete(null);
        } else {
          throw new Error(response.message || 'Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        setError(error.message || 'Failed to delete product. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Function to handle product editing
  const handleEditProduct = (productId) => {
    navigate(`/dashboard/products/${productId}/edit`);
  };

  // Function to handle viewing product details
  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  // Function to close product modal
  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  const getStockStatus = (product) => {
    if (product.quantity <= 0) return 'Out of Stock';
    if (product.quantity <= product.reorderLevel) return 'Low Stock';
    return 'In Stock';
  };

  const filteredProducts = products.filter(product => {
    const stockStatus = getStockStatus(product);
    return product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === "all" || product.category === categoryFilter) &&
    (stockFilter === "all" || stockStatus.toLowerCase().replace(' ', '_') === stockFilter.toLowerCase())
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const [key, direction] = sortOption.split('-');

    let aValue;
    let bValue;

    switch (key) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'price':
        aValue = a.price;
        bValue = b.price;
        break;
      case 'stock':
        const stockOrder = { 'Low Stock': 1, 'Out of Stock': 2, 'In Stock': 3 };
        aValue = stockOrder[getStockStatus(a)];
        bValue = stockOrder[getStockStatus(b)];
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  // Product Details Modal Component
  const ProductDetailsModal = ({ product, onClose }) => {
    const stockStatus = getStockStatus(product);
    
    // Prevent scroll when modal is open
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, []);
    
    return createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mobile-modal-content transform transition-all duration-300 ease-out">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#FF7300] to-[#FF8800] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-white mobile-truncate">Product Details</h2>
                <p className="text-orange-100 text-xs sm:text-sm mobile-truncate">Complete product information</p>
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
              {/* Product Name and Model */}
              <div className="border-b border-gray-100 pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 break-words">{product.name}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium mobile-truncate">Model: {product.modelNumber}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Layers className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm mobile-truncate">{product.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium
                      ${stockStatus === 'In Stock' ? 'bg-green-100 text-green-800 border border-green-200'
                      : stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                      {stockStatus}
                    </span>
                  </div>
                </div>
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
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Price</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Current selling price</p>
                    </div>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">₹</span>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900 break-all">
                      {product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Stock Information */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="bg-green-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Stock Quantity</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Available units</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">{product.quantity}</span>
                    <span className="text-xs sm:text-sm text-gray-600">units</span>
                  </div>
                </div>

                {/* MOQ Information */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="bg-purple-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">MOQ</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Minimum order quantity</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">{product.reorderLevel}</span>
                    <span className="text-xs sm:text-sm text-gray-600">units</span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {/* Product Specifications */}
                <div className="bg-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200">
                  <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">Specifications</h4>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center py-1 sm:py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Category</span>
                      <span className="text-xs sm:text-sm text-gray-900 mobile-truncate text-right">{product.category}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 sm:py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Model Number</span>
                      <span className="text-xs sm:text-sm text-gray-900 font-mono mobile-truncate text-right">{product.modelNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 sm:py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Reorder Level</span>
                      <span className="text-xs sm:text-sm text-gray-900">{product.reorderLevel} units</span>
                    </div>
                    {product.description && (
                      <div className="py-1 sm:py-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-600 block mb-1">Description</span>
                        <p className="text-xs sm:text-sm text-gray-900 break-words">{product.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability & Status */}
                <div className="bg-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200">
                  <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">Availability & Status</h4>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center py-1 sm:py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Availability</span>
                      <span className="text-xs sm:text-sm text-gray-900 mobile-truncate text-right">{product.availability}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 sm:py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Stock Status</span>
                      <span className={`text-xs sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full
                        ${stockStatus === 'In Stock' ? 'bg-green-100 text-green-800'
                        : stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {stockStatus}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 sm:py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Current Stock</span>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <span className="text-xs sm:text-sm text-gray-900">{product.quantity} units</span>
                        <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div 
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                              stockStatus === 'In Stock' ? 'bg-green-500' 
                              : stockStatus === 'Low Stock' ? 'bg-yellow-500' 
                              : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((product.quantity / (product.reorderLevel * 2)) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {product.updatedAt && (
                      <div className="flex justify-between items-center py-1 sm:py-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Last Updated</span>
                        <span className="text-xs sm:text-sm text-gray-900">
                          {new Date(product.updatedAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
                  {product.brochureUrl && (
                    <button
                      onClick={() => navigate(`/dashboard/products/${product._id}/brochure`)}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-150 touch-target text-sm sm:text-base"
                    >
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                      View Brochure
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      handleEditProduct(product._id);
                    }}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#FF7300] text-white rounded-lg font-medium hover:bg-[#FF8800] transition-colors duration-150 touch-target text-sm sm:text-base"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                    Edit Product
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

  // Delete Modal Component
  const DeleteModal = () => {
    // Prevent scroll when modal is open
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, []);

    return createPortal(
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-2 sm:p-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ease-out">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Confirm Delete</h3>
            <button 
              onClick={() => { 
                setShowDeleteDialog(false); 
                setProductToDelete(null);
                setError(null);
              }} 
              className="p-1 rounded-full hover:bg-gray-100 touch-target"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500"/>
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4 sm:mb-6 break-words">
            Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
          </p>
          {error && <p className="text-sm text-red-600 mb-3 text-center break-words">{error}</p>}
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => { 
                setShowDeleteDialog(false); 
                setProductToDelete(null);
                setError(null);
              }}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 touch-target"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className={`w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[70px] sm:min-w-[80px] touch-target`}
            >
              {isDeleting ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : 'Delete'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };
  const ProductCard = ({ product }) => {
    const stockStatus = getStockStatus(product);
    
    return (
      <div className="mobile-card-compact mobile-card-container bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-1 sm:gap-2">
          <div className="flex-1 min-w-0 max-w-[calc(100%-140px)] sm:max-w-[calc(100%-160px)]">
            <h3 className="mobile-header-text text-base sm:text-lg font-semibold text-gray-900 mb-1 cursor-pointer hover:text-[#FF7300] transition-colors duration-150 line-clamp-2 leading-tight"
                onClick={() => handleViewProduct(product)}
                title={product.name}>
              {product.name}
            </h3>
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="mobile-truncate">{product.modelNumber}</span>
            </div>
          </div>
          <div className="mobile-action-buttons flex items-center gap-0.5 sm:gap-1 flex-shrink-0 w-[140px] sm:w-[160px] justify-end">
            <button
              onClick={() => handleViewProduct(product)}
              className="mobile-action-compact p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150"
              title="View Details"
            >
              <Info className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            {product.brochureUrl && (
              <button
                onClick={() => navigate(`/dashboard/products/${product._id}/brochure`)}
                className="mobile-action-compact p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150"
                title="View Brochure"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
            <button
              onClick={() => handleEditProduct(product._id)}
              className="mobile-action-compact p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
              title="Edit Product"
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => handleDeleteClick(product)}
              className="mobile-action-compact p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
              title="Delete Product"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Category */}
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
          <Layers className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="mobile-truncate">{product.category}</span>
        </div>

        {/* Status and Details Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${stockStatus === 'In Stock' ? 'bg-green-100 text-green-800'
              : stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
              }`}>
              {stockStatus}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Qty</p>
            <p className="text-sm text-gray-900">{product.quantity}</p>
          </div>
        </div>

        {/* Price and MOQ */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Price</p>
            <div className="flex items-center space-x-1 text-sm font-medium text-gray-900">
              <span className="text-gray-600 font-semibold">₹</span>
              <span className="mobile-truncate">
                {product.price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">MOQ</p>
            <p className="text-sm text-gray-900">{product.reorderLevel}</p>
          </div>
        </div>

        {/* Availability */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Availability</p>
          <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="mobile-truncate">{product.availability}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <style>{customStyles}</style>
        <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6">
          <Loader2 className="w-12 h-12 text-[#FF7300] animate-spin mb-4" />
          <p className="text-lg text-gray-600">Loading products...</p>
        </div>
      </>
    );
  }

  if (error && products.length === 0) {
    return (
      <>
        <style>{customStyles}</style>
        <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-lg font-semibold text-red-600 mb-2">Error Loading Products</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => { setError(null); fetchProducts(); }}
            className="px-4 py-2 bg-[#FF7300] text-white rounded-lg text-sm font-medium hover:bg-[#FF8800] transition-colors touch-target"
          >
            Try Again
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-gray-200 pb-3 sm:pb-5 mb-4 sm:mb-8">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 mobile-truncate">
              Products Management
            </h1>
            {user?.role === 'admin' && (
              <ExportButton onExport={handleExport} loading={exportLoading} />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
            {/* Filter Status Indicator */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                  </span>
                </div>
                <button
                  onClick={resetFilters}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-150"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Main Controls Row */}
            <div className="flex flex-col gap-3">
              {/* Search and Filter Toggle Row */}
              <div className="flex gap-2 items-center">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-150 ease-in-out text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
                
                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center p-2 border rounded-md transition-colors duration-150 ease-in-out ${
                    showFilters || activeFilterCount > 0
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="ml-1 text-xs font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Add Product Button - Desktop Position */}
                <button
                  onClick={() => navigate('/dashboard/products/add')}
                  className="hidden sm:inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500 transition-colors duration-150 ease-in-out whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </button>
              </div>

              {/* Add Product Button - Mobile Only */}
              <div className="w-full sm:hidden">
                <button
                  onClick={() => navigate('/dashboard/products/add')}
                  className="inline-flex items-center justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500 transition-colors duration-150 ease-in-out whitespace-nowrap w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </button>
              </div>

              {/* Filters Section - Collapsible */}
              {showFilters && (
                <div className="border-t border-gray-200 pt-3 space-y-3">
                  {/* Filter Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {/* Sort Order */}
                    <div className="relative">
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                      >
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                        <option value="price-asc">Price (Low-High)</option>
                        <option value="price-desc">Price (High-Low)</option>
                        <option value="stock-asc">Stock Status</option>
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                      >
                        <option value="all">All Categories</option>
                        <option value="Solar Water Heaters">Water Heaters</option>
                        <option value="Solar Street Lights">Street Lights</option>
                        <option value="Solar Dryers">Solar Dryers</option>
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>

                    {/* Stock Filter */}
                    <div className="relative">
                      <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="pl-2 pr-6 py-1.5 w-full border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                      >
                        <option value="all">All Stock</option>
                        <option value="in stock">In Stock</option>
                        <option value="low stock">Low Stock</option>
                        <option value="out of stock">Out of Stock</option>
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop/Tablet Table View */}
          <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
            <div className="overflow-x-auto flex-1 relative">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {[
                        { key: 'name', label: 'Product Name', width: 'w-32 lg:w-40' },
                        { key: 'model', label: 'Model Number', width: 'w-24 lg:w-32' },
                        { key: 'status', label: 'Stock Status', width: 'w-24 lg:w-32' },
                        { key: 'quantity', label: 'Quantity', width: 'w-20 lg:w-24' },
                        { key: 'moq', label: 'MOQ', width: 'w-16 lg:w-20', hideOnLg: true },
                        { key: 'price', label: 'Price', width: 'w-24 lg:w-32' },
                        { key: 'availability', label: 'Availability', width: 'w-28', hideOnXl: true },
                        { key: 'actions', label: 'Actions', width: 'w-28 lg:w-36' }
                      ].map((header) => (
                        <th
                          key={header.key}
                          scope="col"
                          className={`px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${header.width} 
                            ${header.hideOnLg ? 'hidden lg:table-cell' : ''} 
                            ${header.hideOnXl ? 'hidden xl:table-cell' : ''}`}
                        >
                          {header.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentProducts.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          No products found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      currentProducts.map((product) => {
                        const stockStatus = getStockStatus(product);
                        return (
                          <tr
                            key={product._id}
                            className="hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                          >
                            <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm font-medium text-gray-900 w-32 lg:w-40">
                              <div 
                                className="truncate cursor-pointer hover:text-[#FF7300] transition-colors duration-150"
                                onClick={() => handleViewProduct(product)}
                                title="Click to view details"
                              >
                                {product.name}
                              </div>
                            </td>
                            <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                              <div className="truncate">{product.modelNumber}</div>
                            </td>
                            <td className="px-2 lg:px-4 xl:px-6 py-4 w-24 lg:w-32">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                ${stockStatus === 'In Stock' ? 'bg-green-100 text-green-800'
                                : stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {stockStatus}
                              </span>
                            </td>
                            <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-20 lg:w-24">
                              <div className="truncate">{product.quantity}</div>
                            </td>
                            <td className="hidden lg:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-16 lg:w-20">
                              <div className="truncate">{product.reorderLevel}</div>
                            </td>
                            <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                              <div className="truncate">₹{product.price.toFixed(2)}</div>
                            </td>
                            <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28">
                              <div className="truncate">{product.availability}</div>
                            </td>
                            <td className="px-2 lg:px-4 xl:px-6 py-4 w-28 lg:w-36">
                              <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                                <button
                                  onClick={() => handleViewProduct(product)}
                                  className="p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150"
                                  title="View Details"
                                >
                                  <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                {product.brochureUrl && (
                                  <button
                                    onClick={() => navigate(`/dashboard/products/${product._id}/brochure`)}
                                    className="p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150"
                                    title="View Brochure"
                                  >
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditProduct(product._id)}
                                  className="p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                                  title="Edit Product"
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(product)}
                                  className="p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex-1 overflow-y-auto">
            <div className="p-2 sm:p-4 space-y-2 sm:space-y-4 w-full">
              {currentProducts.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm sm:text-base">No products found matching your criteria.</p>
                </div>
              ) : (
                currentProducts.map((product) => (
                  <div key={product._id} className="w-full max-w-full">
                    <ProductCard product={product} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="px-2 sm:px-4 lg:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-2 sm:space-y-0">
              <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                Showing {Math.min(startIndex + 1, sortedProducts.length)} to {Math.min(endIndex, sortedProducts.length)} of {sortedProducts.length} results
              </div>
              <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="text-xs sm:text-sm text-gray-600 px-2 sm:px-3 py-2 min-w-[60px] sm:min-w-[80px] text-center"> 
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Details Modal */}
        {showProductModal && selectedProduct && (
          <ProductDetailsModal 
            product={selectedProduct} 
            onClose={closeProductModal} 
          />
        )}

        {/* Delete Modal */}
        {showDeleteDialog && <DeleteModal />}
      </div>
    </>
  );
}