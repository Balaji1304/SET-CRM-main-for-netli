"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getProduct } from '../../../services/productService'

export default function ProductDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await getProduct(id)
        if (response.success) {
          setProduct(response.data)
        } else {
          throw new Error(response.message || 'Failed to fetch product')
        }
      } catch (error) {
        setError(error.message)
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

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>
  }

  if (!product) {
    return <div className="p-6">Product not found</div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard/products')}
          className="p-2 hover:bg-orange-50 rounded-full transition-colors"
          title="Back to Products"
        >
          <ArrowLeft className="h-6 w-6 text-[#FF7300]" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Product Details</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Product Name</h3>
              <p className="mt-1 text-lg">{product.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Model Number</h3>
              <p className="mt-1 text-lg">{product.modelNumber}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-lg whitespace-pre-wrap">{product.description}</p>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Product Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Price</h3>
              <p className="mt-1 text-lg">₹{product.price.toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Category</h3>
              <p className="mt-1 text-lg capitalize">{product.category.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Power</h3>
              <p className="mt-1 text-lg">{product.specifications.power}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Efficiency</h3>
              <p className="mt-1 text-lg">{product.specifications.efficiency}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Warranty</h3>
              <p className="mt-1 text-lg">{product.specifications.warranty}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Dimensions</h3>
              <p className="mt-1 text-lg">{product.specifications.dimensions}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-input">
          <button
            onClick={() => navigate(`/dashboard/products/${id}/edit`)}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            Edit Product
          </button>
        </div>
      </div>
    </div>
  )
}