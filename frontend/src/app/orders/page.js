import React, { useState, useEffect } from 'react';
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

const OrderTrackingCard = ({ tracking, onViewDetails }) => {
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
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
      {/* Header with Product Image and Status */}
      <div className="relative">
        <div className="flex">
          {/* Product Image */}
          <div className="w-32 h-24 bg-gray-100 flex-shrink-0">
            <img 
              src={getProductImage()} 
              alt="Solar System"
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              tracking.currentStatus === 'order_completed' ? 'bg-orange-100 text-orange-800' :
              tracking.currentStatus === 'installation_completed' ? 'bg-orange-100 text-orange-800' :
              tracking.currentStatus === 'delivered' ? 'bg-purple-100 text-purple-800' :
              tracking.currentStatus === 'dispatched' ? 'bg-yellow-100 text-yellow-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {tracking.currentStatus === 'order_completed' ? '✅' :
               tracking.currentStatus === 'installation_completed' ? '🔧' :
               tracking.currentStatus === 'delivered' ? '📍' :
               tracking.currentStatus === 'dispatched' ? '🚛' :
               tracking.currentStatus === 'payment_confirmed' ? '💳' :
               '📦'} {STATUS_LABELS[tracking.currentStatus] || tracking.currentStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Order Info */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            {tracking.purchaseId?.purchaseID || 'Solar Installation Order'}
          </h3>
          <div className="flex items-center text-sm text-gray-600 space-x-4">
            <span>₹{formatNumber(tracking.purchaseId?.totalAmount || 0)}</span>
            <span>•</span>
            <span>#{tracking.trackingNumber}</span>
            <span>•</span>
            <span>{tracking.progressPercentage || 0}% Complete</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            EXPECTED TOTAL MONTHLY SAVINGS
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mb-6">          
          <div className="space-y-0">
            {timelineSteps.map((step, index) => (
              <div key={step.id} className="relative flex items-center pb-6">
                {/* Connecting Line - Show before each step except the first */}
                {index > 0 && (
                  <div className={`absolute left-3 top-0 w-0.5 h-6 ${
                    timelineSteps[index - 1]?.completed ? 'bg-orange-500' : 'bg-gray-200'
                  }`} style={{ transform: 'translateY(-24px)' }}></div>
                )}
                
                {/* Timeline Icon */}
                <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  step.completed 
                    ? 'border-orange-500 bg-orange-500 shadow-sm' 
                    : 'border-gray-300 bg-white'
                }`}>
                  {step.completed ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  )}
                </div>

                {/* Timeline Content */}
                <div className="ml-4 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-semibold ${
                      step.completed ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </h4>
                    <div className="flex flex-col items-end gap-1">
                      {step.timestamp && (
                        <span className="text-xs text-blue-600 font-medium">
                          {formatDateTime(step.timestamp)}
                        </span>
                      )}
                      {step.estimatedDate && !step.timestamp && (
                        <span className="text-xs text-gray-500 font-medium">
                          Expected: {formatDateTime(step.estimatedDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => onViewDetails(tracking)}
            className="flex-1 bg-blue-50 text-blue-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            View Details
          </button>
          
          {/* Order Form Button */}
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
            className="flex-1 bg-green-50 text-green-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
            title="Download Order Form PDF"
          >
            <FileText className="w-4 h-4" />
            Order Form
          </button>
          
          {/* Additional actions based on status */}
          {tracking.currentStatus === 'delivered' && (
            <button className="flex-1 bg-orange-50 text-orange-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">
              Schedule Installation
            </button>
          )}
        </div>

        {/* Support Section */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-gray-500">
              <Phone className="w-4 h-4" />
              <span>Need help?</span>
            </div>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TrackingDetailModal = ({ tracking, isOpen, onClose }) => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Modern Header with Gradient */}
        <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {tracking.purchaseId?.purchaseID || 'Solar Installation Order'}
              </h2>
              <div className="flex items-center space-x-4 text-orange-100">
                <span className="text-sm">#{tracking.trackingNumber}</span>
                <span className="text-sm">•</span>
                <span className="text-sm">₹{formatNumber(tracking.purchaseId?.totalAmount || 0)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Overview */}
          <div className="mt-6 bg-white bg-opacity-20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
              <div 
                className="h-2 bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-orange-100">
              <span>{completedSteps} of {timelineSteps.length} steps completed</span>
              <span>{STATUS_LABELS[tracking.currentStatus]}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {/* Timeline Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-500" />
              Order Journey
            </h3>
            
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              <div className="space-y-8">
                {timelineSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isLast = index === timelineSteps.length - 1;
                  
                  return (
                    <div key={step.id} className="relative flex items-start">
                      {/* Timeline Icon */}
                      <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg ${
                        step.completed ? step.color : 'bg-gray-300'
                      }`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>

                      {/* Connected Line */}
                      {!isLast && step.completed && (
                        <div className="absolute left-6 top-12 w-0.5 h-8 bg-orange-500"></div>
                      )}

                      {/* Content */}
                      <div className="ml-6 flex-1">
                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          step.completed 
                            ? 'bg-orange-50 border-orange-200 shadow-sm' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`font-semibold ${
                              step.completed ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {step.title}
                            </h4>
                            <div className="flex flex-col items-end gap-1">
                              {step.timestamp && (
                                <span className="text-xs text-orange-600 font-medium bg-orange-100 px-2 py-1 rounded-full">
                                  {formatDateTime(step.timestamp)}
                                </span>
                              )}
                              {step.estimatedDate && !step.timestamp && (
                                <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">
                                  Expected: {formatDateTime(step.estimatedDate)}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={`text-sm ${
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Delivery Information */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <h4 className="ml-3 font-semibold text-gray-900">Delivery Details</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estimated Delivery</span>
                  <span className="text-sm font-medium">{formatDateOnly(tracking.estimatedDelivery)}</span>
                </div>
                {tracking.actualDelivery && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Actual Delivery</span>
                    <span className="text-sm font-medium text-green-600">{formatDateOnly(tracking.actualDelivery)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Installation Information */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <h4 className="ml-3 font-semibold text-gray-900">Installation Details</h4>
              </div>
              <div className="space-y-3">
                {tracking.estimatedInstallation && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Estimated Installation</span>
                    <span className="text-sm font-medium">{formatDateOnly(tracking.estimatedInstallation)}</span>
                  </div>
                )}
                {tracking.actualInstallation && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Completed On</span>
                    <span className="text-sm font-medium text-green-600">{formatDateOnly(tracking.actualInstallation)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button className="flex-1 bg-orange-500 text-white py-3 px-6 rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center justify-center">
              <Phone className="h-4 w-4 mr-2" />
              Contact Support
            </button>
            {tracking.currentStatus === 'delivered' && (
              <button className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center justify-center">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Installation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function OrdersPage() {
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTracking, setSelectedTracking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const navigate = useNavigate();

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

  const handleViewDetails = (tracking) => {
    setSelectedTracking(tracking);
    setShowDetailModal(true);
  };

  const filteredTrackingData = trackingData.filter(tracking => {
    const matchesSearch = !searchTerm || 
      tracking.purchaseId?.purchaseID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tracking.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track your solar installation orders and shipments
              </p>
            </div>
            
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
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
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTrackingData.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {trackingData.length === 0 
                ? "You haven't placed any orders yet. Start shopping to see your orders here."
                : "No orders match your current search criteria. Try adjusting your filters."
              }
            </p>
            {trackingData.length === 0 && (
              <button 
                onClick={() => navigate('/dashboard/quotations')}
                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Products
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrackingData.map((tracking) => (
                <OrderTrackingCard
                  key={tracking._id}
                  tracking={tracking}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <TrackingDetailModal
        tracking={selectedTracking}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
} 