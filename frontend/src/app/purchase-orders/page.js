"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllPurchaseOrders,
  acceptOrder,
  updateStatusToReadyToDispatch,
  allocateInstallationDate,
  getServiceEngineers,
  assignTask,
} from '../../services/purchaseOrderService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import AssignTaskModal from '../../components/dashboard/AssignTaskModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';

// Icons
import { 
  Calendar, 
  Package, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Calendar as CalendarIcon,
  Eye,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  SortAsc,
  SortDesc,
  X
} from 'lucide-react';

// Helper function to format enum values for display
const formatDisplayValue = (value) => {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Custom mobile styles
const customStyles = `
  .mobile-card-container {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }
  
  .mobile-card-container:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
    border-color: #d1d5db;
  }
  
  .mobile-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  
  .mobile-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .mobile-info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .mobile-info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #f3f4f6;
  }
  
  .mobile-action-section {
    padding-top: 16px;
    border-top: 1px solid #f3f4f6;
  }
  
  @media (max-width: 640px) {
    .mobile-card-container {
      padding: 12px;
      margin-bottom: 12px;
      border-radius: 10px;
    }
    
    .mobile-card-header {
      margin-bottom: 12px;
      padding-bottom: 10px;
      gap: 8px;
    }
    
    .mobile-info-grid {
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .mobile-info-item {
      padding: 6px 10px;
      gap: 6px;
    }
    
    .mobile-action-section {
      padding-top: 12px;
    }
  }
  
  @media (max-width: 375px) {
    .mobile-card-container {
      padding: 10px;
      margin-bottom: 10px;
    }
  }
`;

// Mobile Card Component for responsive design
const PurchaseOrderCard = ({ po, user, handleAcceptOrder, handleEstimatedDispatchDateSelection, estimatedDispatchDates, acceptingOrder, handleUpdateStatus, handleDateSelection, selectedDates, savingDate, handleAllocateDate, openAssignTaskModal, viewPurchaseOrder }) => (
  <div className="mobile-card-container">
    {/* Header Section */}
    <div className="mobile-card-header">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mobile-truncate">
            {po.purchaseID}
          </h3>
          <button
            onClick={() => viewPurchaseOrder(po._id)}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex-shrink-0"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border
            ${po.serviceTaskStatus === 'pending_assignment' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
            : po.serviceTaskStatus === 'order_accepted' ? 'bg-purple-50 text-purple-700 border-purple-200'
            : po.serviceTaskStatus === 'ready_to_dispatch' ? 'bg-blue-50 text-blue-700 border-blue-200'
            : po.serviceTaskStatus === 'installation_date_allocated' ? 'bg-orange-50 text-orange-700 border-orange-200'
            : po.serviceTaskStatus === 'assigned' ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}>
            {formatDisplayValue(po.serviceTaskStatus)}
          </span>
        </div>
      </div>
    </div>

    {/* Information Grid */}
    <div className="mobile-info-grid">
      <div className="mobile-info-item">
        <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
          <p className="text-sm font-medium text-gray-900 mobile-truncate">
            {po.customerId ? `${po.customerId.firstName} ${po.customerId.lastName}` : 'N/A'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="mobile-info-item">
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(po.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="mobile-info-item">
          <CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Install Date</p>
            <p className="text-sm font-medium text-gray-900 mobile-truncate">
              {po.installationDate ? new Date(po.installationDate).toLocaleDateString() : 'Not set'}
            </p>
          </div>
        </div>
      </div>
      
      {po.estimatedDispatchDate && (
        <div className="mobile-info-item">
          <Package className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Dispatch</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(po.estimatedDispatchDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
      
      <div className="mobile-info-item">
        <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Engineer</p>
          <p className="text-sm font-medium text-gray-900 mobile-truncate">
            {po.assignedEngineerId ? po.assignedEngineerId.name : 'Not assigned'}
          </p>
        </div>
      </div>
    </div>

    {/* Action Section */}
    <div className="mobile-action-section">
      {/* Action for Product Head: Accept Order */}
      {po.serviceTaskStatus === 'pending_assignment' && (
        user.role === 'product_head' ? (
          <div className="space-y-3">
            <div>
              <label htmlFor={`dispatch-date-${po._id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                Set Estimated Dispatch Date:
              </label>
              <input 
                id={`dispatch-date-${po._id}`}
                type="date" 
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 text-sm bg-gray-50/50"
                onChange={(e) => handleEstimatedDispatchDateSelection(po._id, e.target.value)}
                value={estimatedDispatchDates[po._id] || ''}
                title="Select Estimated Dispatch Date"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <button
              onClick={() => handleAcceptOrder(po._id)}
              disabled={!estimatedDispatchDates[po._id] || acceptingOrder === po._id}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                !estimatedDispatchDates[po._id]
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg border border-purple-600'
              }`}
            >
              {acceptingOrder === po._id ? (
                <div className="flex items-center justify-center">
                  <span className="inline-block animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                  Accepting...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept Order
                </div>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">Waiting for Production Acceptance</span>
            </div>
          </div>
        )
      )}

      {/* Action for Product Head: Ready to Dispatch */}
      {po.serviceTaskStatus === 'order_accepted' && (
        user.role === 'product_head' ? (
          <button 
            className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg border border-orange-600 transition-all duration-200"
            onClick={() => handleUpdateStatus(po._id)}
          >
            <div className="flex items-center justify-center">
              <Package className="w-4 h-4 mr-2" />
              Ready to Dispatch
            </div>
          </button>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">Waiting for Production Team</span>
            </div>
          </div>
        )
      )}

      {/* Action for Marketing Coordinator: Allocate Date */}
      {po.serviceTaskStatus === 'ready_to_dispatch' && (
        user.role === 'marketing_coordinator' ? (
          <div className="space-y-3">
            <div>
              <label htmlFor={`date-${po._id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                Set Installation Date:
              </label>
              <input 
                id={`date-${po._id}`}
                type="date" 
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 text-sm bg-gray-50/50"
                onChange={(e) => handleDateSelection(po._id, e.target.value)}
                value={selectedDates[po._id] || ''}
                title="Select Installation Date"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <button
              onClick={() => handleAllocateDate(po._id)}
              disabled={!selectedDates[po._id] || savingDate === po._id}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                !selectedDates[po._id]
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                  : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg border border-orange-600'
              }`}
            >
              {savingDate === po._id ? (
                <div className="flex items-center justify-center">
                  <span className="inline-block animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Save Date
                </div>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">Waiting for Date Allocation</span>
            </div>
          </div>
        )
      )}

      {/* Action for Product Head: Assign Engineer */}
      {po.serviceTaskStatus === 'installation_date_allocated' && (
        user.role === 'product_head' ? (
          <button 
            className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg border border-orange-600 transition-all duration-200"
            onClick={() => openAssignTaskModal(po)}
          >
            <div className="flex items-center justify-center">
              <Users className="w-4 h-4 mr-2" />
              Assign Engineer
            </div>
          </button>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">Waiting for Engineer Assignment</span>
            </div>
          </div>
        )
      )}

      {/* Final Status */}
      {po.serviceTaskStatus === 'assigned' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center text-green-700">
            <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm font-semibold">Task Assigned</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [engineerFilter, setEngineerFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // State for Assign Task Modal
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // State for date selection
  const [selectedDates, setSelectedDates] = useState({});
  const [savingDate, setSavingDate] = useState(null);
  
  // State for estimated dispatch dates
  const [estimatedDispatchDates, setEstimatedDispatchDates] = useState({});
  const [acceptingOrder, setAcceptingOrder] = useState(null);
  
  // State for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');

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
    fetchEngineers();
  }, [fetchPurchaseOrders]);

  // Get unique engineers for filter dropdown
  const uniqueEngineers = useMemo(() => {
    const engineerMap = new Map();
    purchaseOrders.forEach(po => {
      if (po.assignedEngineerId) {
        engineerMap.set(po.assignedEngineerId._id, {
          _id: po.assignedEngineerId._id,
          name: po.assignedEngineerId.name
        });
      }
    });
    return Array.from(engineerMap.values());
  }, [purchaseOrders]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSortOrder('newest');
    setEngineerFilter('');
    setDateRangeFilter('');
    setCreatedByFilter('');
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter || engineerFilter || dateRangeFilter || sortOrder !== 'newest';

  const fetchEngineers = async () => {
    try {
      const data = await getServiceEngineers();
      setEngineers(data);
    } catch (error) {
      toast.error('Failed to fetch engineers.');
    }
  };

  const handleEstimatedDispatchDateSelection = (id, date) => {
    setEstimatedDispatchDates(prev => ({
      ...prev,
      [id]: date
    }));
  };

  const handleAcceptOrder = (id) => {
    const estimatedDate = estimatedDispatchDates[id];
    if (!estimatedDate) {
      toast.error('Please select an estimated dispatch date first.');
      return;
    }

    setConfirmTitle('Accept Order');
    setConfirmMessage(`Are you sure you want to accept this order with estimated dispatch date: ${new Date(estimatedDate).toLocaleDateString()}?`);
    setConfirmAction('acceptOrder');
    setConfirmData({ id, estimatedDate });
    setShowConfirmDialog(true);
  };

  const confirmAcceptOrder = async (data) => {
    const { id, estimatedDate } = data;
    
    setAcceptingOrder(id);
    try {
      // Update the UI immediately before API call
      setPurchaseOrders(prev =>
        prev.map(po =>
          po._id === id
            ? { 
                ...po, 
                serviceTaskStatus: 'order_accepted',
                estimatedDispatchDate: estimatedDate
              }
            : po
        )
      );
      
      // Then make the API call
      await acceptOrder(id, estimatedDate);
      toast.success('Order accepted successfully.');
      
      // Clear the selected estimated dispatch date for this ID
      setEstimatedDispatchDates(prev => {
        const newDates = { ...prev };
        delete newDates[id];
        return newDates;
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept order.');
      // Refresh data in case of error to ensure UI is in sync
      fetchPurchaseOrders();
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleUpdateStatus = (id) => {
    setConfirmTitle('Ready to Dispatch');
    setConfirmMessage('Are you sure you want to mark this purchase order as Ready to Dispatch?');
    setConfirmAction('readyToDispatch');
    setConfirmData(id);
    setShowConfirmDialog(true);
  };
  
  const confirmUpdateStatus = async (id) => {
    try {
      // Update the UI immediately before API call
      setPurchaseOrders(prev =>
        prev.map(po =>
          po._id === id
            ? { ...po, serviceTaskStatus: 'ready_to_dispatch' }
            : po
        )
      );
      
      // Then make the API call
      await updateStatusToReadyToDispatch(id);
      toast.success('Status updated to Ready to Dispatch.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status.');
      // Refresh data in case of error to ensure UI is in sync
      fetchPurchaseOrders();
    }
  };

  const handleDateSelection = (id, date) => {
    // Only store the selected date without making an API call
    setSelectedDates(prev => ({
      ...prev,
      [id]: date
    }));
  };

  const handleAllocateDate = (id) => {
    const date = selectedDates[id];
    if (!date) {
      toast.error('Please select a date first.');
      return;
    }

    setConfirmTitle('Allocate Installation Date');
    setConfirmMessage(`Are you sure you want to allocate ${new Date(date).toLocaleDateString()} as the installation date?`);
    setConfirmAction('allocateDate');
    setConfirmData({ id, date });
    setShowConfirmDialog(true);
  };
  
  const confirmAllocateDate = async (data) => {
    const { id, date } = data;
    
    setSavingDate(id);
    try {
      // Update the UI immediately before API call
      setPurchaseOrders(prev =>
        prev.map(po =>
          po._id === id
            ? { 
                ...po, 
                serviceTaskStatus: 'installation_date_allocated',
                installationDate: date
              }
            : po
        )
      );
      
      // Then make the API call
      await allocateInstallationDate(id, date);
      toast.success('Installation date allocated.');
      
      // Clear the selected date for this ID
      setSelectedDates(prev => {
        const newDates = { ...prev };
        delete newDates[id];
        return newDates;
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to allocate date.');
      // Refresh data in case of error to ensure UI is in sync
      fetchPurchaseOrders();
    } finally {
      setSavingDate(null);
    }
  };

  const openAssignTaskModal = (order) => {
    // Open the engineer assignment modal directly without confirmation
    setSelectedOrder(order);
    setShowAssignTaskModal(true);
    fetchEngineers();
  };

  const closeAssignTaskModal = () => {
    setShowAssignTaskModal(false);
    setSelectedOrder(null);
  };

  const handleTaskAssignment = useCallback(
    (assignmentData) => {
      if (!selectedOrder) return;

      // Store the assignment data for confirmation
      const engineerName = engineers.find(e => e._id === assignmentData.assignedEngineerId)?.name || 'Unknown Engineer';
      
      // Show confirmation dialog instead of immediately updating
      setConfirmTitle('Assign Service Engineer');
      setConfirmMessage(`Are you sure you want to assign ${engineerName} to this purchase order?`);
      setConfirmAction('assignTask');
      setConfirmData({
        selectedOrderId: selectedOrder._id,
        assignmentData: assignmentData,
        engineerName: engineerName
      });
      setShowConfirmDialog(true);
      
      // Don't close the modal yet - it will be closed after confirmation
      setIsAssigning(false);
    },
    [selectedOrder, engineers, setConfirmTitle, setConfirmMessage, setConfirmAction, setConfirmData, setShowConfirmDialog]
  );
  
  // This function will be called after confirmation
  const confirmTaskAssignment = async (data) => {
    const { selectedOrderId, assignmentData, engineerName } = data;
    
    try {
      setIsAssigning(true);
      
      // Use the installation date that was already allocated by the marketing coordinator
      const dataToSubmit = {
        assignedEngineerId: assignmentData.assignedEngineerId,
        serviceDueDate: selectedOrder.installationDate, // Use the pre-allocated installation date
        serviceAssignmentNotes: assignmentData.serviceAssignmentNotes,
      };
      
      // Update the UI immediately before API call
      setPurchaseOrders(prev => 
        prev.map(po => 
          po._id === selectedOrderId 
            ? { 
                ...po, 
                serviceTaskStatus: 'assigned',
                assignedEngineerId: { 
                  _id: assignmentData.assignedEngineerId,
                  name: engineerName
                }
              } 
            : po
        )
      );
      
      // Make the API call after updating the UI
      await assignTask(selectedOrderId, dataToSubmit);
      
      toast.success('Task assigned to engineer successfully.');
      closeAssignTaskModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign task.');
      // Refresh data in case of error to ensure UI is in sync
      fetchPurchaseOrders();
    } finally {
      setIsAssigning(false);
    }
  };

  const viewPurchaseOrder = (id) => {
    navigate(`/dashboard/purchase-orders/${id}`);
  };

  // Filter purchase orders based on search term and status
  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    // Filter by search term (purchase ID or customer name)
    const matchesSearch = !searchTerm || 
      (po.purchaseID && po.purchaseID.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (po.customerId && `${po.customerId.firstName} ${po.customerId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by status
    const matchesStatus = !statusFilter || po.serviceTaskStatus === statusFilter;
    
    // Filter by assigned engineer
    const matchesEngineer = !engineerFilter || 
      (engineerFilter === 'unassigned' && !po.assignedEngineerId) ||
      (po.assignedEngineerId && po.assignedEngineerId._id === engineerFilter);
    
    // Filter by date range
    let matchesDateRange = true;
    if (dateRangeFilter) {
      const createdDate = new Date(po.createdAt);
      const now = new Date();
      switch (dateRangeFilter) {
        case 'today':
          matchesDateRange = createdDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDateRange = createdDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDateRange = createdDate >= monthAgo;
          break;
        case 'quarter':
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          matchesDateRange = createdDate >= quarterAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesEngineer && matchesDateRange;
  });

  // Sort purchase orders based on sortOrder
  const sortedPurchaseOrders = [...filteredPurchaseOrders].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    const installDateA = a.installationDate ? new Date(a.installationDate) : new Date('2099-12-31');
    const installDateB = b.installationDate ? new Date(b.installationDate) : new Date('2099-12-31');
    
    switch (sortOrder) {
      case 'oldest':
        return dateA - dateB;
      case 'customer_az':
        const customerA = a.customerId ? `${a.customerId.firstName} ${a.customerId.lastName}`.toLowerCase() : 'zzz';
        const customerB = b.customerId ? `${b.customerId.firstName} ${b.customerId.lastName}`.toLowerCase() : 'zzz';
        return customerA.localeCompare(customerB);
      case 'customer_za':
        const customerA2 = a.customerId ? `${a.customerId.firstName} ${a.customerId.lastName}`.toLowerCase() : '';
        const customerB2 = b.customerId ? `${b.customerId.firstName} ${b.customerId.lastName}`.toLowerCase() : '';
        return customerB2.localeCompare(customerA2);
      case 'status':
        return (a.serviceTaskStatus || '').localeCompare(b.serviceTaskStatus || '');
      case 'install_date_soon':
        return installDateA - installDateB;
      case 'install_date_later':
        return installDateB - installDateA;
      case 'po_id_az':
        return (a.purchaseID || '').localeCompare(b.purchaseID || '');
      case 'po_id_za':
        return (b.purchaseID || '').localeCompare(a.purchaseID || '');
      case 'newest':
      default:
        return dateB - dateA;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedPurchaseOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchaseOrders = sortedPurchaseOrders.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error && purchaseOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4 sm:p-5">
        <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mb-3 sm:mb-4" />
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Something went wrong</h3>
        <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{error}</p>
        <button
          onClick={fetchPurchaseOrders}
          className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 shadow-md transition-all duration-150"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        {/* Header Section - Page Title */}
        <div className="border-b border-gray-200 pb-3 sm:pb-5 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">Purchase Orders Management</h1>
          </div>
        </div>

        {/* Main Content Area - Contains filters and table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Filter and Action Bar */}
          <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
            <div className="space-y-4">
              {/* Top Row - Search and Main Actions */}
              <div className="flex flex-col md:flex-row gap-3 sm:gap-4 justify-between items-start md:items-center">
                {/* Search Input */}
                <div className="relative flex-grow md:flex-grow-0 w-full md:w-auto md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search by PO ID or Customer"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-150 ease-in-out text-xs sm:text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
                
                {/* Filter Toggle and Reset */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors duration-200 text-sm font-medium ${
                      showAdvancedFilters 
                        ? 'bg-orange-50 border-orange-200 text-orange-700' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors duration-200"
                      title="Clear all filters"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Advanced Filters Row - Collapsible */}
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-gray-100">
                  {/* Sort Order */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sort by</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => {
                        setSortOrder(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none transition-colors duration-150 ease-in-out text-xs sm:text-sm text-gray-900 bg-white"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="customer_az">Customer A-Z</option>
                      <option value="customer_za">Customer Z-A</option>
                      <option value="po_id_az">PO ID A-Z</option>
                      <option value="po_id_za">PO ID Z-A</option>
                      <option value="status">By Status</option>
                      <option value="install_date_soon">Install Date (Soon)</option>
                      <option value="install_date_later">Install Date (Later)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 mt-3 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none transition-colors duration-150 ease-in-out text-xs sm:text-sm text-gray-900 bg-white"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending_assignment">Pending Assignment</option>
                      <option value="order_accepted">Order Accepted</option>
                      <option value="ready_to_dispatch">Ready to Dispatch</option>
                      <option value="installation_date_allocated">Installation Date Allocated</option>
                      <option value="assigned">Assigned</option>
                      <option value="completed">Completed</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 mt-3 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>

                  {/* Engineer Filter */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Engineer</label>
                    <select
                      value={engineerFilter}
                      onChange={(e) => {
                        setEngineerFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none transition-colors duration-150 ease-in-out text-xs sm:text-sm text-gray-900 bg-white"
                    >
                      <option value="">All Engineers</option>
                      <option value="unassigned">Unassigned</option>
                      {uniqueEngineers.map(engineer => (
                        <option key={engineer._id} value={engineer._id}>
                          {engineer.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 mt-3 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>

                  {/* Date Range Filter */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Created</label>
                    <select
                      value={dateRangeFilter}
                      onChange={(e) => {
                        setDateRangeFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 appearance-none transition-colors duration-150 ease-in-out text-xs sm:text-sm text-gray-900 bg-white"
                    >
                      <option value="">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 mt-3 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Filter Summary */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Active filters:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className="hover:text-orange-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {statusFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                      Status: {formatDisplayValue(statusFilter)}
                      <button onClick={() => setStatusFilter('')} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {engineerFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs">
                      Engineer: {engineerFilter === 'unassigned' ? 'Unassigned' : uniqueEngineers.find(e => e._id === engineerFilter)?.name}
                      <button onClick={() => setEngineerFilter('')} className="hover:text-green-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {dateRangeFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs">
                      Created: {dateRangeFilter.charAt(0).toUpperCase() + dateRangeFilter.slice(1)}
                      <button onClick={() => setDateRangeFilter('')} className="hover:text-purple-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {sortOrder !== 'newest' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                      Sort: {sortOrder.replace('_', ' ')}
                      <button onClick={() => setSortOrder('newest')} className="hover:text-gray-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

        {/* Desktop view - Table */}
        <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
          <div className="overflow-x-auto flex-1 relative">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-32 lg:w-40">
                      PO ID
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-28 lg:w-32">
                      Status
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-28 lg:w-32">
                      Created Date
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-32 lg:w-40">
                      Customer
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-28 lg:w-32">
                      Installation Date
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-32 lg:w-36">
                      Assigned Engineer
                    </th>
                    <th scope="col" className="px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-24 lg:w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPurchaseOrders.length > 0 ? currentPurchaseOrders.map((po) => (
                    <tr key={po._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <span className="mobile-truncate">{po.purchaseID}</span>
                          <button
                            onClick={() => viewPurchaseOrder(po._id)}
                            className="p-1 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors flex-shrink-0"
                            title="View details"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium
                          ${po.serviceTaskStatus === 'pending_assignment' ? 'bg-yellow-100 text-yellow-800'
                          : po.serviceTaskStatus === 'order_accepted' ? 'bg-purple-100 text-purple-800'
                          : po.serviceTaskStatus === 'ready_to_dispatch' ? 'bg-blue-100 text-blue-800'
                          : po.serviceTaskStatus === 'installation_date_allocated' ? 'bg-orange-100 text-orange-800'
                          : po.serviceTaskStatus === 'assigned' ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          <span className="mobile-truncate">{formatDisplayValue(po.serviceTaskStatus)}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <span className="mobile-truncate">{po.customerId ? `${po.customerId.firstName} ${po.customerId.lastName}`: 'N/A'}</span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <span className="mobile-truncate">{po.installationDate ? new Date(po.installationDate).toLocaleDateString() : 'Not set'}</span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <span className="mobile-truncate">{po.assignedEngineerId ? po.assignedEngineerId.name : 'Not assigned'}</span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {/* Action for Product Head: Accept Order */}
                          {po.serviceTaskStatus === 'pending_assignment' && (
                            user.role === 'product_head' ? (
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <input 
                                  type="date" 
                                  className="px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs sm:text-sm"
                                  onChange={(e) => handleEstimatedDispatchDateSelection(po._id, e.target.value)}
                                  value={estimatedDispatchDates[po._id] || ''}
                                  title="Select Estimated Dispatch Date"
                                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                                />
                                <button
                                  onClick={() => handleAcceptOrder(po._id)}
                                  disabled={!estimatedDispatchDates[po._id] || acceptingOrder === po._id}
                                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium ${
                                    !estimatedDispatchDates[po._id]
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                      : 'bg-purple-600 text-white hover:bg-purple-700'
                                  } transition-all duration-150 whitespace-nowrap`}
                                >
                                  {acceptingOrder === po._id ? (
                                    <>
                                      <span className="inline-block animate-spin h-3 w-3 mr-1 border-2 border-white border-t-transparent rounded-full"></span>
                                      <span className="hidden sm:inline">Accepting...</span>
                                      <span className="sm:hidden">...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="hidden sm:inline">Accept Order</span>
                                      <span className="sm:hidden">Accept</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="px-2 sm:px-3 py-1.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium cursor-not-allowed"
                                disabled 
                                title="Waiting for Product Head to accept order"
                              >
                                <span className="hidden sm:inline">Accept Order</span>
                                <span className="sm:hidden">Accept</span>
                              </button>
                            )
                          )}

                          {/* Action for Product Head: Ready to Dispatch */}
                          {po.serviceTaskStatus === 'order_accepted' && (
                            <button 
                              className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium ${
                                user.role !== 'product_head' 
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                              } transition-all duration-150 whitespace-nowrap`}
                              onClick={() => handleUpdateStatus(po._id)}
                              disabled={user.role !== 'product_head'}
                              title={user.role !== 'product_head' ? 'This action is for the Product Head' : 'Mark as Ready to Dispatch'}
                            >
                              <span className="hidden sm:inline">Ready to Dispatch</span>
                              <span className="sm:hidden">Ready</span>
                            </button>
                          )}

                          {/* Action for Marketing Coordinator: Allocate Date */}
                          {po.serviceTaskStatus === 'ready_to_dispatch' && (
                            user.role === 'marketing_coordinator' ? (
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <input 
                                  type="date" 
                                  className="px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                                  onChange={(e) => handleDateSelection(po._id, e.target.value)}
                                  value={selectedDates[po._id] || ''}
                                  title="Select Installation Date"
                                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                                />
                                <button
                                  onClick={() => handleAllocateDate(po._id)}
                                  disabled={!selectedDates[po._id] || savingDate === po._id}
                                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium ${
                                    !selectedDates[po._id]
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                      : 'bg-orange-600 text-white hover:bg-orange-700'
                                  } transition-all duration-150 whitespace-nowrap`}
                                >
                                  {savingDate === po._id ? (
                                    <>
                                      <span className="inline-block animate-spin h-3 w-3 mr-1 border-2 border-white border-t-transparent rounded-full"></span>
                                      <span className="hidden sm:inline">Saving...</span>
                                      <span className="sm:hidden">...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="hidden sm:inline">Save Date</span>
                                      <span className="sm:hidden">Save</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="px-2 sm:px-3 py-1.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium cursor-not-allowed"
                                disabled 
                                title="Waiting for Marketing Coordinator to allocate date"
                              >
                                <span className="hidden sm:inline">Allocate Date</span>
                                <span className="sm:hidden">Allocate</span>
                              </button>
                            )
                          )}

                          {/* Action for Product Head: Assign Engineer */}
                          {po.serviceTaskStatus === 'installation_date_allocated' && (
                            <button 
                              className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium ${
                                user.role !== 'product_head' 
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                              } transition-all duration-150 whitespace-nowrap`}
                              onClick={() => openAssignTaskModal(po)}
                              disabled={user.role !== 'product_head'}
                              title={user.role !== 'product_head' ? 'This action is for the Product Head' : 'Assign Service Engineer'}
                            >
                              <span className="hidden sm:inline">Assign Engineer</span>
                              <span className="sm:hidden">Assign</span>
                            </button>
                          )}

                          {/* Final Status */}
                          {po.serviceTaskStatus === 'assigned' && (
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Task Assigned</span>
                              <span className="sm:hidden">Assigned</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="px-4 sm:px-6 py-8 sm:py-10 text-center text-gray-500">
                        <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-2 sm:mb-3" />
                        <p className="text-base sm:text-lg font-medium">No purchase orders found</p>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">Purchase orders will appear here when created.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination for desktop */}
          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div>
                <p className="text-xs sm:text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">
                    {Math.min(endIndex, sortedPurchaseOrders.length)}</span> of{' '}
                  <span className="font-medium">{sortedPurchaseOrders.length}</span> results
                </p>
              </div>
              <nav className="flex justify-end">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 sm:px-3 py-2 rounded-md border border-gray-300 bg-white text-xs sm:text-sm font-medium ${
                    currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`ml-2 sm:ml-3 relative inline-flex items-center px-2 sm:px-3 py-2 rounded-md border border-gray-300 bg-white text-xs sm:text-sm font-medium ${
                    currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* Mobile view */}
        <div className="md:hidden p-3 sm:p-4 space-y-3 sm:space-y-4">
          {currentPurchaseOrders.length > 0 ? (
            currentPurchaseOrders.map((po) => (
              <PurchaseOrderCard
                key={po._id}
                po={po}
                user={user}
                handleAcceptOrder={handleAcceptOrder}
                handleEstimatedDispatchDateSelection={handleEstimatedDispatchDateSelection}
                estimatedDispatchDates={estimatedDispatchDates}
                acceptingOrder={acceptingOrder}
                handleUpdateStatus={handleUpdateStatus}
                handleDateSelection={handleDateSelection}
                selectedDates={selectedDates}
                savingDate={savingDate}
                handleAllocateDate={handleAllocateDate}
                openAssignTaskModal={openAssignTaskModal}
                viewPurchaseOrder={viewPurchaseOrder}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center bg-white rounded-xl shadow p-4 sm:p-6">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-2 sm:mb-3" />
              <p className="text-base sm:text-lg font-medium text-gray-900">No purchase orders found</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Purchase orders will appear here when created.</p>
            </div>
          )}

          {/* Pagination for mobile */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-3 px-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`flex items-center justify-center px-3 py-2 border rounded-md text-xs sm:text-sm font-medium ${
                  currentPage === 1 ? 'text-gray-300 cursor-not-allowed border-gray-200' : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Previous
              </button>
              <span className="text-xs sm:text-sm text-gray-700 font-medium">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`flex items-center justify-center px-3 py-2 border rounded-md text-xs sm:text-sm font-medium ${
                  currentPage === totalPages ? 'text-gray-300 cursor-not-allowed border-gray-200' : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Next
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              </button>
            </div>
          )}
        </div>
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
          formatDate={(date) => new Date(date).toLocaleDateString()}
        />
      )}
      
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirm}
        title={confirmTitle}
        message={confirmMessage}
      />
      </div>
    </>
  );
  
  // Function to handle confirmation actions
  function handleConfirm() {
    // Close the confirm dialog
    setShowConfirmDialog(false);
    
    // Process the action based on the type
    switch (confirmAction) {
      case 'acceptOrder':
        // Handle order acceptance confirmation
        confirmAcceptOrder(confirmData);
        break;
        
      case 'readyToDispatch':
        // Let confirmUpdateStatus handle the state update
        confirmUpdateStatus(confirmData);
        break;
        
      case 'allocateDate':
        // Let confirmAllocateDate handle the state update
        confirmAllocateDate(confirmData);
        break;
        
      case 'assignTask':
        // Handle engineer assignment confirmation
        confirmTaskAssignment(confirmData);
        break;
        
      default:
        break;
    }
  }
}
