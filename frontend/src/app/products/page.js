import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, AlertTriangle, Loader2, X, Package, Layers, TrendingUp, Calendar, Info, ShoppingCart, Tag, Zap, Users, Building2, FileText } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getProducts, deleteProduct } from '../../services/productService';

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
  const navigate = useNavigate();

  const itemsPerPage = 10;

  // Fetch products when component mounts
  useEffect(() => {
    fetchProducts();
  }, []);

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
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#FF7300] to-[#FF8800] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Product Details</h2>
                <p className="text-orange-100 text-sm">Complete product information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-150 touch-target"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Product Name and Model */}
              <div className="border-b border-gray-100 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
                    <div className="flex items-center space-x-4 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4" />
                        <span className="text-sm font-medium">Model: {product.modelNumber}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4" />
                        <span className="text-sm">{product.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Price Information */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Price</h4>
                      <p className="text-sm text-gray-600">Current selling price</p>
                    </div>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-bold text-gray-900">₹</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Stock Information */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Stock Quantity</h4>
                      <p className="text-sm text-gray-600">Available units</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{product.quantity}</span>
                    <span className="text-sm text-gray-600">units</span>
                  </div>
                </div>

                {/* MOQ Information */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-purple-500 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">MOQ</h4>
                      <p className="text-sm text-gray-600">Minimum order quantity</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{product.reorderLevel}</span>
                    <span className="text-sm text-gray-600">units</span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Specifications */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Info className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Specifications</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Category</span>
                      <span className="text-sm text-gray-900">{product.category}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Model Number</span>
                      <span className="text-sm text-gray-900 font-mono">{product.modelNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Reorder Level</span>
                      <span className="text-sm text-gray-900">{product.reorderLevel} units</span>
                    </div>
                    {product.description && (
                      <div className="py-2">
                        <span className="text-sm font-medium text-gray-600 block mb-1">Description</span>
                        <p className="text-sm text-gray-900">{product.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability & Status */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Availability & Status</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Availability</span>
                      <span className="text-sm text-gray-900">{product.availability}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Stock Status</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full
                        ${stockStatus === 'In Stock' ? 'bg-green-100 text-green-800'
                        : stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {stockStatus}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Current Stock</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900">{product.quantity} units</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
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
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Last Updated</span>
                        <span className="text-sm text-gray-900">
                          {new Date(product.updatedAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  {product.brochureUrl && (
                    <button
                      onClick={() => navigate(`/dashboard/products/${product._id}/brochure`)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-150 touch-target"
                    >
                      <FileText className="w-4 h-4" />
                      View Brochure
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      handleEditProduct(product._id);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF7300] text-white rounded-lg font-medium hover:bg-[#FF8800] transition-colors duration-150 touch-target"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mobile Card Component
  const ProductCard = ({ product }) => {
    const stockStatus = getStockStatus(product);
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 cursor-pointer hover:text-[#FF7300] transition-colors duration-150"
                onClick={() => handleViewProduct(product)}>
              {product.name}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Package className="w-4 h-4" />
                <span>{product.modelNumber}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-3">
            <button
              onClick={() => handleViewProduct(product)}
              className="p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150 touch-target"
              title="View Details"
            >
              <Info className="w-4 h-4" />
            </button>
            {product.brochureUrl && (
              <button
                onClick={() => navigate(`/dashboard/products/${product._id}/brochure`)}
                className="p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150 touch-target"
                title="View Brochure"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleEditProduct(product._id)}
              className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150 touch-target"
              title="Edit Product"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteClick(product)}
              className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 touch-target"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stock Status and Category */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Layers className="w-4 h-4" />
            <span className="truncate">{product.category}</span>
          </div>
        </div>

        {/* Status and Details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Stock Status</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
              ${stockStatus === 'In Stock' ? 'bg-green-100 text-green-800'
              : stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
              }`}>
              {stockStatus}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Quantity</p>
            <p className="text-sm text-gray-900">{product.quantity}</p>
          </div>
        </div>

        {/* Price and MOQ */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Price</p>
            <div className="flex items-center space-x-1 text-sm font-medium text-gray-900">
              <span className="text-gray-600 font-semibold">₹</span>
              <span>{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>{product.availability}</span>
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
        <div className="border-b border-gray-200 pb-4 sm:pb-5 mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Products Management
            </h1>
          </div>
          <button
            onClick={() => navigate('/dashboard/products/add')}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#FF7300] text-white rounded-lg text-sm font-medium hover:bg-[#FF8800] transition-colors duration-150 ease-in-out flex items-center justify-center gap-2 touch-target"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-20">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full sm:w-[300px] focus:ring-2 focus:ring-orange-500 focus:border-transparent touch-target"
                />
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <select
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    value={categoryFilter}
                    className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none touch-target"
                  >
                    <option value="all">All Categories</option>
                    <option value="Solar Water Heaters">Solar Water Heaters</option>
                    <option value="Solar Street Lights">Solar Street Lights</option>
                    <option value="Solar Dryers">Solar Dryers</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    onChange={(e) => setStockFilter(e.target.value)}
                    value={stockFilter}
                    className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none touch-target"
                  >
                    <option value="all">All Stock Status</option>
                    <option value="in stock">In Stock</option>
                    <option value="low stock">Low Stock</option>
                    <option value="out of stock">Out of Stock</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    onChange={(e) => setSortOption(e.target.value)}
                    value={sortOption}
                    className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none touch-target"
                  >
                    <option value="name-asc">Sort by Name (A-Z)</option>
                    <option value="name-desc">Sort by Name (Z-A)</option>
                    <option value="price-asc">Sort by Price (Low-High)</option>
                    <option value="price-desc">Sort by Price (High-Low)</option>
                    <option value="stock-asc">Sort by Stock Status</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop/Tablet Table View */}
          <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
            <div className="overflow-x-auto flex-1 relative">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#FF7300] sticky top-0 z-10">
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
                          className={`px-2 lg:px-4 xl:px-6 py-4 text-left text-sm font-medium text-white tracking-wider ${header.width} 
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
                            className="hover:bg-orange-50/50 transition-colors duration-150 ease-in-out"
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
                                  className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-orange-200"
                                  title="View Details"
                                >
                                  <Info className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                </button>
                                {product.brochureUrl && (
                                  <button
                                    onClick={() => navigate(`/dashboard/products/${product._id}/brochure`)}
                                    className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-orange-200"
                                    title="View Brochure"
                                  >
                                    <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditProduct(product._id)}
                                  className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                                  title="Edit Product"
                                >
                                  <Edit className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(product)}
                                  className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-red-200"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
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
            <div className="p-4 space-y-4">
              {currentProducts.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No products found matching your criteria.</p>
                </div>
              ) : (
                currentProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-600 order-2 sm:order-1">
                Showing {Math.min(startIndex + 1, sortedProducts.length)} to {Math.min(endIndex, sortedProducts.length)} of {sortedProducts.length} results
              </div>
              <div className="flex items-center space-x-2 order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 px-2"> 
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
                >
                  <ChevronRight className="w-4 h-4" />
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
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ease-out">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Confirm Delete</h3>
                <button 
                  onClick={() => { 
                    setShowDeleteDialog(false); 
                    setProductToDelete(null);
                    setError(null);
                  }} 
                  className="p-1 rounded-full hover:bg-gray-100 touch-target"
                >
                  <X className="w-5 h-5 text-gray-500"/>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
              </p>
              {error && <p className="text-sm text-red-600 mb-3 text-center">{error}</p>}
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => { 
                    setShowDeleteDialog(false); 
                    setProductToDelete(null);
                    setError(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 touch-target"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] touch-target`}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}