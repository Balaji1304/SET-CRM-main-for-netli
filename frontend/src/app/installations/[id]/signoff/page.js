import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { getInstallationForSignoff, submitCustomerSignoff } from '../../../../services/installationService';
import { toast } from 'react-toastify';

const CustomerSignoff = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    if (user?.role === 'customer') {
      fetchInstallationDetails();
    }
  }, [user, id]);

  const fetchInstallationDetails = async () => {
    try {
      setLoading(true);
      const response = await getInstallationForSignoff(id);
      setInstallation(response.data);
    } catch (error) {
      toast.error('Failed to fetch installation details');
      console.error('Error fetching installation:', error);
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
      
      navigate('/orders');
    } catch (error) {
      toast.error('Failed to submit sign-off');
      console.error('Error submitting sign-off:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ category, value, onChange, label, description }) => {
    const stars = [1, 2, 3, 4, 5];
    
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-medium text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className="flex items-center space-x-1">
            {stars.map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(category, star)}
                onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [category]: star }))}
                onMouseLeave={() => setHoveredRating(prev => ({ ...prev, [category]: 0 }))}
                className="focus:outline-none transition-all duration-200 transform hover:scale-110"
              >
                <svg
                  className={`w-8 h-8 ${
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
        <div className="text-right">
          <span className="text-sm text-gray-600">
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

  if (user?.role !== 'customer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to customers.</p>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Installation Complete!</h1>
            <p className="text-lg text-gray-600">
              Your installation for Order #{installation.purchaseID} has been completed.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Please review the work and provide your feedback below.
            </p>
          </div>
        </div>

        {/* Installation Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Installation Summary</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Service Engineer</h3>
              <p className="text-sm text-gray-900 mb-4">{installation.engineer.name}</p>
              
              <h3 className="text-sm font-medium text-gray-700 mb-2">Installation Date</h3>
              <p className="text-sm text-gray-900 mb-4">
                {new Date(installation.installationDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              
              <h3 className="text-sm font-medium text-gray-700 mb-2">Duration</h3>
              <p className="text-sm text-gray-900">
                {installation.startTime && installation.endTime ? (
                  `${new Date(installation.startTime).toLocaleTimeString()} - ${new Date(installation.endTime).toLocaleTimeString()}`
                ) : 'N/A'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Products Installed</h3>
              <div className="space-y-1 mb-4">
                {installation.products?.map((product, index) => (
                  <div key={index} className="text-sm text-gray-900">
                    <span className="font-medium">{product.quantity}x</span> {product.name}
                    {product.modelNumber && (
                      <span className="text-gray-500"> ({product.modelNumber})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Completion Photos */}
          {installation.completionPhotos && installation.completionPhotos.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Installation Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {installation.completionPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.url || photo}
                      alt={`Installation photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => window.open(photo.url || photo, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Notes */}
          {installation.serviceNotes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Service Notes</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">{installation.serviceNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Feedback Matters</h2>
          
          {/* Rating Categories */}
          <div className="space-y-4 mb-8">
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
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={signoffData.customerFeedback}
              onChange={(e) => setSignoffData(prev => ({ ...prev, customerFeedback: e.target.value }))}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share any additional feedback, suggestions, or concerns..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleSubmitSignoff(false)}
              disabled={submitting}
              className="px-8 py-3 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Report Issues'}
            </button>
            <button
              onClick={() => handleSubmitSignoff(true)}
              disabled={submitting || signoffData.overallRating === 0}
              className="px-8 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve Installation
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              By approving this installation, you confirm that the work has been completed to your satisfaction.
              If you have any issues, please select "Report Issues" and our team will follow up with you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSignoff;
