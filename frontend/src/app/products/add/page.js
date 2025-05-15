"use client"

import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { createProduct } from '../../../services/productService';

export default function AddProductPage() {
  const navigate = useNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    modelNumber: "",
    description: "",
    price: "",
    category: "",
    images: [],
    specifications: {
      power: '',
      efficiency: '',
      warranty: '',
      dimensions: ''
    }
  });

  const [newSpecField, setNewSpecField] = useState({ name: '', value: '' });
  const [isDragging, setIsDragging] = useState(false);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = Object.values(formData).some(value => {
      if (typeof value === 'object') {
        return Object.values(value).some(v => v !== "");
      }
      return value !== "";
    });
    setHasUnsavedChanges(hasChanges);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('spec_')) {
      const specField = name.replace('spec_', '');
      setFormData(prevState => ({
        ...prevState,
        specifications: {
          ...prevState.specifications,
          [specField]: value
        }
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
  };

  const handleAddSpecification = () => {
    if (newSpecField.name && newSpecField.value) {
      setFormData(prevState => ({
        ...prevState,
        specifications: {
          ...prevState.specifications,
          [newSpecField.name]: newSpecField.value
        }
      }));
      setNewSpecField({ name: '', value: '' });
    }
  };

  const handleRemoveSpecification = (fieldName) => {
    setFormData(prevState => {
      const { [fieldName]: removed, ...remainingSpecs } = prevState.specifications;
      return {
        ...prevState,
        specifications: remainingSpecs
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validate required fields
      const requiredFields = ['name', 'modelNumber', 'description', 'price', 'category'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      const specificationFields = ['power', 'efficiency', 'warranty', 'dimensions'];
      const missingSpecs = specificationFields.filter(field => !formData.specifications[field]);

      if (missingFields.length > 0 || missingSpecs.length > 0) {
        const missingFieldNames = [
          ...missingFields.map(f => f.charAt(0).toUpperCase() + f.slice(1)),
          ...missingSpecs.map(f => `Specification ${f.charAt(0).toUpperCase() + f.slice(1)}`)
        ];
        throw new Error(`Please fill in all required fields: ${missingFieldNames.join(', ')}`);
      }

      const response = await createProduct(formData);

      if (response.success) {
        setHasUnsavedChanges(false);
        navigate('/dashboard/products');
      } else {
        throw new Error(response.message || 'Failed to create product');
      }
    } catch (err) {
      console.error('Error creating product:', err);
      alert(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate('/dashboard/products');
    }
  };

  const handleConfirmLeave = () => {
    setShowConfirmDialog(false);
    navigate('/dashboard/products');
  };

  // Add beforeunload event listener
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    // Validate number of files
    if (formData.images.length + files.length > 5) {
      alert('You can only upload up to 5 images');
      return;
    }
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        alert(`File ${file.name} is not a supported image type`);
      }
      if (!isValidSize) {
        alert(`File ${file.name} is too large. Maximum size is 5MB`);
      }
      
      return isValidType && isValidSize;
    });
    
    Promise.all(
      validFiles.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    )
    .then(images => {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...images]
      }));
    });
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    handleFiles(files);
  };

  // Add image removal handler
  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-orange-50 rounded-full transition-colors"
          title="Back to Products"
        >
          <ArrowLeft className="h-6 w-6 text-[#FF7300]" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-5xl mx-auto bg-white rounded-xl shadow-sm p-8">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-foreground">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Product Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Model Number</label>
              <input
                type="text"
                name="modelNumber"
                value={formData.modelNumber}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="10"
                minLength="50"
                maxLength="10000"
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                style={{ minHeight: '200px' }}
                placeholder="Enter a detailed description of the product including specifications, features, and technical details..."
              ></textarea>
              <p className="text-sm text-gray-500 mt-1">
                {formData.description.length}/10000 characters
              </p>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-foreground">Product Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Price</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                <option value="solar_panels">Solar Panels</option>
                <option value="inverters">Inverters</option>
                <option value="batteries">Batteries</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-foreground">Specifications</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(formData.specifications).map(([field, value]) => (
              <div key={field} className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1">{field}</label>
                  <input
                    type="text"
                    name={`spec_${field}`}
                    value={value}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                {!['power', 'efficiency', 'warranty', 'dimensions'].includes(field) && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecification(field)}
                    className="self-end mb-[2px] p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add New Specification */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Add New Specification</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Specification Name"
                value={newSpecField.name}
                onChange={(e) => setNewSpecField(prev => ({ ...prev, name: e.target.value }))}
                className="w-full sm:w-auto sm:flex-1 px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Value"
                value={newSpecField.value}
                onChange={(e) => setNewSpecField(prev => ({ ...prev, value: e.target.value }))}
                className="w-full sm:w-auto sm:flex-1 px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddSpecification}
                className="w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 whitespace-nowrap"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="border rounded-lg p-6 mb-6 bg-white">
          <label className="block text-lg font-medium mb-4 text-gray-900">
            Product Images
            <span className="text-sm text-gray-500 ml-2">Upload up to 5 images</span>
          </label>
          
          <div className="flex items-center justify-center w-full">
            <label 
              className={`flex flex-col items-center justify-center w-full h-32 
                border-2 border-dashed rounded-lg cursor-pointer 
                ${isDragging 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg 
                  className={`w-8 h-8 mb-4 ${isDragging ? 'text-orange-500' : 'text-gray-500'}`}
                  aria-hidden="true" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 20 16"
                >
                  <path 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                  />
                </svg>
                <p className={`mb-2 text-sm ${isDragging ? 'text-orange-500' : 'text-gray-500'}`}>
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className={`text-xs ${isDragging ? 'text-orange-500' : 'text-gray-500'}`}>
                  PNG, JPG or JPEG (MAX. 5MB)
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                max="5"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {formData.images.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {formData.images.length} image{formData.images.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-input">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-input rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmLeave}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave?"
      />
    </div>
  );
}