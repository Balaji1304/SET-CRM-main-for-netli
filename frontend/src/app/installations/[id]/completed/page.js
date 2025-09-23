import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { X, CheckCircle, Camera, FileText, Clock } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

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

const InstallationCompletedSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();

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

  const summary = state || {};

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
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary">Installation Submitted</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500 hidden sm:block">
                Order #{summary.purchaseID || id} was submitted for customer sign-off
              </p>
              <p className="mt-1 text-sm text-gray-500 sm:hidden">
                Order #{summary.purchaseID || id} submitted
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
            
            {/* Submission Summary Section */}
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Submission Summary
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                
                {/* Details Section */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Installation Details
                    </h3>
                    <div className="bg-white rounded-lg p-4 sm:p-5 border border-gray-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-500">Order Number:</span>
                        <span className="text-sm font-bold text-gray-900">#{summary.purchaseID || id}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-500">Installation ID:</span>
                        <span className="text-sm text-gray-900">{id}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-500">Service Engineer:</span>
                        <span className="text-sm text-gray-900">{user?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-500">Submitted At:</span>
                        <span className="text-sm text-gray-900">
                          {summary.completedAt ? new Date(summary.completedAt).toLocaleString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : new Date().toLocaleString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-500">Customer:</span>
                        <span className="text-sm text-gray-900">
                          {summary.customer?.name || `${summary.customerFirstName || ''} ${summary.customerLastName || ''}`.trim() || 'Customer information pending'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-500">Installation Address:</span>
                        <span className="text-sm text-gray-900 text-right sm:max-w-xs">
                          {summary.customer?.address || summary.installationAddress || summary.address || summary.customerAddress || 'Address information pending'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-500">Photos Uploaded:</span>
                        <span className="text-sm text-gray-900">
                          {Array.isArray(summary.completionPhotos) ? summary.completionPhotos.length : 0} photo(s)
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-500">Current Status:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Awaiting Customer Sign-off
                        </span>
                      </div>
                      {summary.issuesEncountered && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                            <span className="text-sm font-medium text-red-600">Issues Reported:</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Requires Attention
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Section */}
                  {summary.notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Completion Notes</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-800 leading-relaxed">
                        {summary.notes}
                      </div>
                    </div>
                  )}

                  {/* Issues Section */}
                  {summary.issuesEncountered && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Issues Encountered
                      </h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 leading-relaxed">
                        <div className="font-medium mb-2">⚠️ Management Attention Required</div>
                        {summary.issuesEncountered}
                      </div>
                    </div>
                  )}
                </div>

                {/* Photos Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Completion Photos ({Array.isArray(summary.completionPhotos) ? summary.completionPhotos.length : 0})
                  </h3>
                  {Array.isArray(summary.completionPhotos) && summary.completionPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                      {summary.completionPhotos.map((url, i) => (
                        <div key={i} className="relative group">
                          <div className="aspect-square w-full overflow-hidden rounded-lg border border-gray-200 group-hover:border-gray-300 transition-colors duration-150">
                            <img 
                              src={url.url || url} 
                              alt={`Completed installation photo ${i+1}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-center">Photo {i + 1}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 sm:p-8 bg-gray-50 rounded-lg border border-gray-200">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No photos available</p>
                      <p className="text-xs text-gray-400 mt-1">Photos will appear here once uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end pt-4 sm:pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/dashboard/installations')}
                className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-150 border border-gray-200"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate(`/dashboard/installations/${id}/signoff`, { state: { ...summary, fromSummary: true } })}
                className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                View Customer Sign-off Page
              </button>
            </div>

            {/* Information Panel */}
            <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-semibold text-green-900 mb-2">Installation Submitted Successfully</h3>
                  <p className="text-sm text-green-800 leading-relaxed">
                    The installation has been completed and submitted for customer review. The customer will receive a notification 
                    to sign off on the work. You can track the status from your dashboard.
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

export default InstallationCompletedSummary;


