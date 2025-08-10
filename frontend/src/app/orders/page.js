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
  Filter,
  Eye,
  Calendar,
  User,
  Phone
} from 'lucide-react';
import { getMyOrderTracking } from '../../services/trackingService';
import { STATUS_LABELS, PHASE_LABELS, STATUS_COLORS, PHASE_COLORS } from '../../services/trackingService';
import { formatNumber } from '../../utils/formatNumber';

const OrderTrackingCard = ({ tracking, onViewDetails }) => {
  const getPhaseIcon = (phase) => {
    const icons = {
      'processing': Package,
      'packaging': Package,
      'shipping': Truck,
      'installation': User,
      'completed': CheckCircle,
      'issues': AlertCircle
    };
    const Icon = icons[phase] || Package;
    return <Icon className="h-5 w-5" />;
  };

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {tracking.purchaseId?.purchaseID || 'N/A'}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[tracking.currentStatus] || 'bg-gray-100 text-gray-800'}`}>
              {STATUS_LABELS[tracking.currentStatus] || tracking.currentStatus}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Tracking: {tracking.trackingNumber}
          </p>
          <p className="text-sm text-gray-500">
            Amount: ₹{formatNumber(tracking.purchaseId?.totalAmount || 0)}
          </p>
        </div>
        <button
          onClick={() => onViewDetails(tracking)}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <Eye className="h-4 w-4" />
          <span>View Details</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {PHASE_LABELS[tracking.currentPhase] || tracking.currentPhase}
          </span>
          <span className="text-sm text-gray-500">
            {tracking.progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${PHASE_COLORS[tracking.currentPhase] || 'bg-gray-400'}`}
            style={{ width: `${tracking.progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Key Dates */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-gray-500">Ordered</p>
            <p className="font-medium">
              {formatDate(tracking.purchaseId?.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Truck className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-gray-500">Est. Delivery</p>
            <p className="font-medium">
              {formatDate(tracking.estimatedDelivery)}
            </p>
          </div>
        </div>
      </div>

      {/* Installation Date if available */}
      {tracking.estimatedInstallation && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-500">Est. Installation</p>
              <p className="font-medium">
                {formatDate(tracking.estimatedInstallation)}
              </p>
            </div>
          </div>
        </div>
      )}
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

  const getStatusIcon = (status) => {
    const icons = {
      'order_placed': Package,
      'payment_confirmed': CheckCircle,
      'dispatched': Truck,
      'delivered': MapPin,
      'installation_completed': CheckCircle,
      'order_completed': CheckCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Order Tracking - {tracking.purchaseId?.purchaseID}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Tracking Number: {tracking.trackingNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress Overview */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Current Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phase</span>
                    <span className="text-sm font-medium">
                      {PHASE_LABELS[tracking.currentPhase]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium">
                      {tracking.progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${PHASE_COLORS[tracking.currentPhase]}`}
                      style={{ width: `${tracking.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Key Milestones */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Key Milestones</h4>
                <div className="space-y-3 text-sm">
                  {Object.entries(tracking.milestones || {}).map(([key, date]) => {
                    if (!date) return null;
                    const labels = {
                      orderPlaced: 'Order Placed',
                      paymentConfirmed: 'Payment Confirmed',
                      orderApproved: 'Order Approved',
                      packageReady: 'Package Ready',
                      dispatched: 'Dispatched',
                      delivered: 'Delivered',
                      installationCompleted: 'Installation Completed',
                      orderCompleted: 'Order Completed'
                    };
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-gray-600">{labels[key]}</span>
                        <span className="font-medium">
                          {new Date(date).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="lg:col-span-2">
              <h4 className="font-medium text-gray-900 mb-4">Order Timeline</h4>
              <div className="space-y-4">
                {tracking.events?.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-600'}`}>
                      {getStatusIcon(event.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(event.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {event.description}
                      </p>
                      {event.location && (
                        <div className="flex items-center space-x-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-500">{event.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Track Orders</h2>
          <p className="text-gray-600 mt-1">Track your order status and shipments</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Phases</option>
            <option value="processing">Processing</option>
            <option value="packaging">Packaging</option>
            <option value="shipping">Shipping</option>
            <option value="installation">Installation</option>
            <option value="completed">Completed</option>
            <option value="issues">Issues</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 overflow-hidden">
        {filteredTrackingData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-600">
                {trackingData.length === 0 
                  ? "You haven't placed any orders yet."
                  : "No orders match your current filters."
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTrackingData.map((tracking) => (
                <OrderTrackingCard
                  key={tracking._id}
                  tracking={tracking}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </div>
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