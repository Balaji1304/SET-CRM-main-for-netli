import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ProductBrochurePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      const data = await response.json();
      setProduct(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('brochure', file);

    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}/brochure`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload brochure');
      
      await fetchProduct(); // Refresh product data
      alert('Brochure uploaded successfully');
    } catch (err) {
      console.error('Error uploading brochure:', err);
      alert('Failed to upload brochure');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!product) return <div className="p-6">Product not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#FF7300]">
          {product.name} - Brochure
        </h1>
        <button
          onClick={() => navigate('/dashboard/products')}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          Back to Products
        </button>
      </div>

      {product.brochureUrl ? (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Current Brochure</h2>
            <iframe
              src={product.brochureUrl}
              className="w-full h-[600px] border-0"
              title="Product Brochure"
            />
          </div>
        </div>
      ) : (
        <div className="text-gray-500">No brochure available</div>
      )}

      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="text-xl font-semibold">Upload New Brochure</h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="border border-gray-300 rounded p-2"
          />
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-[#FF7300] text-white rounded-md hover:bg-[#FF8800]"
          >
            Upload Brochure
          </button>
        </div>
      </div>
    </div>
  );
} 