"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productData, setProductData] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/products/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }
        const data = await response.json();
        setProductData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      setEditMode(false);
      // Optionally refresh the data
      const updatedData = await response.json();
      setProductData(updatedData);
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Failed to update product');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!productData) return <div>No product found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#FF7300]">Product Details</h1>
        <Button onClick={() => setEditMode(!editMode)} className="bg-[#FF7300] hover:bg-[#FF8800] text-white">
          {editMode ? "Cancel" : "Edit Product"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <div className="border-b pb-2">
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                name="name"
                value={productData.name}
                onChange={handleInputChange}
                readOnly={!editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelNumber">Model Number</Label>
              <Input
                id="modelNumber"
                name="modelNumber"
                value={productData.modelNumber}
                onChange={handleInputChange}
                readOnly={!editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea
                id="specifications"
                name="specifications"
                value={productData.specifications}
                onChange={handleInputChange}
                readOnly={!editMode}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="border-b pb-2">
            <h2 className="text-lg font-semibold">Pricing and Stock</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={productData.price}
                onChange={handleInputChange}
                readOnly={!editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thresholdRate">Threshold Rate</Label>
              <Input
                id="thresholdRate"
                name="thresholdRate"
                type="number"
                value={productData.thresholdRate}
                onChange={handleInputChange}
                readOnly={!editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockLevels">Stock Levels</Label>
              <Input
                id="stockLevels"
                name="stockLevels"
                type="number"
                value={productData.stockLevels}
                onChange={handleInputChange}
                readOnly={!editMode}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="border-b pb-2">
            <h2 className="text-lg font-semibold">Additional Information</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warrantyPeriod">Warranty Period</Label>
              <Input
                id="warrantyPeriod"
                name="warrantyPeriod"
                value={productData.warrantyPeriod}
                onChange={handleInputChange}
                readOnly={!editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTime">Lead Time (days)</Label>
              <Input
                id="leadTime"
                name="leadTime"
                type="number"
                value={productData.leadTime}
                onChange={handleInputChange}
                readOnly={!editMode}
              />
            </div>
          </div>
        </div>
      </div>

      {editMode && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-[#FF7300] hover:bg-[#FF8800] text-white">
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}

