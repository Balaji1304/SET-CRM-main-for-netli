import React from 'react';
import { 
  Settings, CheckCircle, Clock, AlertTriangle, 
  Star, TrendingUp, Calendar, Users 
} from 'lucide-react';

const ServiceMetricsCards = ({ data }) => {
  const { metrics, recentActivity } = data;

  const metricCards = [
    {
      title: 'Total Assigned Tasks',
      value: metrics.totalAssignedTasks,
      icon: Settings,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Completed Tasks',
      value: metrics.completedTasks,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Pending Tasks',
      value: metrics.pendingTasks,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      title: 'In Progress',
      value: metrics.inProgressTasks,
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'Completion Rate',
      value: `${metrics.completionRate}%`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Average Rating',
      value: metrics.averageRating ? `${metrics.averageRating.toFixed(1)}/5` : 'N/A',
      icon: Star,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      title: 'Completed This Month',
      value: metrics.completedThisMonth,
      icon: Calendar,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    },
    {
      title: 'Issues Reported',
      value: metrics.issuesReported,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-100`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    {card.title}
                  </p>
                  <p className={`text-lg sm:text-2xl lg:text-3xl font-bold ${card.textColor} mt-1`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              Recent Activity
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start gap-3 sm:gap-4">
                  <div className={`flex-shrink-0 w-2 h-2 sm:w-3 sm:h-3 rounded-full mt-2 ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'in_progress' ? 'bg-orange-500' :
                    'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.purchaseID}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {activity.customerName} • {activity.quotationNumber}
                        </p>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                          activity.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceMetricsCards;

