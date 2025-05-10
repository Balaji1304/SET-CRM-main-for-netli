import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Clock, CheckCircle2, Ticket } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">123</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Pending Tickets</p>
              <p className="text-2xl font-bold">5</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">$12,345</p>
            </div>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm font-medium">New Order Received</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
              <div className="border-b pb-3">
                <p className="text-sm font-medium">Customer Meeting Scheduled</p>
                <p className="text-xs text-gray-500">5 hours ago</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Performance</h3>
              <CheckCircle2 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tasks Completed</span>
                <span className="text-sm font-medium">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Customer Satisfaction</span>
                <span className="text-sm font-medium">4.8/5.0</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Support Tickets</h3>
              <Ticket className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Open Tickets</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Response Time</span>
                <span className="text-sm font-medium">2h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 