import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Installation Submitted</h1>
              <p className="text-sm text-gray-500 mt-1">
                Order #{summary.purchaseID || id} was submitted for customer sign-off.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/installations')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Summary</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Details</h3>
              <div className="text-sm text-gray-900 space-y-1">
                <p><span className="text-gray-500">Order:</span> #{summary.purchaseID || id}</p>
                <p><span className="text-gray-500">Completed at:</span> {summary.completedAt ? new Date(summary.completedAt).toLocaleString() : '—'}</p>
              </div>
              {summary.notes && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-800">{summary.notes}</div>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Photos</h3>
              {Array.isArray(summary.completionPhotos) && summary.completionPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {summary.completionPhotos.map((url, i) => (
                    <img key={i} src={url.url || url} alt={`Completed ${i+1}`} className="w-full h-24 object-cover rounded border" />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No photos available.</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => navigate(`/dashboard/installations/${id}/signoff`, { state: { ...summary, fromSummary: true } })}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              View Customer Sign-off Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallationCompletedSummary;


