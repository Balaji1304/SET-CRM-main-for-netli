"use client"

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Users,
  FileText,
  LogOut,
  Bell,
  BarChart,
  Ticket,
  Calendar,
  Wrench,
  Home,
  BookOpen,
  BarChart2,
  UserPlus,
  CreditCard,
  Package,
  ShoppingBag,
  Bell as BellIcon,
  Settings,
  Plus,
  ChevronRight
} from 'lucide-react';

// Custom styles for mobile sidebar
const mobileStyles = `
  .mobile-sidebar-item {
    transition: all 0.2s ease-in-out;
  }
  
  .mobile-sidebar-item:hover {
    transform: translateX(4px);
  }
  
  .mobile-sidebar-item.active {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
  }
  
  .mobile-profile-gradient {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  }
  
  .mobile-nav-separator {
    background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);
  }
  
  /* Ensure proper mobile viewport height handling */
  .mobile-sidebar-container {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height for better mobile support */
  }
  
  /* Add safe area padding for mobile devices with notches */
  @supports (padding: max(0px)) {
    .mobile-bottom-section {
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
    }
  }
`;

const getNavigation = (userRole) => {
  // Common items for all roles
  const commonItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home }
  ];
  
  // Bottom items common for all roles
  const bottomItems = [
    { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart2 }
  ];
   
  // Role-specific items
  const roleSpecificItems = {
    customer: [
      { name: 'Payment & Billing', href: '/dashboard/payments', icon: CreditCard },
      { name: 'Track Orders', href: '/dashboard/orders', icon: Package },
      { name: 'My Orders', href: '/dashboard/my-products', icon: ShoppingBag },
      { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
      { name: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
    ],
    sales_person: [
      { name: 'Leads', href: '/dashboard/leads', icon: Users },
      { name: 'Quotations', href: '/dashboard/quotations', icon: FileText },
    ],
    front_office_executive: [
      { name: 'New Enquiry', href: '/dashboard/enquiry', icon: UserPlus },
      { name: 'Lead Assignment', href: '/dashboard/lead-assignment', icon: Users },
    ],
    sales_head: [
      { name: 'Leads', href: '/dashboard/leads', icon: Users },
      { name: 'Quotations', href: '/dashboard/quotations', icon: FileText },
      { name: 'Packages', href: '/dashboard/packages', icon: Plus },
    ],
    accounts_department: [
      { name: 'Pending Approvals', href: '/dashboard/quotations/pending-approvals', icon: FileText },
      { name: 'Approved Payments', href: '/dashboard/quotations/approved-payments', icon: CreditCard },
    ],
    product_head: [
      { name: 'Products', href: '/dashboard/products', icon: Box },
      { name: 'Product Bundles', href: '/dashboard/bundles', icon: Package },
      { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingBag },
      { name: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
      { name: 'Tickets Queue', href: '/dashboard/ticket-queue', icon: Ticket },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
    marketing_coordinator: [
      { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingBag },
    ],
    service_engineer: [
      { name: 'Installations', href: '/dashboard/installations', icon: Settings },
      { name: 'Service Customers', href: '/dashboard/service-customers', icon: Users },
      { name: 'Cases', href: '/dashboard/cases', icon: Ticket },
      { name: 'Service', href: '/dashboard/service', icon: Wrench },
      { name: 'Performance', href: '/dashboard/performance', icon: BarChart },
    ],
    // NOTE: accounts_department is defined above to include both pages
  };

  // For customer role, don't include Reports in bottom items
  if (userRole === 'customer') {
    bottomItems.pop();
  }

  return [
    {
      title: '',
      items: [...commonItems, ...(roleSpecificItems[userRole] || []), ...bottomItems]
    }
  ];
};

const AppSidebar = ({ onItemClick = () => {}, isMobile = false, onLogout = () => {} }) => {
  const { user, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = React.useState(false); // Manages hover state for desktop sidebar

  const navigation = getNavigation(user?.role);

  const handleItemClick = (item) => {
    if (isMobile && onItemClick && typeof onItemClick === 'function') {
      onItemClick(); // Close mobile drawer
    }
    navigate(item.href);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout(); // Use provided onLogout if available (e.g., for mobile)
    } else {
      authLogout();
    }
  };

  // Determine collapsed state: only for desktop and when not hovered
  const isEffectivelyCollapsed = !isMobile && !isHovered;

  if (isMobile) {
    // Modern Mobile Sidebar Design
    return (
      <>
        <style>{mobileStyles}</style>
        <div className="mobile-sidebar-container bg-white flex flex-col">
          {/* Modern Header Section */}
          <div className="relative overflow-hidden shrink-0">
            {/* Background Gradient */}
            <div className="mobile-profile-gradient p-6 pb-8">
              <div className="flex items-center space-x-4">
                {/* Modern Avatar */}
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-white truncate">
                    {user?.name || 'User Name'}
                  </h2>
                  <p className="text-orange-100 text-sm font-medium capitalize">
                    {(user?.role?.replace('_', ' ') || 'User Role').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Decorative Wave */}
            <div className="absolute bottom-0 left-0 right-0 h-4">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full">
                <path 
                  d="M0,60 C120,30 240,90 360,60 C480,30 600,90 720,60 C840,30 960,90 1080,60 C1140,45 1170,37.5 1200,30 L1200,120 L0,120 Z" 
                  fill="white"
                />
              </svg>
            </div>
          </div>
          
          {/* Navigation Section - This will scroll */}
          <div className="flex-1 px-4 py-2 overflow-y-auto min-h-0">
            <nav className="space-y-1">
              {navigation.flatMap(section => 
                section.items.map((item, index) => {
                  const isActive = 
                    location.pathname === item.href || 
                    (item.href === '/dashboard/quotations' && 
                     (location.pathname === '/dashboard/quotations/create' || 
                      location.pathname.startsWith('/dashboard/quotations/'))) ||
                    (item.href === '/dashboard/leads' && 
                     (location.pathname.startsWith('/dashboard/edit-lead/') ||
                      location.pathname === '/dashboard/add-lead')) ||
                    (item.href === '/dashboard/products' && location.pathname.startsWith('/dashboard/products/')) ||
                    (item.href === '/dashboard/schedule' && location.pathname.startsWith('/dashboard/schedule/'));
                  
                  return (
                    <Link
                      key={`${item.name}-${index}`}
                      to={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleItemClick(item);
                      }}
                      className={`
                        mobile-sidebar-item group flex items-center justify-between 
                        rounded-xl py-3.5 px-4 mb-1
                        ${isActive
                          ? 'active text-white shadow-lg' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                        transition-all duration-200 ease-in-out
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          p-2 rounded-lg transition-all duration-200
                          ${isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600'}
                        `}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      
                      {!isActive && (
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                      )}
                    </Link>
                  );
                })
              )}
            </nav>
          </div>
          
          {/* Bottom Section - Always Visible */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 mobile-bottom-section">
            {/* Settings Button */}
            <div className="px-4 pt-3 pb-1">
              <Link
                to="/dashboard/settings"
                onClick={(e) => {
                  e.preventDefault();
                  handleItemClick({ href: '/dashboard/settings' });
                }}
                className="mobile-sidebar-item group flex items-center justify-between rounded-xl py-3.5 px-4 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 ease-in-out"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600 transition-all duration-200">
                    <Settings className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Settings</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
              </Link>
            </div>
            
            {/* Logout Button */}
            <div className="px-4 pb-4 pt-1">
              <button
                onClick={handleLogout}
                className="mobile-sidebar-item group flex items-center justify-between w-full rounded-xl py-3.5 px-4 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 ease-in-out"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200 transition-all duration-200">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Sign Out</span>
                </div>
                <ChevronRight className="h-4 w-4 text-red-400 group-hover:text-red-600 transition-colors duration-200" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop view - Redesigned
  return (
    <div
      className={`fixed top-0 left-0 h-screen bg-slate-800 text-white flex flex-col z-50 transition-all duration-300 ease-in-out ${isEffectivelyCollapsed ? 'w-20' : 'w-60'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Company Logo Section - REMOVED AS PER REQUEST
      <div className={`h-20 flex items-center justify-center px-4 border-b border-slate-700 shrink-0`}>
        {isEffectivelyCollapsed ? (
          <img src="https://res.cloudinary.com/dcua87ney/image/upload/v1747940426/set-logo.9fc3ca1f3b1472eaca1d_mmqwnt.png" alt="SET" className="h-10 w-auto" /> // Smaller logo when collapsed
        ) : (
          <img src="https://res.cloudinary.com/dcua87ney/image/upload/v1747940426/set-logo.9fc3ca1f3b1472eaca1d_mmqwnt.png" alt="Company Logo" className="h-16 w-auto" />
        )}
      </div>
      */}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {navigation.map((section) => (
          <div key={section.title || 'main-nav-section'} className="mb-2">
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = 
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href)) || // General parent route check
                  (item.href === '/dashboard/quotations' && 
                   (location.pathname === '/dashboard/quotations/create' || 
                    location.pathname.startsWith('/dashboard/quotations/view/'))) ||
                  (item.href === '/dashboard/leads' && 
                   (location.pathname.startsWith('/dashboard/edit-lead/') ||
                    location.pathname === '/dashboard/add-lead')) ||
                  (item.href === '/dashboard/products' && location.pathname.startsWith('/dashboard/products/')) ||
                  (item.href === '/dashboard/schedule' && location.pathname.startsWith('/dashboard/schedule/'));
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleItemClick(item);
                    }}
                    className={`
                      flex items-center rounded-md py-2.5 text-sm font-medium 
                      transition-all duration-300 ease-in-out
                      hover:bg-slate-700 group
                      ${isActive ? 'bg-slate-600 text-white' : 'text-slate-300 hover:text-white'}
                      pl-[18px]
                      ${isEffectivelyCollapsed ? 'pr-[18px]' : 'pr-3'}
                    `}
                    title={item.name}
                  >
                    <item.icon className={`h-5 w-5 shrink-0`} />
                    <span className={`
                      leading-tight whitespace-nowrap overflow-hidden text-ellipsis
                      transition-all duration-300 ease-in-out
                      ${isEffectivelyCollapsed ? 'opacity-0 max-w-0 ml-3' : 'opacity-100 max-w-full ml-3'}
                    `}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings Button */}
      <div className="px-3 py-2 border-t border-slate-700 shrink-0">
        <button
          onClick={() => {
            navigate('/dashboard/settings');
          }}
          className={`
            flex items-center w-full rounded-md py-2.5 text-sm text-slate-300 
            transition-all duration-300 ease-in-out
            hover:bg-slate-700 hover:text-white group
            pl-[18px]
            ${isEffectivelyCollapsed ? 'pr-[18px]' : 'pr-3'}
          `}
          title="Settings"
        >
          <Settings className={`h-5 w-5 shrink-0`} />
          <span className={`
            leading-tight whitespace-nowrap
            transition-all duration-300 ease-in-out
            ${isEffectivelyCollapsed ? 'opacity-0 max-w-0 ml-3' : 'opacity-100 max-w-full ml-3'}
          `}>
            Settings
          </span>
        </button>
      </div>

      {/* Logout Button */}
      <div className="px-3 py-1 pb-2 shrink-0">
        <button
          onClick={() => {
            handleLogout();
          }}
          className={`
            flex items-center w-full rounded-md py-2.5 text-sm text-slate-300 
            transition-all duration-300 ease-in-out
            hover:bg-slate-700 hover:text-white group
            pl-[18px]
            ${isEffectivelyCollapsed ? 'pr-[18px]' : 'pr-3'}
          `}
          title="Logout"
        >
          <LogOut className={`h-5 w-5 shrink-0`} />
          <span className={`
            leading-tight whitespace-nowrap
            transition-all duration-300 ease-in-out
            ${isEffectivelyCollapsed ? 'opacity-0 max-w-0 ml-3' : 'opacity-100 max-w-full ml-3'}
          `}>
            Logout
          </span>
        </button>
      </div>

      {/* Profile Section */}
      <div className="border-t border-slate-700 shrink-0 h-[76px] px-3 flex items-center">
        <div // Interactive row for profile (avatar + text)
          className={`flex items-center w-full 
                      transition-all duration-300 ease-in-out
                      pl-[10px]
                      ${isEffectivelyCollapsed ? 'pr-[10px]' : 'pr-3'}
                     `}
        >
          <div 
            className={`h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-base font-semibold shrink-0 cursor-pointer`}
            onClick={() => !isEffectivelyCollapsed && navigate('/dashboard/settings')}
            title={isEffectivelyCollapsed ? (user?.name || 'User Profile') : 'View Profile / Settings'}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className={`
            flex flex-col items-start overflow-hidden min-w-0
            transition-all duration-300 ease-in-out
            ${isEffectivelyCollapsed ? 'opacity-0 max-w-0 ml-3' : 'opacity-100 max-w-full ml-3'}
          `}>
            <span 
              className="font-medium text-sm leading-tight whitespace-nowrap truncate w-full" 
              title={user?.name || 'User Name'}
            >
              {user?.name || 'User Name'}
            </span>
            <span 
              className="text-xs text-slate-400 leading-tight whitespace-nowrap truncate w-full" 
              title={(user?.role?.replace('_', ' ') || 'User Role').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            >
              {(user?.role?.replace('_', ' ') || 'User Role').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AppSidebar }; 