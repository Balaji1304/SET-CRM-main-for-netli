import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AppSidebar } from './dashboard/AppSidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { Clock, CheckCircle2, Star, Ticket } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isMainDashboard = location.pathname === '/dashboard';

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <div className="flex flex-col h-screen p-4 md:p-8 pt-6">
          {isMainDashboard ? (
            <>
              <div className="flex items-center justify-between space-y-2 mb-6">
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
                <div className="rounded-lg border bg-card p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                    <div className="text-2xl font-bold">1,234</div>
                    <p className="text-xs text-muted-foreground">+20% from last month</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">In-stock Products</p>
                    <div className="text-2xl font-bold">1,000</div>
                    <p className="text-xs text-muted-foreground">80% of total products</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Out-of-stock Products</p>
                    <div className="text-2xl font-bold">234</div>
                    <p className="text-xs text-muted-foreground">20% of total products</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Pending Restocks</p>
                    <div className="text-2xl font-bold">45</div>
                    <p className="text-xs text-muted-foreground">Expected within 7 days</p>
                  </div>
                </div>
              </div>
              <div className="h-[200px] rounded-lg border bg-card p-4">
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Chart will be added here
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-semibold mb-6">Service Engineer Overview</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="rounded-lg border bg-white p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                      <Ticket className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">24</div>
                    <p className="text-xs text-gray-500">+2 from yesterday</p>
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-600">Response Time</p>
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">2h</div>
                    <p className="text-xs text-gray-500">Average response time</p>
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-600">Customer Rating</p>
                      <Star className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">4.8</div>
                    <p className="text-xs text-gray-500">+0.2 from last week</p>
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-600">Resolved Tickets</p>
                      <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">18</div>
                    <p className="text-xs text-gray-500">75% resolution rate</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-7">
                  <div className="md:col-span-4 rounded-lg border bg-white p-4">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold">Recent Activity</h4>
                      <p className="text-sm text-gray-500">Your activity over the last 30 days</p>
                    </div>
                    <div className="h-[200px] flex items-center justify-center text-gray-400">
                      Activity chart will be added here
                    </div>
                  </div>

                  <div className="md:col-span-3 rounded-lg border bg-white p-4">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold">Upcoming Tasks</h4>
                      <p className="text-sm text-gray-500">You have 6 tasks scheduled</p>
                    </div>
                    <div className="space-y-4">
                      <div className="border-b pb-3">
                        <p className="text-sm font-medium">Site Visit: Solar Panel Installation</p>
                        <p className="text-sm text-gray-500">Today, 2:00 PM</p>
                      </div>
                      <div className="border-b pb-3">
                        <p className="text-sm font-medium">Maintenance Check</p>
                        <p className="text-sm text-gray-500">Tomorrow, 10:00 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 