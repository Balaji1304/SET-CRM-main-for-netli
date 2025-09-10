import React from 'react';
import {
  Users,
  FileText,
  IndianRupee,
  TrendingUp,
  BarChart3,
  Clock
} from 'lucide-react';

import { formatCurrency, formatNumber, formatPercentage } from '../../services/salesReportsService';

const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-2.5 sm:p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-xs sm:text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${!trend.positive ? 'transform rotate-180' : ''}`} />
              {trend.value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SalesMetricsCards = ({ data, period }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 animate-pulse">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-gray-200 w-10 h-10 sm:w-12 sm:h-12"></div>
              <div className="ml-4 flex-1">
                <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-2.5 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { thisMonth, performance } = data;

  // Calculate trends (you would get this from comparing with previous period)
  const trends = {
    leads: { positive: true, value: '+12.5%' },
    quotations: { positive: true, value: '+8.3%' },
    sales: { positive: false, value: '-3.2%' },
    revenue: { positive: true, value: '+15.7%' },
    conversionRate: { positive: true, value: '+2.1%' },
    quotationSuccess: { positive: false, value: '-1.5%' }
  };

  const metrics = [
    {
      title: 'Total Leads',
      value: formatNumber(thisMonth?.leads || 0),
      subtitle: `This ${period?.type || 'month'}`,
      icon: Users,
      trend: trends.leads,
      color: 'blue'
    },
    {
      title: 'Quotations',
      value: formatNumber(thisMonth?.quotations || 0),
      subtitle: 'Generated this period',
      icon: FileText,
      trend: trends.quotations,
      color: 'purple'
    },
    {
      title: 'Sales Closed',
      value: formatNumber(thisMonth?.sales || 0),
      subtitle: 'Successful conversions',
      icon: BarChart3,
      trend: trends.sales,
      color: 'green'
    },
    {
      title: 'Revenue',
      value: formatCurrency(thisMonth?.revenue || 0),
      subtitle: 'Total revenue generated',
      icon: IndianRupee,
      trend: trends.revenue,
      color: 'green'
    },
    {
      title: 'Conversion Rate',
      value: formatPercentage(performance?.conversionRate || 0),
      subtitle: 'Lead to sales conversion',
      icon: TrendingUp,
      trend: trends.conversionRate,
      color: 'yellow'
    },
    {
      title: 'Quotation Success',
      value: formatPercentage(performance?.quotationSuccessRate || 0),
      subtitle: 'Quotation approval rate',
      icon: Clock,
      trend: trends.quotationSuccess,
      color: 'indigo'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          subtitle={metric.subtitle}
          icon={metric.icon}
          trend={metric.trend}
          color={metric.color}
        />
      ))}
    </div>
  );
};

export default SalesMetricsCards;
