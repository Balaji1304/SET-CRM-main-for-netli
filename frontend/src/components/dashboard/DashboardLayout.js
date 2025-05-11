import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Menu, X } from 'lucide-react';
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
    // When opening the sidebar, prevent body scrolling to avoid sidebar cutoff issues
    if (!isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
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

      {/* Main Content with Mobile Sidebar */}
      <div className="flex-1 transition-all duration-300 ease-in-out">
        {/* Mobile Header - always visible */}
        <div className="md:hidden p-4 bg-white border-b flex items-center sticky top-0 z-30">
          <button
            onClick={toggleMobileSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Sidebar and Content Container */}
        <div className="md:hidden relative">
          {/* Mobile Sidebar - Slide in from left */}
          <div 
            className={`
              fixed top-0 left-0 h-screen w-64 bg-white shadow-lg overflow-hidden z-50
              transform transition-transform duration-300 ease-in-out
              ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            style={{ height: '100dvh' }} 
          >
            {/* Mobile Sidebar Close Button */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={toggleMobileSidebar}
                className="p-2 bg-white hover:bg-gray-100 rounded-full"
              >
                <X className="h-6 w-6 text-gray-700" />
              </button>
            </div>
            
            <AppSidebar
              isMobile={true}
              onItemClick={toggleMobileSidebar}
              onLogout={handleLogout}
            />
          </div>

          {/* Overlay to prevent interaction with background when sidebar is open */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-30 z-40"
              onClick={toggleMobileSidebar}
            />
          )}

          {/* Page Content - Push Right when Sidebar Opens */}
          <div 
            className={`
              w-full min-h-screen transition-transform duration-300 ease-in-out
              ${isMobileSidebarOpen ? 'transform translate-x-64' : 'transform translate-x-0'}
            `}
          >
            <div className="p-6 pt-4">
              <Outlet />
            </div>
          </div>
        </div>

        {/* Desktop Page Content */}
        <div className="hidden md:block">
          <main className="p-6">
            <Outlet />
          </main>
        </div>
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