import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Menu, X } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = () => {
  const { logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
    <div className="min-h-screen bg-tertiary flex overflow-x-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block flex-shrink-0`}>
        <AppSidebar
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content with Mobile Sidebar */}
      <div className="flex-1 transition-all duration-300 ease-in-out md:ml-20">
        {/* Mobile Header - Fixed at top */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-tertiary border-b border-fourth shadow-sm flex items-center justify-between p-4 z-30">
          <button
            onClick={toggleMobileSidebar}
            className="mobile-action-btn hover:bg-fourth text-secondary transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <h1 className="mobile-text-lg font-semibold text-secondary">Sunlit CRM</h1>
          
          {/* Empty div to balance the layout */}
          <div className="w-11"></div>
        </div>

        {/* Mobile Sidebar and Content Container */}
        <div className="md:hidden relative">
          {/* Mobile Sidebar - Slide in from left */}
          <div 
            className={`
              fixed top-0 left-0 h-screen w-64 bg-tertiary shadow-lg z-50 flex flex-col
              transform transition-transform duration-300 ease-in-out
              ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            style={{ height: '100dvh' }} 
          >
            {/* Mobile Sidebar Header with App Name and Close Button */}
            <div className="flex items-center justify-between p-4 border-b border-fourth flex-shrink-0">
              <h1 className="mobile-text-lg font-bold text-primary">Sunlit CRM</h1>
              <button
                onClick={toggleMobileSidebar}
                className="mobile-action-btn hover:bg-fourth text-secondary transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* AppSidebar with flex-1 to take remaining space */}
            <div className="flex-1 overflow-hidden">
              <AppSidebar
                isMobile={true}
                onItemClick={toggleMobileSidebar}
                onLogout={handleLogout}
              />
            </div>
          </div>

          {/* Overlay to prevent interaction with background when sidebar is open */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-30 z-40"
              onClick={toggleMobileSidebar}
            />
          )}

          {/* Page Content - Push Right when Sidebar Opens and add top padding for fixed header */}
          <div 
            className={`
              w-full min-h-screen pt-16 transition-transform duration-300 ease-in-out
              ${isMobileSidebarOpen ? 'transform translate-x-64' : 'transform translate-x-0'}
            `}
          >
            <div className="p-4 sm:p-6 md:p-8 lg:p-10">
              <Outlet />
            </div>
          </div>
        </div>

        {/* Desktop Page Content */}
        <div className="hidden md:block w-full">
          <div className="p-4 sm:p-6 md:p-8 lg:p-10">
            <Outlet />
          </div>
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