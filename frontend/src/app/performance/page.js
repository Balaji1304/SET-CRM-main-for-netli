import React from 'react';
import { BarChart2, Clock, CheckCircle2, Star } from 'lucide-react';

const PerformancePage = () => {
  const performanceMetrics = [
    {
      title: "Tickets Resolved",
      value: "156",
      change: "+12% from last month",
      icon: CheckCircle2,
    },
    {
      title: "Average Response Time",
      value: "2.5h",
      change: "-30min from last month",
      icon: Clock,
    },
    {
      title: "Customer Satisfaction",
      value: "4.8",
      change: "+0.2 from last month",
      icon: Star,
    },
    {
      title: "Efficiency Rate",
      value: "92%",
      change: "+5% from last month",
      icon: BarChart2,
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Performance</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {performanceMetrics.map((metric) => (
          <div key={metric.title} className="rounded-lg border bg-white p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-600">{metric.title}</p>
              <metric.icon className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-gray-500">{metric.change}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Performance Chart */}
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-lg font-semibold mb-4">Monthly Performance</h3>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            Performance chart will be added here
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-lg font-semibold mb-4">Performance Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ticket Resolution Rate</span>
              <span className="text-sm font-medium">92%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">First Response Time</span>
              <span className="text-sm font-medium">15 mins</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Resolution Time</span>
              <span className="text-sm font-medium">2.5 hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Customer Feedback Score</span>
              <span className="text-sm font-medium">4.8/5.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage; 