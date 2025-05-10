import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Menu } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';

const DashboardLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };
  
  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block flex-shrink-0 w-${isSidebarCollapsed ? '16' : '64'}`}>
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={toggleMobileSidebar}
          />
          <div className="relative w-64 h-full">
            <AppSidebar
              isMobile={true}
              onItemClick={toggleMobileSidebar}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden p-4 bg-white border-b flex items-center">
          <button
            onClick={toggleMobileSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={() => {
          setShowLogoutDialog(false);
          // You'll need to access logout from auth context here
          // For now we'll close this dialog and let AppSidebar handle it
        }}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
      />
    </div>
  );
};

export default DashboardLayout; 