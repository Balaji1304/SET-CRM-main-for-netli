import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments, acceptAssignment, updateInstallationStatus } from '../../services/installationService';
import { toast } from 'react-toastify';

const InstallationDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [acceptData, setAcceptData] = useState({
    estimatedArrival: '',
    notes: ''
  });
  const [statusData, setStatusData] = useState({
    status: '',
    location: '',
    notes: ''
  });

  // Engineer-facing badge mapping: treat pending_signoff and completed as Closed
  const getEngineerBadge = (status) => {
    const mapping = {
      assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-800' },
      on_route: { label: 'On the way', color: 'bg-yellow-100 text-yellow-800' },
      on_site: { label: 'On site', color: 'bg-orange-100 text-orange-800' },
      in_progress: { label: 'Work in progress', color: 'bg-purple-100 text-purple-800' },
      pending_signoff: { label: 'Closed', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Closed', color: 'bg-green-100 text-green-800' },
      issues: { label: 'Issues reported', color: 'bg-red-100 text-red-800' }
    };
    return mapping[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  useEffect(() => {
    if (user?.role === 'service_engineer') {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getMyAssignments();
      const list = Array.isArray(response.data) ? response.data : [];
      // Sort latest to oldest using relevant timestamps; fallback to createdAt/updatedAt if present
      const sorted = list.sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.installationDate || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.installationDate || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setAssignments(sorted);
    } catch (error) {
      toast.error('Failed to fetch assignments');
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAssignment = async (assignment) => {
    setSelectedAssignment(assignment);
    setAcceptData({
      estimatedArrival: '',
      notes: ''
    });
    setShowAcceptModal(true);
  };

  const submitAcceptance = async () => {
    try {
      await acceptAssignment(selectedAssignment._id, acceptData);
      toast.success('Assignment accepted successfully!');
      setShowAcceptModal(false);
      await fetchAssignments();
    } catch (error) {
      toast.error('Failed to accept assignment');
      console.error('Error accepting assignment:', error);
    }
  };

  const handleStatusUpdate = (assignment) => {
    setSelectedAssignment(assignment);
    setStatusData({
      status: '',
      location: '',
      notes: ''
    });
    setShowStatusModal(true);
  };

  const submitStatusUpdate = async () => {
    try {
      await updateInstallationStatus(selectedAssignment._id, statusData);
      toast.success('Status updated successfully!');
      setShowStatusModal(false);
      await fetchAssignments();
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Error updating status:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Installation Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your installation assignments and track progress
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {assignments.length} Active Assignment{assignments.length !== 1 ? 's' : ''}
                </div>
                {/* Auto-refresh is triggered after updates; manual refresh removed per requirement */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading assignments...</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
            <p className="mt-1 text-sm text-gray-500">You don't have any installation assignments at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => (
              <div key={assignment._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{assignment.purchaseID}
                    </h3>
                    {(() => { const b = getEngineerBadge(assignment.installationStatus); return (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.color}`}>
                        {b.label}
                      </span>
                    ); })()}
                  </div>

                  {/* Customer Info */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Details</h4>
                    <p className="text-sm text-gray-900">
                      {assignment.customerId.firstName} {assignment.customerId.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{assignment.customerId.email}</p>
                    <p className="text-sm text-gray-500">{assignment.customerId.phone}</p>
                    {assignment.customerId.address && (
                      <p className="text-sm text-gray-500 mt-1">{assignment.customerId.address}</p>
                    )}
                  </div>

                  {/* Products */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Products to Install</h4>
                    <div className="space-y-1">
                      {assignment.products?.map((product, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          <span className="font-medium">{product.quantity}x</span> {product.name}
                          {product.modelNumber && (
                            <span className="text-gray-400"> ({product.modelNumber})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Installation Date */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700">Scheduled Date</h4>
                    <p className="text-sm text-gray-900">
                      {formatDate(assignment.installationDate)}
                    </p>
                  </div>

                  {/* Notes */}
                  {assignment.serviceAssignmentNotes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                      <p className="text-sm text-gray-600">{assignment.serviceAssignmentNotes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {assignment.installationStatus === 'assigned' && (
                      <button
                        onClick={() => handleAcceptAssignment(assignment)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Accept Assignment
                      </button>
                    )}
                    {['accepted', 'on_route', 'on_site', 'in_progress'].includes(assignment.installationStatus) && (
                      <button
                        onClick={() => handleStatusUpdate(assignment)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Update Status
                      </button>
                    )}
                    {assignment.installationStatus === 'in_progress' && (
                      <button
                        onClick={() => window.location.href = `/dashboard/installations/${assignment._id}/complete`}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accept Assignment Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Accept Assignment
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Arrival Time
                  </label>
                  <input
                    type="datetime-local"
                    value={acceptData.estimatedArrival}
                    onChange={(e) => setAcceptData(prev => ({ ...prev, estimatedArrival: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={acceptData.notes}
                    onChange={(e) => setAcceptData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAcceptance}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Accept Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Installation Status
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusData.status}
                    onChange={(e) => setStatusData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Status</option>
                    <option value="on_route">En Route</option>
                    <option value="on_site">On Site</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={statusData.location}
                    onChange={(e) => setStatusData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Current location..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={statusData.notes}
                    onChange={(e) => setStatusData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Status update notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={submitStatusUpdate}
                  disabled={!statusData.status}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallationDashboard;
