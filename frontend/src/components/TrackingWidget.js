import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { getMyOrderTracking } from '../services/trackingService';
import { STATUS_LABELS, PHASE_COLORS, PHASE_LABELS } from '../services/trackingService';
import { formatNumber } from '../utils/formatNumber';

const TrackingWidget = () => {
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecentOrders();
  }, []);

  const loadRecentOrders = async () => {
    try {
      setLoading(true);
      const response = await getMyOrderTracking();
      // Get the 3 most recent orders
      setRecentOrders((response.data || []).slice(0, 3));
    } catch (error) {
      console.error('Error loading recent orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getPhaseIcon = (phase) => {
    const icons = {
      'processing': Package,
      'packaging': Package,
      'shipping': Truck,
      'installation': CheckCircle,
      'completed': CheckCircle,
      'issues': AlertCircle
    };
    const Icon = icons[phase] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
        </div>
        <div className="text-center py-4">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={loadRecentOrders}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
        <button
          onClick={() => navigate('/dashboard/orders')}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
        >
          <span>View All</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {recentOrders.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No orders found</p>
          <p className="text-xs text-gray-500 mt-1">Your recent orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div key={order._id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded ${PHASE_COLORS[order.currentPhase] || 'bg-gray-400'} text-white`}>
                    {getPhaseIcon(order.currentPhase)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">
                      {order.purchaseId?.purchaseID || 'N/A'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      ₹{formatNumber(order.purchaseId?.totalAmount || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">
                    {PHASE_LABELS[order.currentPhase] || order.currentPhase}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.progressPercentage}% complete
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${PHASE_COLORS[order.currentPhase] || 'bg-gray-400'}`}
                    style={{ width: `${order.progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Key Date */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Ordered: {formatDate(order.purchaseId?.createdAt)}</span>
                {order.estimatedDelivery && (
                  <span>Est. Delivery: {formatDate(order.estimatedDelivery)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrackingWidget;
