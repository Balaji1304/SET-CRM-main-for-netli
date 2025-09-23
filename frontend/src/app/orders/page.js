import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  FileText,
  Download,
  Filter,
  Eye,
  Calendar,
  User,
  Phone
} from 'lucide-react';
import { getMyOrderTracking } from '../../services/trackingService';
import { STATUS_LABELS, PHASE_LABELS, STATUS_COLORS, PHASE_COLORS } from '../../services/trackingService';
import { formatNumber } from '../../utils/formatNumber';
import { getMyPurchases, downloadOrderFormPDF } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';
import ExportButton from '../../components/ExportButton';
import { exportOrders } from '../../services/trackingService';
import { downloadCSV } from '../../utils/csv';

// Custom styles for mobile responsive design
const customStyles = `
  .mobile-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  
  .mobile-card-compact {
    padding: 12px;
    margin-bottom: 8px;
  }
  
  .mobile-card-header {
    padding: 14px;
  }
  
  .mobile-card-content {
    padding: 12px 14px;
  }
  
  .mobile-action-compact {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .touch-friendly {
    min-height: 44px;
    min-width: 44px;
  }
  
  .modal-mobile-spacing {
    padding: 12px;
  }
  
  .timeline-mobile {
    margin-left: 12px;
  }
  
  @media (max-width: 640px) {
    .mobile-truncate {
      max-width: 200px;
    }
    
    .mobile-card-compact {
      padding: 10px;
      margin-bottom: 12px;
    }
    
    .mobile-card-header {
      padding: 12px;
    }
    
    .mobile-card-content {
      padding: 10px 12px;
    }
    
    .mobile-action-compact {
      padding: 8px 12px;
      font-size: 12px;
      min-height: 44px;
    }
    
    .modal-mobile-spacing {
      padding: 8px;
    }
    
    .timeline-mobile {
      margin-left: 8px;
    }
  }
  
  @media (max-width: 375px) {
    .mobile-card-compact {
      padding: 8px;
      margin-bottom: 10px;
    }
    
    .mobile-card-header {
      padding: 10px;
    }
    
    .mobile-card-content {
      padding: 8px 10px;
    }
    
    .mobile-action-compact {
      padding: 5px 8px;
      font-size: 11px;
    }
  }
`;

const OrderTrackingCard = ({ tracking, onViewDetails, isAdmin = false }) => {
  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'order_placed': 'bg-blue-100 text-blue-800',
      'payment_confirmed': 'bg-green-100 text-green-800',
      'order_accepted': 'bg-green-100 text-green-800',
      'order_approved': 'bg-green-100 text-green-800',
      'ready_to_dispatch': 'bg-yellow-100 text-yellow-800',
      'dispatched': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-indigo-100 text-indigo-800',
      'installation_scheduled': 'bg-orange-100 text-orange-800',
      'installation_completed': 'bg-emerald-100 text-emerald-800',
      'order_completed': 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get the main product image or use a placeholder
  const getProductImage = () => {
    // Try to get image from purchase products
    const products = tracking.purchaseId?.products;
    if (products && products.length > 0) {
      const firstProduct = products[0];
      if (firstProduct.productId?.images && firstProduct.productId.images.length > 0) {
        return firstProduct.productId.images[0];
      }
      if (firstProduct.image) {
        return firstProduct.image;
      }
    }
    
    // Fallback to a solar system placeholder
    return "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=150&h=100&fit=crop&auto=format";
  };

  // Get the best available date for a step (actualDate > timestamp > estimatedDate)
  const getStepDateForCard = (eventStatus, milestoneKey = null, useEstimated = false) => {
    const event = tracking.events?.find(e => e.status === eventStatus);
    
    // Priority 1: actualDate from event (when it actually happened)
    if (event?.actualDate) {
      return event.actualDate;
    }
    
    // Priority 2: timestamp from event (when it was logged)
    if (event?.timestamp) {
      return event.timestamp;
    }
    
    // Priority 3: milestone date
    if (milestoneKey && tracking.milestones?.[milestoneKey]) {
      return tracking.milestones[milestoneKey];
    }
    
    // Priority 4: estimated date for future steps
    if (useEstimated) {
      if (eventStatus === 'delivered' && tracking.estimatedDelivery) {
        return tracking.estimatedDelivery;
      }
      if (eventStatus === 'installation_completed' && tracking.estimatedInstallation) {
        return tracking.estimatedInstallation;
      }
      if (event?.estimatedDate) {
        return event.estimatedDate;
      }
    }
    
    return null;
  };

  // Timeline steps based on current status and events
  const getTimelineSteps = () => {
    const allSteps = [
      {
        id: 'order_placed',
        title: 'Order Placed',
        timestamp: getStepDateForCard('order_placed', 'orderPlaced') || tracking.purchaseId?.createdAt,
        completed: true
      },
      {
        id: 'payment_confirmed',
        title: 'Payment Confirmed',
        timestamp: getStepDateForCard('payment_confirmed', 'paymentConfirmed'),
        estimatedDate: !getStepDateForCard('payment_confirmed') ? getStepDateForCard('payment_confirmed', null, true) : null,
        completed: ['payment_confirmed', 'order_accepted', 'order_approved', 'ready_to_dispatch', 'dispatched', 'delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus)
      },
      {
        id: 'order_accepted',
        title: 'Order Accepted',
        timestamp: getStepDateForCard('order_accepted', 'orderApproved') || getStepDateForCard('order_approved', 'orderApproved'),
        estimatedDate: !getStepDateForCard('order_accepted') && !getStepDateForCard('order_approved') ? getStepDateForCard('order_accepted', null, true) : null,
        completed: ['order_accepted', 'order_approved', 'ready_to_dispatch', 'dispatched', 'delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus)
      },
      {
        id: 'ready_to_dispatch',
        title: 'Ready to Dispatch',
        timestamp: getStepDateForCard('ready_to_dispatch', 'packageReady'),
        estimatedDate: !getStepDateForCard('ready_to_dispatch') ? getStepDateForCard('ready_to_dispatch', null, true) : null,
        completed: ['ready_to_dispatch', 'dispatched', 'delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus)
      },
      {
        id: 'dispatched',
        title: 'Dispatched',
        timestamp: getStepDateForCard('dispatched', 'dispatched'),
        estimatedDate: !getStepDateForCard('dispatched') ? getStepDateForCard('dispatched', null, true) : null,
        completed: ['dispatched', 'delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus)
      },
      {
        id: 'delivered',
        title: 'Delivered',
        timestamp: getStepDateForCard('delivered', 'delivered') || tracking.actualDelivery,
        estimatedDate: !getStepDateForCard('delivered') && !tracking.actualDelivery ? tracking.estimatedDelivery : null,
        completed: ['delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus)
      },
      {
        id: 'installation_scheduled',
        title: 'Installation Scheduled',
        timestamp: getStepDateForCard('installation_scheduled') || getStepDateForCard('engineer_assigned'),
        estimatedDate: !getStepDateForCard('installation_scheduled') && !getStepDateForCard('engineer_assigned') ? tracking.estimatedInstallation : null,
        completed: ['installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus)
      },
      {
        id: 'installation_completed',
        title: 'Installation Completed',
        timestamp: getStepDateForCard('installation_completed', 'installationCompleted') || tracking.actualInstallation,
        estimatedDate: !getStepDateForCard('installation_completed') && !tracking.actualInstallation ? tracking.estimatedInstallation : null,
        completed: ['installation_completed', 'order_completed'].includes(tracking.currentStatus)
      }
    ];

    return allSteps.filter(step => step.completed || step.timestamp);
  };

  const timelineSteps = getTimelineSteps();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 h-fit">
      {/* Header Section */}
      <div className="relative bg-gradient-to-r from-gray-50 to-white mobile-card-header border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <img 
              src={getProductImage()} 
              alt="Solar System"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mobile-truncate">
                {tracking.purchaseId?.purchaseID || 'Solar Installation Order'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mobile-truncate">#{tracking.trackingNumber}</p>
            </div>
          </div>
          
          <div className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-semibold ${getStatusColor(tracking.currentStatus)} flex-shrink-0`}>
            {STATUS_LABELS[tracking.currentStatus] || 'Order Placed'}
          </div>
        </div>

        {/* Order Details */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Amount</span>
            <span className="font-bold text-gray-900">₹{formatNumber(tracking.purchaseId?.totalAmount || 0)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Progress</span>
            <span className="text-sm font-medium text-orange-600">{tracking.progressPercentage || 5}%</span>
          </div>
        </div>
      </div>

      {/* Customer Info - Admin Only */}
      {isAdmin && tracking.purchaseId?.customerId && (
        <div className="bg-blue-50 border-b border-blue-100 mobile-card-content">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-blue-900 mobile-truncate">
                {tracking.purchaseId.customerId.firstName} {tracking.purchaseId.customerId.lastName}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              {tracking.purchaseId.customerId.phone && (
                <>
                  <Phone className="h-3 w-3 text-blue-600 flex-shrink-0" />
                  <span className="text-blue-700 mobile-truncate">{tracking.purchaseId.customerId.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mobile-card-content">
        {/* Current Status & Latest Update */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Current Status</h4>
            <span className="text-xs text-gray-500 sm:text-right">
              {formatDateTime(new Date())}
            </span>
          </div>
          
          {/* Status with progress bar */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900 mobile-truncate">
                {timelineSteps.find(step => step.completed && step.id === tracking.currentStatus)?.title || 
                 timelineSteps[timelineSteps.filter(s => s.completed).length - 1]?.title || 'Order Processing'}
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${tracking.progressPercentage || 5}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600 mt-1 text-center">
              {tracking.progressPercentage || 5}% Complete
            </div>
          </div>
        </div>

        {/* Quick Timeline Overview */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Updates</h4>
          <div className="space-y-3">
            {timelineSteps.slice(0, 2).map((step, index) => (
              <div key={step.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    step.completed ? 'bg-orange-500' : 'bg-gray-300'
                  }`}>
                    {step.completed && (
                      <CheckCircle className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className={`text-sm font-medium mobile-truncate ${
                        step.completed ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </span>
                      {step.timestamp && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDateTime(step.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {timelineSteps.length > 2 && (
              <div className="text-center pt-2">
                <button 
                  onClick={() => onViewDetails(tracking)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                >
                  View all {timelineSteps.length} steps
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-100 mobile-card-content bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => onViewDetails(tracking)}
            className="flex items-center justify-center space-x-2 bg-primary text-white mobile-action-compact rounded-lg font-medium hover:opacity-90 transition-all duration-200 touch-friendly"
          >
            <Eye className="w-4 h-4" />
            <span>View Details</span>
          </button>
          
          <button
            onClick={async () => {
              try {
                const pdfBlob = await downloadOrderFormPDF(tracking.purchaseId._id);
                const url = window.URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Order_Form_${tracking.purchaseId.purchaseID || tracking.purchaseId._id}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error downloading Order Form:', error);
                alert('Failed to download Order Form. Please try again.');
              }
            }}
            className="flex items-center justify-center space-x-2 bg-green-600 text-white mobile-action-compact rounded-lg font-medium hover:bg-green-700 transition-all duration-200 touch-friendly"
            title="Download Order Form PDF"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Order Form</span>
            <span className="sm:hidden">Download</span>
          </button>
        </div>

        <button className="w-full flex items-center justify-center space-x-2 bg-gray-200 text-gray-700 mobile-action-compact rounded-lg font-medium hover:bg-gray-300 transition-all duration-200 touch-friendly">
          <Phone className="w-4 h-4" />
          <span>Contact Support</span>
        </button>
      </div>
    </div>
  );
};

const TrackingDetailModal = ({ tracking, isOpen, onClose, isAdmin = false }) => {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !tracking) return null;

  const formatDateTime = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateOnly = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get the best available date for a step (actualDate > timestamp > estimatedDate)
  const getStepDate = (eventStatus, milestoneKey = null, useEstimated = false) => {
    const event = tracking.events?.find(e => e.status === eventStatus);
    
    // Priority 1: actualDate from event (when it actually happened)
    if (event?.actualDate) {
      return event.actualDate;
    }
    
    // Priority 2: timestamp from event (when it was logged)
    if (event?.timestamp) {
      return event.timestamp;
    }
    
    // Priority 3: milestone date
    if (milestoneKey && tracking.milestones?.[milestoneKey]) {
      return tracking.milestones[milestoneKey];
    }
    
    // Priority 4: estimated date for future steps
    if (useEstimated) {
      if (eventStatus === 'delivered' && tracking.estimatedDelivery) {
        return tracking.estimatedDelivery;
      }
      if (eventStatus === 'installation_completed' && tracking.estimatedInstallation) {
        return tracking.estimatedInstallation;
      }
      if (event?.estimatedDate) {
        return event.estimatedDate;
      }
    }
    
    return null;
  };

  // Enhanced timeline steps for modal
  const getDetailedTimelineSteps = () => {
    const allSteps = [
      {
        id: 'order_placed',
        title: 'Order Placed',
        description: 'Your order has been successfully placed and confirmed',
        timestamp: getStepDate('order_placed', 'orderPlaced') || tracking.purchaseId?.createdAt,
        completed: true,
        icon: Package,
        color: 'bg-orange-500'
      },
      {
        id: 'payment_confirmed',
        title: 'Payment Confirmed',
        description: 'Payment has been processed and verified',
        timestamp: getStepDate('payment_confirmed', 'paymentConfirmed'),
        estimatedDate: !getStepDate('payment_confirmed') ? getStepDate('payment_confirmed', null, true) : null,
        completed: ['payment_confirmed', 'order_accepted', 'order_approved', 'ready_to_dispatch', 'dispatched', 'delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus),
        icon: CheckCircle,
        color: 'bg-emerald-500'
      },
      {
        id: 'order_accepted',
        title: 'Order Accepted',
        description: 'Your order has been accepted and is being prepared',
        timestamp: getStepDate('order_accepted', 'orderApproved') || getStepDate('order_approved', 'orderApproved'),
        estimatedDate: !getStepDate('order_accepted') && !getStepDate('order_approved') ? getStepDate('order_accepted', null, true) : null,
        completed: ['order_accepted', 'order_approved', 'ready_to_dispatch', 'dispatched', 'delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus),
        icon: CheckCircle,
        color: 'bg-green-500'
      },
      {
        id: 'ready_to_dispatch',
        title: 'Ready to Dispatch',
        description: 'Your order is ready and will be dispatched soon',
        timestamp: getStepDate('ready_to_dispatch', 'packageReady'),
        estimatedDate: !getStepDate('ready_to_dispatch') ? getStepDate('ready_to_dispatch', null, true) : null,
        completed: ['ready_to_dispatch', 'dispatched', 'delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus),
        icon: Package,
        color: 'bg-blue-500'
      },
      {
        id: 'dispatched',
        title: 'Order Dispatched',
        description: 'Your order has been shipped and is on its way',
        timestamp: getStepDate('dispatched', 'dispatched'),
        estimatedDate: !getStepDate('dispatched') ? getStepDate('dispatched', null, true) : null,
        completed: ['dispatched', 'delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus),
        icon: Truck,
        color: 'bg-blue-600'
      },
      {
        id: 'delivered',
        title: 'Delivered',
        description: 'Order has been delivered to your location',
        timestamp: getStepDate('delivered', 'delivered') || tracking.actualDelivery,
        estimatedDate: !getStepDate('delivered') && !tracking.actualDelivery ? tracking.estimatedDelivery : null,
        completed: ['delivered', 'installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus),
        icon: MapPin,
        color: 'bg-purple-500'
      },
      {
        id: 'installation_scheduled',
        title: 'Installation Scheduled',
        description: 'Installation has been scheduled with our engineer',
        timestamp: getStepDate('installation_scheduled') || getStepDate('engineer_assigned'),
        estimatedDate: !getStepDate('installation_scheduled') && !getStepDate('engineer_assigned') ? tracking.estimatedInstallation : null,
        completed: ['installation_scheduled', 'engineer_assigned', 'installation_in_progress', 'installation_completed', 'order_completed'].includes(tracking.currentStatus),
        icon: User,
        color: 'bg-indigo-500'
      },
      {
        id: 'installation_completed',
        title: 'Installation Completed',
        description: 'Solar system installation has been completed successfully',
        timestamp: getStepDate('installation_completed', 'installationCompleted') || tracking.actualInstallation,
        estimatedDate: !getStepDate('installation_completed') && !tracking.actualInstallation ? tracking.estimatedInstallation : null,
        completed: ['installation_completed', 'order_completed'].includes(tracking.currentStatus),
        icon: CheckCircle,
        color: 'bg-orange-500'
      }
    ];

    return allSteps;
  };

  const timelineSteps = getDetailedTimelineSteps();
  const completedSteps = timelineSteps.filter(step => step.completed).length;
  const progressPercentage = Math.round((completedSteps / timelineSteps.length) * 100);

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-full sm:max-w-4xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Modern Header with Gradient */}
        <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 sm:p-6">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold mb-1 mobile-truncate">
                {tracking.purchaseId?.purchaseID || 'Solar Installation Order'}
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-orange-100 text-xs sm:text-sm">
                <span className="mobile-truncate">#{tracking.trackingNumber}</span>
                <span className="mobile-truncate">₹{formatNumber(tracking.purchaseId?.totalAmount || 0)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors touch-friendly flex-shrink-0"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Overview */}
          <div className="mt-4 sm:mt-6 bg-white bg-opacity-20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium">Overall Progress</span>
              <span className="text-sm sm:text-sm font-bold">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-1.5 sm:h-2">
              <div 
                className="h-1.5 sm:h-2 bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mt-2 text-xs text-orange-100">
              <span>{completedSteps} of {timelineSteps.length} steps completed</span>
              <span className="font-medium">{STATUS_LABELS[tracking.currentStatus]}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(98vh-120px)] sm:max-h-[calc(95vh-200px)]">
          {/* Customer Information - Admin Only */}
          {isAdmin && tracking.purchaseId?.customerId && (
            <div className="mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-blue-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium text-blue-700">Name:</span>
                  <span className="text-sm sm:text-base font-semibold text-blue-900 mobile-truncate">
                    {tracking.purchaseId.customerId.firstName} {tracking.purchaseId.customerId.lastName}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium text-blue-700">Email:</span>
                  <span className="text-sm sm:text-base text-blue-800 mobile-truncate">
                    {tracking.purchaseId.customerId.email}
                  </span>
                </div>
                {tracking.purchaseId.customerId.phone && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm font-medium text-blue-700">Phone:</span>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-blue-800 mobile-truncate">
                        {tracking.purchaseId.customerId.phone}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Section */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-500" />
              Order Journey
            </h3>
            
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              <div className="space-y-4 sm:space-y-8">
                {timelineSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isLast = index === timelineSteps.length - 1;
                  
                  return (
                    <div key={step.id} className="relative flex items-start">
                      {/* Timeline Icon */}
                      <div className={`relative z-10 flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-lg ${
                        step.completed ? step.color : 'bg-gray-300'
                      }`}>
                        <Icon className="h-3 w-3 sm:h-5 sm:w-5 text-white" />
                      </div>

                      {/* Connected Line */}
                      {!isLast && step.completed && (
                        <div className="absolute left-4 sm:left-6 top-8 sm:top-12 w-0.5 h-4 sm:h-8 bg-orange-500"></div>
                      )}

                      {/* Content */}
                      <div className="ml-3 sm:ml-6 flex-1 min-w-0">
                        <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all duration-300 ${
                          step.completed 
                            ? 'bg-orange-50 border-orange-200 shadow-sm' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <h4 className={`text-sm sm:text-base font-semibold mobile-truncate ${
                              step.completed ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {step.title}
                            </h4>
                            <div className="flex flex-col sm:items-end gap-1">
                              {step.timestamp && (
                                <span className="text-xs text-orange-600 font-medium bg-orange-100 px-2 py-1 rounded-full inline-block">
                                  {formatDateTime(step.timestamp)}
                                </span>
                              )}
                              {step.estimatedDate && !step.timestamp && (
                                <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full inline-block">
                                  Expected: {formatDateTime(step.estimatedDate)}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={`text-xs sm:text-sm ${
                            step.completed ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Key Information Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Delivery Information */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-blue-500 rounded-lg">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h4 className="ml-2 sm:ml-3 text-sm sm:text-base font-semibold text-gray-900">Delivery Details</h4>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Estimated Delivery</span>
                  <span className="text-xs sm:text-sm font-medium">{formatDateOnly(tracking.estimatedDelivery)}</span>
                </div>
                {tracking.actualDelivery && (
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Actual Delivery</span>
                    <span className="text-xs sm:text-sm font-medium text-green-600">{formatDateOnly(tracking.actualDelivery)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Installation Information */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-orange-500 rounded-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h4 className="ml-2 sm:ml-3 text-sm sm:text-base font-semibold text-gray-900">Installation Details</h4>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {tracking.estimatedInstallation && (
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Estimated Installation</span>
                    <span className="text-xs sm:text-sm font-medium">{formatDateOnly(tracking.estimatedInstallation)}</span>
                  </div>
                )}
                {tracking.actualInstallation && (
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Completed On</span>
                    <span className="text-xs sm:text-sm font-medium text-green-600">{formatDateOnly(tracking.actualInstallation)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
            <button className="flex-1 bg-orange-500 text-white py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium hover:bg-orange-600 transition-colors flex items-center justify-center touch-friendly">
              <Phone className="h-4 w-4 mr-2" />
              Contact Support
            </button>
            {tracking.currentStatus === 'delivered' && (
              <button className="flex-1 bg-blue-500 text-white py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium hover:bg-blue-600 transition-colors flex items-center justify-center touch-friendly">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Installation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTracking, setSelectedTracking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadTrackingData();
    
    // Auto-refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      loadTrackingData();
    }, 120000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      const response = await getMyOrderTracking();
      setTrackingData(response.data || []);
    } catch (error) {
      console.error('Error loading tracking data:', error);
      setError('Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async ({ startDate, endDate }) => {
    setExportLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await exportOrders(params);
      if (response.success && response.data.length > 0) {
        downloadCSV(response.data, `orders_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (response.success && response.data.length === 0) {
        alert('No data to export for the selected date range.');
      } else {
        throw new Error(response.message || 'Failed to export orders');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Error exporting data: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleViewDetails = (tracking) => {
    setSelectedTracking(tracking);
    setShowDetailModal(true);
  };

  const filteredTrackingData = trackingData.filter(tracking => {
    const matchesSearch = !searchTerm || 
      tracking.purchaseId?.purchaseID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tracking.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (isAdmin && tracking.purchaseId?.customerId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (isAdmin && tracking.purchaseId?.customerId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (isAdmin && tracking.purchaseId?.customerId?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || tracking.currentPhase === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Orders</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadTrackingData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
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
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">
                {isAdmin ? 'All Customer Orders' : 'Your Orders'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isAdmin 
                  ? 'Monitor and manage all customer solar installation orders and shipments'
                  : 'Track the progress of your solar installation orders and shipments'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isAdmin && <ExportButton onExport={handleExport} loading={exportLoading} />}
            <div className="text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{filteredTrackingData.length} {filteredTrackingData.length === 1 ? 'Order' : 'Orders'}</span>
              </span>
              {isAdmin && (
                <span className="flex items-center space-x-1 mt-1">
                  <User className="w-3 h-3" />
                  <span>Admin View</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Contains filters and orders */}
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Filter and Action Bar */}
        <div className="p-4 md:p-6 border-b border-fourth sticky top-0 bg-tertiary z-20">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={isAdmin ? "Search by order ID, customer name, email..." : "Search by order ID, tracking number..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary min-w-[140px] bg-tertiary text-sm text-secondary"
              >
                <option value="all">All Status</option>
                <option value="processing">Processing</option>
                <option value="packaging">Packaging</option>
                <option value="shipping">Shipping</option>
                <option value="installation">Installation</option>
                <option value="completed">Completed</option>
                <option value="issues">Issues</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {filteredTrackingData.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {trackingData.length === 0 
                  ? (isAdmin ? "No customer orders found in the system yet." : "You haven't placed any orders yet. Start shopping to see your orders here.")
                  : "No orders match your current search criteria. Try adjusting your filters."
                }
              </p>
              {trackingData.length === 0 && !isAdmin && (
                <button 
                  onClick={() => navigate('/dashboard/quotations')}
                  className="mt-6 bg-primary text-white px-6 py-2 rounded-lg hover:opacity-90 transition-colors"
                >
                  Browse Products
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              {trackingData.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm font-medium text-gray-600 mobile-truncate">Processing</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {trackingData.filter(t => ['order_placed', 'payment_confirmed', 'order_accepted'].includes(t.currentStatus)).length}
                    </p>
                  </div>
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm font-medium text-gray-600 mobile-truncate">Shipping</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {trackingData.filter(t => ['ready_to_dispatch', 'dispatched'].includes(t.currentStatus)).length}
                    </p>
                  </div>
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm font-medium text-gray-600 mobile-truncate">Installation</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {trackingData.filter(t => ['delivered', 'installation_scheduled'].includes(t.currentStatus)).length}
                    </p>
                  </div>
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm font-medium text-gray-600 mobile-truncate">Completed</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {trackingData.filter(t => ['installation_completed', 'order_completed'].includes(t.currentStatus)).length}
                    </p>
                  </div>
                </div>
              )}

              {/* Orders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredTrackingData.map((tracking) => (
                  <OrderTrackingCard
                    key={tracking._id}
                    tracking={tracking}
                    onViewDetails={handleViewDetails}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <TrackingDetailModal
        tracking={selectedTracking}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        isAdmin={isAdmin}
      />
    </div>
    </>
  );
} 