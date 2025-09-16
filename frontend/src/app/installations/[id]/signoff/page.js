import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, CheckCircle, Clock, FileText, Camera } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { getInstallationForSignoff, submitCustomerSignoff } from '../../../../services/installationService';
import { toast } from 'react-toastify';

// Custom styles for mobile responsive design
const customStyles = `
  .mobile-action-compact {
    padding: 6px !important;
    margin: 0 1px !important;
  }
  
  .mobile-action-buttons {
    gap: 2px !important;
  }
  
  .mobile-card-compact {
    padding: 12px;
    margin-bottom: 8px;
  }
  
  .mobile-card-container {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .mobile-header-text {
    font-size: 16px !important;
    line-height: 1.4 !important;
  }
  
  .mobile-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  
  /* Extra small screen optimizations */
  @media (max-width: 375px) {
    .mobile-card-compact {
      padding: 8px;
    }
    
    .mobile-header-text {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
    
    .mobile-action-buttons {
      gap: 1px !important;
    }
  }
  
  /* Photo grid responsive behavior */
  @media (min-width: 360px) {
    .xs\\:grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  
  /* Touch target improvements for mobile */
  @media (max-width: 768px) {
    .touch-target {
      min-height: 44px;
      min-width: 44px;
    }
  }
`;

const CustomerSignoff = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state: prefilled } = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [installation, setInstallation] = useState(null);
  const [signoffData, setSignoffData] = useState({
    approved: null,
    customerFeedback: '',
    overallRating: 0,
    serviceQualityRating: 0,
    timelinessRating: 0,
    professionalismRating: 0
  });
  const [hoveredRating, setHoveredRating] = useState({});

  useEffect(() => {
    if (user?.role === 'service_engineer') {
      fetchInstallationDetails();
    }
  }, [user, id]);

  const fetchInstallationDetails = async () => {
    try {
      setLoading(true);
      const response = await getInstallationForSignoff(id);
      setInstallation(response.data);
    } catch (error) {
      console.error('Error fetching installation:', error);
      if (prefilled) {
        setInstallation(prefilled);
      } else {
        toast.error('Failed to fetch installation details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (category, rating) => {
    setSignoffData(prev => ({
      ...prev,
      [category]: rating
    }));
  };

  const handleSubmitSignoff = async (approved) => {
    if (approved && (
      signoffData.overallRating === 0 || 
      signoffData.serviceQualityRating === 0 || 
      signoffData.timelinessRating === 0 || 
      signoffData.professionalismRating === 0
    )) {
      toast.error('Please provide ratings for all categories');
      return;
    }

    try {
      setSubmitting(true);
      await submitCustomerSignoff(id, {
        ...signoffData,
        approved
      });
      
      if (approved) {
        toast.success('Installation approved successfully! Thank you for your feedback.');
      } else {
        toast.success('Your concerns have been reported. Our team will follow up with you.');
      }
      
      navigate('/dashboard/installations');
    } catch (error) {
      const msg = error?.message || (error?.response?.data?.message) || 'Failed to submit sign-off';
      toast.error(msg);
      console.error('Error submitting sign-off:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ category, value, onChange, label, description }) => {
    const stars = [1, 2, 3, 4, 5];
    
    return (
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3">
          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-medium text-gray-900">{label}</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            {stars.map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(category, star)}
                onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [category]: star }))}
                onMouseLeave={() => setHoveredRating(prev => ({ ...prev, [category]: 0 }))}
                className="focus:outline-none transition-all duration-200 transform hover:scale-110 touch-target"
              >
                <svg
                  className={`w-6 h-6 sm:w-8 sm:h-8 ${
                    star <= (hoveredRating[category] || value)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  } transition-colors duration-200`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div className="text-right sm:text-left sm:mt-1">
          <span className="text-xs sm:text-sm text-gray-600">
            {value > 0 && (
              <>
                {value}/5 - {
                  value === 1 ? 'Poor' :
                  value === 2 ? 'Fair' :
                  value === 3 ? 'Good' :
                  value === 4 ? 'Very Good' :
                  'Excellent'
                }
              </>
            )}
          </span>
        </div>
      </div>
    );
  };

  if (user?.role !== 'service_engineer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to service engineers.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading installation details...</span>
      </div>
    );
  }

  if (!installation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Installation Not Found</h2>
          <p className="text-gray-600">The requested installation could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header Section - Page Title */}
        <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary">Customer Sign-off</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500 hidden sm:block">
                Order #{installation?.purchaseID || id} - Review and approve installation
              </p>
              <p className="mt-1 text-sm text-gray-500 sm:hidden">
                Order #{installation?.purchaseID || id} - Review
              </p>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => navigate('/dashboard/installations')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150 text-gray-500 hover:text-gray-700 touch-target"
              aria-label="Close and return to dashboard"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Installation Complete!</h2>
            <p className="text-sm sm:text-lg text-gray-600">Order #{installation?.purchaseID || id} has been completed.</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Please review the work and provide your feedback below.
            </p>
          </div>
        </div>

        {/* Installation Details */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Installation Summary
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Installation Details
                </h3>
                <div className="bg-white rounded-lg p-4 sm:p-5 border border-gray-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-sm font-medium text-gray-500">Service Engineer:</span>
                    <span className="text-sm text-gray-900">{installation?.engineer?.name || '—'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-sm font-medium text-gray-500">Installation Date:</span>
                    <span className="text-sm text-gray-900">
                      {installation?.installationDate ? new Date(installation.installationDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-sm font-medium text-gray-500">Duration:</span>
                    <span className="text-sm text-gray-900">
                      {installation?.startTime && installation?.endTime ? (
                        `${new Date(installation.startTime).toLocaleTimeString()} - ${new Date(installation.endTime).toLocaleTimeString()}`
                      ) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Products Installed</h4>
                <div className="bg-white rounded-lg p-4 sm:p-5 border border-gray-200 space-y-2">
                  {Array.isArray(installation?.products) && installation.products.length > 0 ? (
                    installation.products.map((product, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-900">
                          <span className="font-medium">{product?.quantity || 1}x</span> {product?.name || 'Product'}
                        </span>
                        {product?.modelNumber && (
                          <span className="text-gray-500">({product.modelNumber})</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No products listed</span>
                  )}
                </div>
              </div>

              {/* Service Notes */}
              {installation?.serviceNotes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Service Notes</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-800 leading-relaxed">
                    {installation.serviceNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Photos Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Installation Photos
              </h3>
              {Array.isArray(installation?.completionPhotos) && installation.completionPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {installation.completionPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square w-full overflow-hidden rounded-lg border border-gray-200 group-hover:border-gray-300 transition-colors duration-150">
                        <img
                          src={(photo && photo.url) ? photo.url : photo}
                          alt={`Installation photo ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => window.open(((photo && photo.url) ? photo.url : photo), '_blank')}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">Photo {index + 1}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 sm:p-8 bg-gray-50 rounded-lg border border-gray-200">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No photos available</p>
                  <p className="text-xs text-gray-400 mt-1">Installation photos will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Your Feedback Matters</h2>
          
          {/* Rating Categories */}
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
            <StarRating
              category="overallRating"
              value={signoffData.overallRating}
              onChange={handleRatingChange}
              label="Overall Experience"
              description="How satisfied are you with the overall service?"
            />
            
            <StarRating
              category="serviceQualityRating"
              value={signoffData.serviceQualityRating}
              onChange={handleRatingChange}
              label="Service Quality"
              description="How would you rate the quality of installation work?"
            />
            
            <StarRating
              category="timelinessRating"
              value={signoffData.timelinessRating}
              onChange={handleRatingChange}
              label="Timeliness"
              description="Was the service completed on time as scheduled?"
            />
            
            <StarRating
              category="professionalismRating"
              value={signoffData.professionalismRating}
              onChange={handleRatingChange}
              label="Professionalism"
              description="How professional was our service engineer?"
            />
          </div>

          {/* Written Feedback */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={signoffData.customerFeedback}
              onChange={(e) => setSignoffData(prev => ({ ...prev, customerFeedback: e.target.value }))}
              rows="4"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 text-sm sm:text-base resize-none"
              placeholder="Share any additional feedback, suggestions, or concerns..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => handleSubmitSignoff(false)}
              disabled={submitting}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors duration-150 touch-target"
            >
              {submitting ? 'Submitting...' : 'Report Issues'}
            </button>
            <button
              onClick={() => handleSubmitSignoff(true)}
              disabled={submitting || signoffData.overallRating === 0}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors duration-150 flex items-center justify-center shadow-lg hover:shadow-xl touch-target"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve Installation
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p className="leading-relaxed">
              By approving this installation, you confirm that the work has been completed to your satisfaction.
              If you have any issues, please select "Report Issues" and our team will follow up with you.
            </p>
          </div>
        </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerSignoff;
