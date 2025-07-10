"use client"

import { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { ArrowLeft, Trash2, Upload, X, AlertTriangle, Loader2 } from 'lucide-react';
import { getProduct, updateProduct } from '../../../../services/productService';

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

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    modelNumber: "",
    description: "",
    price: "",
    category: "",
    quantity: "",
    reorderLevel: "",
    images: [],
    specifications: {
      power: "",
      efficiency: "",
      warranty: "",
      dimensions: ""
    },
    brochureUrl: "",
    termsAndConditions: ""
  });

  const [brochureFile, setBrochureFile] = useState(null);
  const [newSpecField, setNewSpecField] = useState({ name: '', value: '' });
  const [isDragging, setIsDragging] = useState(false);

  // Fetch product data when component mounts
  useEffect(() => {
    fetchProduct();
  }, [id]);

  // Check for unsaved changes
  useEffect(() => {
    if (initialFormData) {
      const hasChanges = JSON.stringify(initialFormData) !== JSON.stringify(formData) || brochureFile;
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, initialFormData, brochureFile]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProduct(id);
      if (response.success) {
        const data = response.data;
        const productData = {
          name: data.name,
          modelNumber: data.modelNumber,
          description: data.description,
          price: data.price,
          category: data.category,
          quantity: data.quantity,
          reorderLevel: data.reorderLevel,
          images: data.imageUrls || [],
          specifications: data.specifications,
          brochureUrl: data.brochureUrl,
          termsAndConditions: data.termsAndConditions || ""
        };
        setFormData(productData);
        setInitialFormData(JSON.parse(JSON.stringify(productData)));
      } else {
        throw new Error(response.message || 'Failed to fetch product');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    setSubmissionError(null);
    
    try {
      const productData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'specifications') {
          productData.append(key, JSON.stringify(formData[key]));
        } else if (key === 'images') {
          formData.images.forEach((image, index) => {
            productData.append(`images[${index}]`, image);
          });
        } else if (key === 'brochureUrl') {
          productData.append(key, formData[key]);
        } else {
          productData.append(key, formData[key]);
        }
      });
      
      if (brochureFile) {
        productData.append('brochure', brochureFile);
      }
      
      const response = await updateProduct(id, productData);

      if (response.success) {
        setHasUnsavedChanges(false);
        navigate('/dashboard/products');
      } else {
        throw new Error(response.message || 'Failed to update product');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setSubmissionError(err.message || 'Failed to update product');
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

  // Image handling functions
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
      setSubmissionError('You can only upload up to 5 images');
      return;
    }
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        setSubmissionError(`File ${file.name} is not a supported image type`);
      }
      if (!isValidSize) {
        setSubmissionError(`File ${file.name} is too large. Maximum size is 5MB`);
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
    .then(newImages => {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    });
  };
  
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    handleFiles(files);
  };
  
  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleBrochureChange = (e) => {
    setBrochureFile(e.target.files[0]);
  };

  const renderSectionHeader = (title) => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">{title}</h2>
    </div>
  );

  const renderInputField = (name, label, type = 'text', placeholder = '', required = false, rows = null) => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {rows ? (
        <textarea
          id={name}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 placeholder-gray-400 touch-target resize-vertical"
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 placeholder-gray-400 touch-target"
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <>
        <style>{customStyles}</style>
        <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6">
          <Loader2 className="w-12 h-12 text-[#FF7300] animate-spin mb-4" />
          <p className="text-lg text-gray-600">Loading product data...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{customStyles}</style>
        <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-lg font-semibold text-red-600 mb-2">Error Loading Product</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => { setError(null); fetchProduct(); }}
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
            <button
              onClick={handleCancel}
              className="p-2 sm:p-2 rounded-md hover:bg-gray-100 text-gray-600 touch-target"
              aria-label="Back to products"
            >
              <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Edit Product
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1">
            {submissionError && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base">{submissionError}</span>
              </div>
            )}

            {/* Basic Information */}
            <section>
              {renderSectionHeader('Basic Information')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {renderInputField('name', 'Product Name', 'text', 'Enter product name', true)}
                {renderInputField('modelNumber', 'Model Number', 'text', 'Enter model number', true)}
              </div>
              <div className="mt-4 sm:mt-6">
                {renderInputField('description', 'Description', 'text', 'Enter a detailed description of the product including specifications, features, and technical details...', true, 10)}
                <p className="text-sm text-gray-500 mt-1">
                  {formData.description.length}/10000 characters
                </p>
              </div>
            </section>

            {/* Product Details */}
            <section>
              {renderSectionHeader('Product Details')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {renderInputField('price', 'Price (₹)', 'number', '0.00', true)}
                {renderInputField('category', 'Category', 'text', 'e.g., Solar Panel, Inverter', true)}
                {renderInputField('quantity', 'Quantity', 'number', 'e.g., 100', true)}
                {renderInputField('reorderLevel', 'Re-order Level', 'number', 'e.g., 10', true)}
              </div>
            </section>

            {/* Brochure Upload Section */}
            <section>
              {renderSectionHeader('Product Brochure (PDF)')}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
                {formData.brochureUrl && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Current brochure: <a href={formData.brochureUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{formData.brochureUrl.split('/').pop()}</a>
                    </p>
                  </div>
                )}
                <div className="flex items-center">
                  <input
                    type="file"
                    name="brochure"
                    accept=".pdf"
                    onChange={handleBrochureChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-[#FF7300] hover:file:bg-orange-100 touch-target"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Upload a new file to replace the existing one.</p>
                {brochureFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    New file selected: {brochureFile.name}
                  </p>
                )}
              </div>
            </section>

            {/* Specifications */}
            <section>
              {renderSectionHeader('Specifications')}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {Object.entries(formData.specifications).map(([field, value]) => (
                    <div key={field} className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.charAt(0).toUpperCase() + field.slice(1)} {['power', 'efficiency', 'warranty', 'dimensions'].includes(field) && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          name={`spec_${field}`}
                          value={value}
                          onChange={handleChange}
                          required={['power', 'efficiency', 'warranty', 'dimensions'].includes(field)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm text-gray-900 touch-target"
                        />
                      </div>
                      {!['power', 'efficiency', 'warranty', 'dimensions'].includes(field) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecification(field)}
                          className="self-end mb-[2px] p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors touch-target"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Specification */}
                <div className="border-t border-gray-200 pt-4 mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Add New Specification</h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      placeholder="Specification Name"
                      value={newSpecField.name}
                      onChange={(e) => setNewSpecField(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full sm:w-auto sm:flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm touch-target"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={newSpecField.value}
                      onChange={(e) => setNewSpecField(prev => ({ ...prev, value: e.target.value }))}
                      className="w-full sm:w-auto sm:flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm touch-target"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpecification}
                      className="w-full sm:w-auto px-4 py-3 bg-[#FF7300] text-white rounded-lg hover:bg-[#FF8800] transition-colors font-medium text-sm touch-target"
                    >
                      Add Field
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Terms and Conditions */}
            <section>
              {renderSectionHeader('Terms and Conditions')}
              <div>
                {renderInputField('termsAndConditions', 'Terms and Conditions', 'text', 'Enter terms and conditions for this product...', false, 6)}
                <p className="text-sm text-gray-500 mt-1">
                  {formData.termsAndConditions.length}/5000 characters
                </p>
              </div>
            </section>

            {/* Image Upload */}
            <section>
              {renderSectionHeader('Product Images')}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-center w-full">
                  <label 
                    className={`flex flex-col items-center justify-center w-full h-32 
                      border-2 border-dashed rounded-lg cursor-pointer transition-colors
                      ${isDragging 
                        ? 'border-[#FF7300] bg-orange-50' 
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className={`w-8 h-8 mb-4 ${isDragging ? 'text-[#FF7300]' : 'text-gray-400'}`} />
                      <p className={`mb-2 text-sm ${isDragging ? 'text-[#FF7300]' : 'text-gray-500'}`}>
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className={`text-xs ${isDragging ? 'text-[#FF7300]' : 'text-gray-500'}`}>
                        PNG, JPG or JPEG (MAX. 5MB) • Up to 5 images
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                          >
                            <X className="w-4 h-4" />
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
            </section>
          </form>

          {/* Footer Actions */}
          <div className="bg-white border-t border-gray-200 p-4 sm:p-6 sticky bottom-0 left-0 right-0 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-target"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="w-full sm:w-auto px-6 py-3 bg-[#FF7300] text-white rounded-lg text-sm font-medium hover:bg-[#FF8800] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px] touch-target"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>

        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handleConfirmLeave}
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to leave?"
        />
      </div>
    </>
  );
} 