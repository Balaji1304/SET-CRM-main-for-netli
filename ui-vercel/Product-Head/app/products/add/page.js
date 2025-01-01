"use client"

import { useState } from "react"
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload } from 'lucide-react'

export default function AddProductPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState({
    name: "",
    modelNumber: "",
    specifications: "",
    price: "",
    stockLevels: "",
    warrantyPeriod: "",
    leadTime: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://set-crm-main-for-netli.onrender.com/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error('Failed to add product');
      }

      navigate('/products');
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-[#FF7300]">Add New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            name="name"
            value={productData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="modelNumber">Model Number</Label>
          <Input
            id="modelNumber"
            name="modelNumber"
            value={productData.modelNumber}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="specifications">Specifications</Label>
          <Textarea
            id="specifications"
            name="specifications"
            value={productData.specifications}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            name="price"
            type="number"
            value={productData.price}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="stockLevels">Stock Levels</Label>
          <Input
            id="stockLevels"
            name="stockLevels"
            type="number"
            value={productData.stockLevels}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="warrantyPeriod">Warranty Period</Label>
          <Input
            id="warrantyPeriod"
            name="warrantyPeriod"
            value={productData.warrantyPeriod}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="leadTime">Lead Time (days)</Label>
          <Input
            id="leadTime"
            name="leadTime"
            type="number"
            value={productData.leadTime}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="bg-[#FF7300] hover:bg-[#FF8800] text-white" disabled={loading}>
            {loading ? 'Adding...' : 'Add Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}

