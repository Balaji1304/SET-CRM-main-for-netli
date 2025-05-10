import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppSidebar } from './dashboard/AppSidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Clock, CheckCircle2, Star, Ticket } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isMainDashboard = location.pathname === '/dashboard';
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };
  
  const handleLogout = () => {
    setShowLogoutDialog(true);
  };
  
  const confirmLogout = () => {
    setShowLogoutDialog(false);
    logout();
  };

  const renderDashboardContent = () => {
    if (!isMainDashboard) return <Outlet />;
    
    return (
      <>
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
      </>
    );
  };

  return (
    <div className="min-h-screen bg-white relative flex">
      {/* Mobile Header - Only show on mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-input z-50 px-4">
        <div className="flex items-center justify-between h-full">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <div className="font-semibold text-lg">Solar CRM</div>
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            {user?.name?.charAt(0)}
          </div>
        </div>
      </header>

      {/* Desktop Layout */}
      <div className={`hidden lg:block w-${isCollapsed ? '16' : '64'} flex-shrink-0`}>
        <AppSidebar 
          isCollapsed={isCollapsed} 
          onToggle={toggleSidebar} 
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Navigation - Full Screen */}
      <div className={`
        lg:hidden fixed inset-0 bg-white z-50 
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Mobile Nav Header */}
          <div className="flex items-center justify-between p-4 border-b border-input">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{user?.name}</span>
                <span className="text-sm text-gray-500">{user?.role}</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
          
          {/* Mobile Navigation Content */}
          <div className="flex-1 overflow-y-auto">
            <AppSidebar 
              isMobile={true} 
              onItemClick={() => setSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 transition-all duration-300 ease-in-out pt-16 lg:pt-0 min-h-screen bg-white">
        <div className="max-w-7xl p-4 md:p-8">
          {isMainDashboard && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>
          )}
          {renderDashboardContent()}
        </div>
      </main>
      
      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
      />
    </div>
  );
};

export default Dashboard; 