"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from 'react-router-dom'

export default function ProductDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulated API call to fetch product details
    // Replace with actual API call
    const fetchProduct = async () => {
      try {
        // Simulated product data
        const mockProduct = {
          id: parseInt(id),
          name: "Sample Product",
          modelNumber: "SP001",
          specifications: "Sample specifications",
          price: 299.99,
          stockLevels: 100,
          warrantyPeriod: "2 years",
          leadTime: "7 days",
        }
        setProduct(mockProduct)
      } catch (error) {
        console.error("Error fetching product:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  if (!product) {
    return <div className="p-6">Product not found</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#FF7300]">Product Details</h1>
        <button
          onClick={() => navigate('/dashboard/products')}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Back to Products
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Product Name</h3>
            <p className="mt-1 text-lg">{product.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Model Number</h3>
            <p className="mt-1 text-lg">{product.modelNumber}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Price</h3>
            <p className="mt-1 text-lg">${product.price.toFixed(2)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Stock Levels</h3>
            <p className="mt-1 text-lg">{product.stockLevels}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">Specifications</h3>
          <p className="mt-1 text-lg whitespace-pre-wrap">{product.specifications}</p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate(`/dashboard/products/edit/${id}`)}
            className="bg-[#FF7300] hover:bg-[#FF8800] text-white px-4 py-2 rounded"
          >
            Edit Product
          </button>
        </div>
      </div>
    </div>
  )
}