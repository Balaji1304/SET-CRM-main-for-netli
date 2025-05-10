import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Menu } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = () => {
  const { logout } = useAuth();
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

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    logout(); // This will use the logout function from AuthContext
  };

  return (
    <div className="min-h-screen bg-gray-100 flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block flex-shrink-0 w-${isSidebarCollapsed ? '16' : '64'} transition-all duration-300 ease-in-out`}>
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
      <div className="flex-1 transition-all duration-300 ease-in-out">
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
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
      />
    </div>
  );
};

export default DashboardLayout; 