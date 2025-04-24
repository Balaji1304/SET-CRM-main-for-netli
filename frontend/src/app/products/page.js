import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, FileText, Edit, Trash2, Upload, Eye } from 'lucide-react'; // Import Lucide icons
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFor, setUploadingFor] = useState(null);
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
    try {
      const response = await fetch('https://set-crm-main-for-netli.onrender.com/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
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
        const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/products/${productToDelete._id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete product');
        }

        // Remove product from state
        setProducts(products.filter(p => p._id !== productToDelete._id));
        setShowDeleteDialog(false);
        setProductToDelete(null);
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

  const handleFileChange = (e, productId) => {
    setSelectedFile(e.target.files[0]);
    setUploadingFor(productId);
  };

  const handleUploadBrochure = async (productId) => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('brochure', selectedFile);

    try {
      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/products/${productId}/brochure`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload brochure');
      }

      // Refresh products list after successful upload
      await fetchProducts();
      setSelectedFile(null);
      setUploadingFor(null);
      alert('Brochure uploaded successfully');
    } catch (err) {
      console.error('Error uploading brochure:', err);
      alert('Failed to upload brochure');
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === "all" || product.category === categoryFilter) &&
    (stockFilter === "all" || product.stockStatus.toLowerCase() === stockFilter.toLowerCase())
  );

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products Management</h2>
          <p className="text-muted-foreground mt-1">View and manage all your products in one place</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/products/add')} 
          className="flex items-center gap-2 bg-[#FF7300] hover:bg-[#FF8800] text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
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
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full">
            <thead className="bg-orange-500 border-b border-input sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Product Name</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Model Number</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Stock Status</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Price</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Availability</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Brochure</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product._id} className="hover:bg-orange-50/50 transition-colors">
                  <td className="px-4 py-4 text-sm text-gray-600">{product.name}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 ">{product.modelNumber}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${product.stockStatus === 'In Stock' ? 'bg-green-100 text-green-800' : 
                        product.stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {product.stockStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">${product.price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{product.availability}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, product._id)}
                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                                   file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 
                                   hover:file:bg-orange-100 flex-1"
                      />
                      {uploadingFor === product._id && selectedFile && (
                        <button
                          onClick={() => handleUploadBrochure(product._id)}
                          className="bg-[#FF7300] text-white rounded-full p-2 hover:bg-[#FF8800] flex items-center gap-1"
                          title="Upload Brochure"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
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
              ))}
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