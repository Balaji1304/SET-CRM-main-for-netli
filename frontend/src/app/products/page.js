import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, Edit, Trash2, Eye } from 'lucide-react'; // Import Lucide icons
import ConfirmDialog from '../../components/ConfirmDialog';
import { getProducts, deleteProduct } from '../../services/productService';

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
  const navigate = useNavigate();

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
    if (productToDelete) {
      try {
        const response = await deleteProduct(productToDelete._id);
        
        if (response.success) {
          // Remove product from state
          setProducts(products.filter(p => p._id !== productToDelete._id));
          setShowDeleteDialog(false);
          setProductToDelete(null);
        } else {
          throw new Error(response.message || 'Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert(error.message);
      }
    }
  };

  // Function to handle product editing
  const handleEditProduct = (productId) => {
    navigate(`/dashboard/products/${productId}/edit`);
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

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products Management</h2>
          <p className="text-muted-foreground mt-1">View and manage all your products in one place</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-input sticky top-0 bg-white z-20">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-input rounded-lg w-full sm:w-[300px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <select
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  defaultValue={categoryFilter}
                  className="pl-4 pr-10 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Categories</option>
                  <option value="solar">Solar Panels</option>
                  <option value="batteries">Batteries</option>
                  <option value="furniture">Furniture</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  onChange={(e) => setStockFilter(e.target.value)}
                  defaultValue={stockFilter}
                  className="pl-4 pr-10 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Stock Status</option>
                  <option value="in stock">In Stock</option>
                  <option value="low stock">Low Stock</option>
                  <option value="out of stock">Out of Stock</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  onChange={(e) => setSortOption(e.target.value)}
                  value={sortOption}
                  className="pl-4 pr-10 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                >
                  <option value="name-asc">Sort by Name (A-Z)</option>
                  <option value="name-desc">Sort by Name (Z-A)</option>
                  <option value="price-asc">Sort by Price (Low-High)</option>
                  <option value="price-desc">Sort by Price (High-Low)</option>
                  <option value="stock-asc">Sort by Stock Status</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full">
            <thead className="bg-orange-500 border-b border-input sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Product Name</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Model Number</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-white tracking-wider">Stock Status</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Quantity</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">MOQ</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Price</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Availability</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                <tr key={product._id} className="hover:bg-orange-50/50 transition-colors">
                  <td className="px-4 py-4 text-sm text-gray-600">{product.name}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 ">{product.modelNumber}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${stockStatus === 'In Stock' ? 'bg-green-100 text-green-800' : 
                        stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {stockStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{product.quantity}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{product.reorderLevel}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">₹{product.price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{product.availability}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {product.brochureUrl && (
                        <button 
                          onClick={() => navigate(`/dashboard/products/${product._id}/brochure`)}
                          className="text-[#FF7300] hover:text-[#FF8800] flex items-center gap-1"
                          title="View Brochure"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleEditProduct(product._id)}
                        className="text-[#FF7300] hover:text-[#FF8800] flex items-center gap-1"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(product)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setProductToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete ${productToDelete?.name}? This action cannot be undone.`}
      />
    </div>
  );
}