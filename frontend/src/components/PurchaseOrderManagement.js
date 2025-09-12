import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllPurchaseOrders,
  updateStatusToReadyToDispatch,
  allocateInstallationDate,
  getServiceEngineers,
  assignTask,
} from '../services/purchaseOrderService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import AssignTaskModal from './dashboard/AssignTaskModal';

// Icons - Import these from your icon library (e.g., lucide-react)
// If you don't have these icons available, you can replace with equivalent icons from your project
import { Calendar, Package, Users, AlertCircle, CheckCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';

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
    
    /* Responsive text handling */
    .mobile-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    
    /* Better spacing for mobile cards */
    .mobile-card-compact {
      padding: 12px;
      margin-bottom: 8px;
    }
    
    /* Force card width constraints */
    .mobile-card-container {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    
    /* Compact action buttons for very small screens */
    .mobile-action-compact {
      padding: 8px 12px !important;
      margin: 0 2px !important;
    }
  }
  
  @media (max-width: 375px) {
    /* Extra small screens like iPhone SE */
    .mobile-card-compact {
      padding: 8px;
    }
    
    .mobile-header-text {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
    
    .mobile-action-buttons {
      gap: 4px !important;
    }
  }

  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Helper function to format enum values for display
const formatDisplayValue = (value) => {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Mobile Card Component for responsive design
const PurchaseOrderCard = ({ po, user, handleUpdateStatus, handleDateSelection, selectedDates, savingDate, handleAllocateDate, openAssignTaskModal }) => (
  <div className="rounded-lg border p-3 sm:p-4 space-y-3 sm:space-y-4 shadow-sm hover:shadow-md transition-all duration-200 bg-white border-gray-200 mb-3 sm:mb-4 mobile-card-container">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mobile-truncate mobile-header-text">
            {po.purchaseID}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2 mt-1">
          <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium
            ${po.serviceTaskStatus === 'pending_assignment' ? 'bg-yellow-100 text-yellow-800'
            : po.serviceTaskStatus === 'ready_to_dispatch' ? 'bg-blue-100 text-blue-800'
            : po.serviceTaskStatus === 'installation_date_allocated' ? 'bg-orange-100 text-orange-800'
            : po.serviceTaskStatus === 'assigned' ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
            }`}>
            {formatDisplayValue(po.serviceTaskStatus)}
          </span>
        </div>
      </div>
    </div>

    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
        <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="mobile-truncate">{po.customerId ? `${po.customerId.firstName} ${po.customerId.lastName}`: 'N/A'}</span>
      </div>
      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
        <span>{new Date(po.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
        <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="mobile-truncate">{po.installationDate ? new Date(po.installationDate).toLocaleDateString() : 'Not set'}</span>
      </div>
      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
        <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="mobile-truncate">{po.assignedEngineerId ? po.assignedEngineerId.name : 'Not assigned'}</span>
      </div>
    </div>

    <div className="pt-2 sm:pt-3 border-t border-gray-100">
      {/* Action for Product Head: Ready to Dispatch */}
      {po.serviceTaskStatus === 'pending_assignment' && (
        <button 
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold ${
            user.role !== 'product_head' 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
              : 'bg-primary text-white hover:opacity-90 shadow-md'
          } transition-all duration-150 w-full touch-target mobile-action-compact`}
          onClick={() => handleUpdateStatus(po._id)}
          disabled={user.role !== 'product_head'}
          title={user.role !== 'product_head' ? 'This action is for the Product Head' : 'Mark as Ready to Dispatch'}
        >
          <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
          Ready to Dispatch
        </button>
      )}

      {/* Action for Marketing Coordinator: Allocate Date */}
      {po.serviceTaskStatus === 'ready_to_dispatch' && (
        user.role === 'marketing_coordinator' ? (
          <div className="flex flex-col space-y-2">
            <label htmlFor={`date-${po._id}`} className="text-xs sm:text-sm font-semibold text-gray-700">
              Set Installation Date:
            </label>
            <div className="flex flex-col gap-2">
              <input 
                id={`date-${po._id}`}
                type="date" 
                className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-sm touch-target"
                onChange={(e) => handleDateSelection(po._id, e.target.value)}
                value={selectedDates[po._id] || ''}
                title="Select Installation Date"
                min={new Date().toISOString().split('T')[0]} // Prevent past dates
              />
              <button
                onClick={() => handleAllocateDate(po._id)}
                disabled={!selectedDates[po._id] || savingDate === po._id}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold ${
                  !selectedDates[po._id]
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:opacity-90 shadow-md'
                } transition-all duration-150 touch-target mobile-action-compact`}
              >
                {savingDate === po._id ? (
                  <>
                    <span className="inline-block animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                    Saving...
                  </>
                ) : (
                  <>Save Date</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs sm:text-sm font-semibold cursor-not-allowed w-full touch-target mobile-action-compact"
            disabled 
            title="Waiting for Marketing Coordinator to allocate date"
          >
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
            Waiting for Date Allocation
          </button>
        )
      )}

      {/* Action for Product Head: Assign Engineer */}
      {po.serviceTaskStatus === 'installation_date_allocated' && (
        <button 
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold ${
            user.role !== 'product_head' 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
              : 'bg-primary text-white hover:opacity-90 shadow-md'
          } transition-all duration-150 w-full touch-target mobile-action-compact`}
          onClick={() => openAssignTaskModal(po)}
          disabled={user.role !== 'product_head'}
          title={user.role !== 'product_head' ? 'This action is for the Product Head' : 'Assign Service Engineer'}
        >
          <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
          Assign Engineer
        </button>
      )}

      {/* Final Status */}
      {po.serviceTaskStatus === 'assigned' && (
        <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 rounded-xl text-xs sm:text-sm font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          Task Assigned
        </span>
      )}
    </div>
  </div>
);

const PurchaseOrderManagement = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State for Assign Task Modal
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // State for date selection
  const [selectedDates, setSelectedDates] = useState({});
  const [savingDate, setSavingDate] = useState(null);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllPurchaseOrders();
      setPurchaseOrders(data);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch purchase orders.');
      toast.error(error.response?.data?.error || 'Failed to fetch purchase orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const fetchEngineers = async () => {
    try {
      const data = await getServiceEngineers();
      setEngineers(data);
    } catch (error) {
      toast.error('Failed to fetch engineers.');
    }
  };

  const handleUpdateStatus = async (id) => {
    try {
      await updateStatusToReadyToDispatch(id);
      toast.success('Status updated to Ready to Dispatch.');
      fetchPurchaseOrders(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleDateSelection = (id, date) => {
    // Only store the selected date without making an API call
    setSelectedDates(prev => ({
      ...prev,
      [id]: date
    }));
  };

  const handleAllocateDate = async (id) => {
    const date = selectedDates[id];
    if (!date) {
      toast.error('Please select a date first.');
      return;
    }

    setSavingDate(id);
    try {
      await allocateInstallationDate(id, date);
      toast.success('Installation date allocated.');
      fetchPurchaseOrders(); // Refresh data
      
      // Clear the selected date for this ID
      setSelectedDates(prev => {
        const newDates = { ...prev };
        delete newDates[id];
        return newDates;
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to allocate date.');
    } finally {
      setSavingDate(null);
    }
  };

  const openAssignTaskModal = (order) => {
    setSelectedOrder(order);
    setShowAssignTaskModal(true);
    fetchEngineers();
  };

  const closeAssignTaskModal = () => {
    setShowAssignTaskModal(false);
    setSelectedOrder(null);
  };

  const handleTaskAssignment = useCallback(
    async (assignmentData) => {
      if (!selectedOrder) return;

      try {
        setIsAssigning(true);
        // Use the installation date that was already allocated by the marketing coordinator
        const dataToSubmit = {
          assignedEngineerId: assignmentData.assignedEngineerId,
          serviceDueDate: selectedOrder.installationDate, // Use the pre-allocated installation date
          serviceAssignmentNotes: assignmentData.serviceAssignmentNotes,
        };
        await assignTask(selectedOrder._id, dataToSubmit);
        toast.success('Task assigned to engineer successfully.');
        closeAssignTaskModal();
        fetchPurchaseOrders(); // Refresh data
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to assign task.');
      } finally {
        setIsAssigning(false);
      }
    },
    [selectedOrder, fetchPurchaseOrders]
  );

  // Pagination logic
  const totalPages = Math.ceil(purchaseOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchaseOrders = purchaseOrders.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && purchaseOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-5">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchPurchaseOrders}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 shadow-md transition-all duration-150"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="container px-3 sm:px-4 mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 mobile-header-text">Purchase Order Management</h1>

        {/* Desktop view - Table */}
        <div className="hidden lg:block overflow-hidden bg-white rounded-xl shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Installation Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Engineer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPurchaseOrders.length > 0 ? currentPurchaseOrders.map((po) => (
                <tr key={po._id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {po.purchaseID}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                      ${po.serviceTaskStatus === 'pending_assignment' ? 'bg-yellow-100 text-yellow-800'
                      : po.serviceTaskStatus === 'ready_to_dispatch' ? 'bg-blue-100 text-blue-800'
                      : po.serviceTaskStatus === 'installation_date_allocated' ? 'bg-orange-100 text-orange-800'
                      : po.serviceTaskStatus === 'assigned' ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {formatDisplayValue(po.serviceTaskStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.customerId ? `${po.customerId.firstName} ${po.customerId.lastName}`: 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.installationDate ? new Date(po.installationDate).toLocaleDateString() : 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.assignedEngineerId ? po.assignedEngineerId.name : 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {/* Action for Product Head: Ready to Dispatch */}
                    {po.serviceTaskStatus === 'pending_assignment' && (
                      <button 
                        className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                          user.role !== 'product_head' 
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : 'bg-primary text-white hover:opacity-90'
                        } transition-all duration-150`}
                        onClick={() => handleUpdateStatus(po._id)}
                        disabled={user.role !== 'product_head'}
                        title={user.role !== 'product_head' ? 'This action is for the Product Head' : 'Mark as Ready to Dispatch'}
                      >
                        Ready to Dispatch
                      </button>
                    )}

                    {/* Action for Marketing Coordinator: Allocate Date */}
                    {po.serviceTaskStatus === 'ready_to_dispatch' && (
                      user.role === 'marketing_coordinator' ? (
                        <div className="flex items-center space-x-2">
                          <input 
                            type="date" 
                            className="px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                            onChange={(e) => handleDateSelection(po._id, e.target.value)}
                            value={selectedDates[po._id] || ''}
                            title="Select Installation Date"
                            min={new Date().toISOString().split('T')[0]} // Prevent past dates
                          />
                          <button
                            onClick={() => handleAllocateDate(po._id)}
                            disabled={!selectedDates[po._id] || savingDate === po._id}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                              !selectedDates[po._id]
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : 'bg-primary text-white hover:opacity-90'
                            } transition-all duration-150 whitespace-nowrap`}
                          >
                            {savingDate === po._id ? (
                              <>
                                <span className="inline-block animate-spin h-3 w-3 mr-1 border-2 border-white border-t-transparent rounded-full"></span>
                                Saving...
                              </>
                            ) : (
                              <>Save Date</>
                            )}
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium cursor-not-allowed"
                          disabled 
                          title="Waiting for Marketing Coordinator to allocate date"
                        >
                          Allocate Date
                        </button>
                      )
                    )}

                    {/* Action for Product Head: Assign Engineer */}
                    {po.serviceTaskStatus === 'installation_date_allocated' && (
                      <button 
                        className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                          user.role !== 'product_head' 
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : 'bg-primary text-white hover:opacity-90'
                        } transition-all duration-150`}
                        onClick={() => openAssignTaskModal(po)}
                        disabled={user.role !== 'product_head'}
                        title={user.role !== 'product_head' ? 'This action is for the Product Head' : 'Assign Service Engineer'}
                      >
                        Assign Engineer
                      </button>
                    )}

                    {/* Final Status */}
                    {po.serviceTaskStatus === 'assigned' && (
                      <span className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Task Assigned
                      </span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg font-medium">No purchase orders found</p>
                    <p className="text-sm text-gray-400 mt-1">Purchase orders will appear here when created.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination for desktop */}
        {totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">
                  {Math.min(endIndex, purchaseOrders.length)}</span> of{' '}
                <span className="font-medium">{purchaseOrders.length}</span> results
              </p>
            </div>
            <nav className="flex justify-end">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Mobile view */}
      <div className="lg:hidden space-y-3 sm:space-y-4">
        {currentPurchaseOrders.length > 0 ? (
          currentPurchaseOrders.map((po) => (
            <PurchaseOrderCard
              key={po._id}
              po={po}
              user={user}
              handleUpdateStatus={handleUpdateStatus}
              handleDateSelection={handleDateSelection}
              selectedDates={selectedDates}
              savingDate={savingDate}
              handleAllocateDate={handleAllocateDate}
              openAssignTaskModal={openAssignTaskModal}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center bg-white rounded-xl shadow p-4 sm:p-6">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-2 sm:mb-3" />
            <p className="text-base sm:text-lg font-medium text-gray-900">No purchase orders found</p>
            <p className="text-sm text-gray-500 mt-1">Purchase orders will appear here when created.</p>
          </div>
        )}

        {/* Pagination for mobile */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-3">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium touch-target ${
                currentPage === 1 ? 'text-gray-300 cursor-not-allowed border-gray-200' : 'text-gray-700 hover:bg-gray-50 border-gray-300'
              }`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium touch-target ${
                currentPage === totalPages ? 'text-gray-300 cursor-not-allowed border-gray-200' : 'text-gray-700 hover:bg-gray-50 border-gray-300'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showAssignTaskModal && selectedOrder && (
        <AssignTaskModal
          task={{
            ...selectedOrder,
            // Pre-fill the serviceDueDate with the installation date already set by marketing coordinator
            serviceDueDate: selectedOrder.installationDate
          }}
          serviceEngineers={engineers}
          loadingEngineers={false}
          onClose={closeAssignTaskModal}
          onAssign={handleTaskAssignment}
          isAssigning={isAssigning}
        />
      )}
    </div>
    </>
  );
};

export default PurchaseOrderManagement;
