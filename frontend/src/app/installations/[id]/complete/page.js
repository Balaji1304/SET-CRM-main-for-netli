import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { completeInstallation, reportIssue } from '../../../../services/installationService';
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
  
  /* Improved mobile responsiveness */
  .mobile-modal-content {
    max-height: 95vh;
    overflow-y: auto;
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
    
    /* Better spacing for mobile forms */
    .mobile-form-spacing {
      margin-bottom: 1rem;
    }
    
    /* Improved button spacing on mobile */
    .mobile-button-stack button {
      margin-bottom: 0.75rem;
    }
    
    .mobile-button-stack button:last-child {
      margin-bottom: 0;
    }
  }
  
  /* Loading state improvements */
  .loading-spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const InstallationComplete = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState('');
  const [issuesEncountered, setIssuesEncountered] = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILES = 5;
  const MAX_SIZE = 5 * 1024 * 1024;

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const buildPreviews = async (files) => {
    const toDataUrl = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result, name: file.name, size: file.size });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return Promise.all(files.map(toDataUrl));
  };

  const addFiles = async (inputFiles) => {
    const files = Array.from(inputFiles || []);
    if (!files.length) return;

    const alreadyCount = completionPhotos.length;
    const remainingSlots = Math.max(0, MAX_FILES - alreadyCount);
    if (remainingSlots === 0) {
      toast.error(`Maximum ${MAX_FILES} photos allowed`);
      return;
    }

    const filtered = files
      .filter((f) => {
        if (!f.type.startsWith('image/')) {
          toast.error(`${f.name} is not an image`);
          return false;
        }
        if (f.size > MAX_SIZE) {
          toast.error(`${f.name} is too large (max 5MB)`);
          return false;
        }
        return true;
      })
      .slice(0, remainingSlots);

    if (!filtered.length) {
      toast.error('No valid files selected');
      return;
    }

    const newPreviews = await buildPreviews(filtered);
    setCompletionPhotos((prev) => [...prev, ...filtered]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    toast.success(`${filtered.length} photo(s) added`);
  };

  const onInputChange = async (e) => {
    await addFiles(e.target.files);
    try { if (e.target) e.target.value = ''; } catch (_) {}
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    await addFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removePhoto = (index) => {
    const newPhotos = completionPhotos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setCompletionPhotos(newPhotos);
    setPreviews(newPreviews);
  };

  useEffect(() => {
    if (completionPhotos.length === 0 && previews.length > 0) {
      setPreviews([]);
    }
  }, [completionPhotos, previews.length]);

  const handleCompleteInstallation = async () => {
    if (completionPhotos.length === 0) {
      toast.error('Please upload at least one completion photo');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      completionPhotos.forEach((photo) => formData.append('completionPhotos', photo));

      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      
      if (issuesEncountered.trim()) {
        formData.append('issuesEncountered', issuesEncountered.trim());
      }

      const res = await completeInstallation(id, formData);
      toast.success('Installation completed successfully! Customer will be notified for sign-off.');
      const data = res?.data || {};
      navigate(`/dashboard/installations/${id}/completed`, { state: data });
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
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header Section - Page Title */}
        <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary">Complete Installation</h1>
              <p className="mt-1 text-sm text-gray-500 hidden sm:block">
                Upload completion photos and finalize the installation process
              </p>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => navigate('/installations')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150 text-gray-500 hover:text-gray-700"
              aria-label="Close and return to dashboard"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Completion Photos Section */}
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-4">
                Completion Photos <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-gray-600 mb-4 sm:mb-6">
                Please upload photos showing the completed installation. These will be shared with the customer for approval.
              </p>
              
              <div
                className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onInputChange}
                  className="hidden"
                  id="photo-upload"
                  capture="environment"
                  ref={fileInputRef}
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-2">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Click or drag images here</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB each (max 5 photos)</p>
                  {completionPhotos.length > 0 && (
                    <p className="text-xs text-blue-600 mt-2">{completionPhotos.length} selected</p>
                  )}
                </label>
                <div className="mt-3 sm:mt-2 space-y-2 sm:space-y-0 sm:space-x-3 flex flex-col sm:flex-row items-center justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-150 border border-blue-200"
                  >
                    Browse Files
                  </button>
                  {completionPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setCompletionPhotos([]); setPreviews([]); }}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 border border-gray-200"
                    >
                      Remove All ({completionPhotos.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Photo Preview Section */}
              <div className="mt-4 sm:mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2 sm:mb-3">
                  Photo Preview ({previews.length} selected)
                </h3>
                {previews.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {previews.map((p, index) => (
                      <div key={`photo-${index}-${p.name}`} className="relative group">
                        <div className="aspect-square w-full overflow-hidden rounded-lg border border-gray-200 group-hover:border-gray-300 transition-colors duration-150">
                          <img
                            src={p.url}
                            alt={`Photo ${index + 1}: ${p.name}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors duration-150 shadow-sm z-10"
                          title="Remove photo"
                        >
                          ×
                        </button>
                        <p className="text-xs text-gray-500 mt-1 mobile-truncate" title={p.name}>
                          {p.name} • {formatFileSize(p.size)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 p-4 sm:p-6 bg-gray-50 rounded-lg text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p>No photos selected yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click the upload area above to select photos</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completion Notes Section */}
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-4">Completion Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 text-sm sm:text-base resize-none"
                placeholder="Add any notes about the installation process, special configurations, or recommendations for the customer..."
              />
            </div>

            {/* Issues Encountered Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Issues Encountered</h2>
                <button
                  onClick={() => setShowIssueForm(!showIssueForm)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    showIssueForm 
                      ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {showIssueForm ? 'Cancel' : 'Report Issues'}
                </button>
              </div>
              
              {showIssueForm && (
                <div className="border border-red-200 rounded-lg p-4 sm:p-6 bg-red-50">
                  <textarea
                    value={issuesEncountered}
                    onChange={(e) => setIssuesEncountered(e.target.value)}
                    rows="3"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-150 text-sm sm:text-base resize-none"
                    placeholder="Describe any issues encountered during installation that need management attention..."
                  />
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={handleReportIssue}
                      disabled={loading || !issuesEncountered.trim()}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors duration-150 flex items-center justify-center"
                    >
                      {loading ? 'Reporting...' : 'Report Issue Only'}
                    </button>
                    <button
                      onClick={() => setShowIssueForm(false)}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-150"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end pt-4 sm:pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/installations')}
                className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-150 border border-gray-200"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleCompleteInstallation}
                disabled={loading || completionPhotos.length === 0}
                className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors duration-150 flex items-center justify-center shadow-lg hover:shadow-xl"
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

            {/* Information Panel */}
            <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2">What happens next?</h3>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    After completing the installation, the customer will receive a notification to review your work and provide feedback. 
                    Once they approve, the order will be marked as complete.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InstallationComplete;
