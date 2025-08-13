import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { completeInstallation, reportIssue } from '../../../../services/installationService';
import { toast } from 'react-toastify';

const InstallationComplete = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [notes, setNotes] = useState('');
  const [issuesEncountered, setIssuesEncountered] = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);

  const handlePhotoUpload = (e) => {
    console.log('Photo upload triggered', e.target.files);
    
    if (!e.target.files || e.target.files.length === 0) {
      console.log('No files selected');
      return;
    }

    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 5 * 1024 * 1024; // 5MB

    console.log('Files selected:', files.length);

    if (files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} photos allowed`);
      return;
    }

    const validFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log('Checking file:', file.name, file.type, file.size);
      
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        continue;
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum 5MB allowed`);
        continue;
      }
      
      validFiles.push(file);
    }

    console.log('Valid files:', validFiles.length, validFiles);
    
    if (validFiles.length > 0) {
      console.log('Setting photos to state...');
      const toDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result, name: file.name, size: file.size });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      Promise.all(validFiles.map(toDataUrl)).then((newPreviews) => {
        setPreviewUrls((prev) => {
          const merged = [...prev, ...newPreviews].slice(0, 5);
          return merged;
        });
        setCompletionPhotos((prev) => {
          const merged = [...prev, ...validFiles].slice(0, 5);
          return merged;
        });
        try { if (e.target) e.target.value = ''; } catch (_) {}
        toast.success(`${validFiles.length} photo(s) selected`);
      }).catch(() => {
        toast.error('Failed to process selected files');
      });
    } else {
      toast.error('No valid files selected');
    }
  };

  const removePhoto = (index) => {
    // Clean up object URL to prevent memory leaks
    const photoToRemove = completionPhotos[index];
    if (photoToRemove) {
      URL.revokeObjectURL(URL.createObjectURL(photoToRemove));
    }
    const newPhotos = completionPhotos.filter((_, i) => i !== index);
    setCompletionPhotos(newPhotos);
  };

  // Track state changes
  useEffect(() => {
    console.log('completionPhotos state changed:', completionPhotos.length, completionPhotos);
  }, [completionPhotos]);

  // Keep previewUrls consistent if all files removed elsewhere
  useEffect(() => {
    if (completionPhotos.length === 0 && previewUrls.length > 0) {
      setPreviewUrls([]);
    }
  }, [completionPhotos, previewUrls.length]);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      completionPhotos.forEach(photo => {
        try {
          URL.revokeObjectURL(URL.createObjectURL(photo));
        } catch (error) {
          // Ignore cleanup errors
        }
      });
    };
  }, [completionPhotos]);

  const handleCompleteInstallation = async () => {
    if (completionPhotos.length === 0) {
      toast.error('Please upload at least one completion photo');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      
      completionPhotos.forEach((photo, index) => {
        formData.append('completionPhotos', photo);
      });
      
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      
      if (issuesEncountered.trim()) {
        formData.append('issuesEncountered', issuesEncountered.trim());
      }

      await completeInstallation(id, formData);
      toast.success('Installation completed successfully! Customer will be notified for sign-off.');
      navigate('/installations');
    } catch (error) {
      toast.error('Failed to complete installation');
      console.error('Error completing installation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = async () => {
    if (!issuesEncountered.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    try {
      setLoading(true);
      await reportIssue(id, { description: issuesEncountered.trim() });
      toast.success('Issue reported successfully. Management has been notified.');
      navigate('/installations');
    } catch (error) {
      toast.error('Failed to report issue');
      console.error('Error reporting issue:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Complete Installation</h1>
              <p className="text-sm text-gray-500 mt-1">
                Upload completion photos and finalize the installation process
              </p>
            </div>
            <button
              onClick={() => navigate('/installations')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Photo Upload Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Completion Photos <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Please upload photos showing the completed installation. These will be shared with the customer for approval.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className="w-12 h-12 text-gray-400 mb-2">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Click to upload photos</p>
                <p className="text-xs text-gray-500">PNG, JPG up to 5MB each (max 5 photos)</p>
                {completionPhotos.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">{completionPhotos.length} file(s) selected</p>
                )}
              </label>
              
              {/* Alternative upload button for debugging */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('photo-upload').click()}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Alternative: Click here to select photos
                </button>
              </div>
            </div>
            
            {/* Debug info */}
            <div className="mt-2 text-xs text-gray-500">
              Debug: {completionPhotos.length} photos selected
              {completionPhotos.length > 0 && (
                <div>
                  Photos: {completionPhotos.map((p, i) => `${i+1}. ${p.name} (${p.size} bytes)`).join(', ')}
                </div>
              )}
            </div>

            {/* Photo Preview */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Photo Preview ({previewUrls.length} selected)
              </h3>
              {previewUrls.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {previewUrls.map((p, index) => {
                    console.log('Rendering photo:', index, p.name);
                    
                    return (
                      <div key={`photo-${index}-${p.name}`} className="relative">
                        <img
                          src={p.url}
                          alt={`Photo ${index + 1}: ${p.name}`}
                          className="w-full h-24 object-cover rounded-lg border"
                          onLoad={() => console.log('Image loaded successfully:', p.name)}
                          onError={(e) => {
                            console.error('Image load error for:', p.name, e);
                          }}
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          title="Remove photo"
                        >
                          ×
                        </button>
                        <p className="text-xs text-gray-500 mt-1 truncate" title={p.name}>
                          {p.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                  No photos selected yet. Click the upload area above to select photos.
                </div>
              )}
            </div>
          </div>

          {/* Completion Notes */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Completion Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about the installation process, special configurations, or recommendations for the customer..."
            />
          </div>

          {/* Issues Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Issues Encountered</h2>
              <button
                onClick={() => setShowIssueForm(!showIssueForm)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  showIssueForm 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showIssueForm ? 'Cancel' : 'Report Issues'}
              </button>
            </div>
            
            {showIssueForm && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <textarea
                  value={issuesEncountered}
                  onChange={(e) => setIssuesEncountered(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Describe any issues encountered during installation that need management attention..."
                />
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={handleReportIssue}
                    disabled={loading || !issuesEncountered.trim()}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {loading ? 'Reporting...' : 'Report Issue Only'}
                  </button>
                  <button
                    onClick={() => setShowIssueForm(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => navigate('/installations')}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleCompleteInstallation}
              disabled={loading || completionPhotos.length === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Completing...
                </>
              ) : (
                'Complete Installation'
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
                <p className="text-sm text-blue-700 mt-1">
                  After completing the installation, the customer will receive a notification to review your work and provide feedback. 
                  Once they approve, the order will be marked as complete.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallationComplete;
