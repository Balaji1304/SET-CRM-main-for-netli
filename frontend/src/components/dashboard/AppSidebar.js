"use client"

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBadge from '../NotificationBadge';
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
  ChevronRight,
  UserCheck
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
    height: 100%;
  }
  
  /* Add safe area padding for mobile devices with notches */
  @supports (padding: max(0px)) {
    .mobile-bottom-section {
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
    }
  }
  
  /* Ensure logout button is always visible */
  .mobile-logout-button {
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
  }
  
  .mobile-logout-button:hover {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
    transform: translateY(-1px);
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
      { name: 'Customers', href: '/dashboard/customers', icon: UserCheck },
      { name: 'Sales Reports', href: '/dashboard/sales-reports', icon: BarChart },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
    front_office_executive: [
      { name: 'Enquiries', href: '/dashboard/enquiries', icon: Users },
      { name: 'Tickets Queue', href: '/dashboard/ticket-queue', icon: Ticket },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
    sales_head: [
      { name: 'Leads', href: '/dashboard/leads', icon: Users },
      { name: 'Quotations', href: '/dashboard/quotations', icon: FileText },
      { name: 'Customers', href: '/dashboard/customers', icon: UserCheck },
      { name: 'Sales Reports', href: '/dashboard/sales-reports', icon: BarChart },
      { name: 'Packages', href: '/dashboard/packages', icon: Plus },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
    accounts_department: [
      { name: 'Pending Approvals', href: '/dashboard/quotations/pending-approvals', icon: FileText },
      { name: 'Approved Payments', href: '/dashboard/quotations/approved-payments', icon: CreditCard },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
    product_head: [
      { name: 'Products', href: '/dashboard/products', icon: Box },
      { name: 'Solar Power Plant Systems', href: '/dashboard/bundles', icon: Package },
      { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingBag },
      { name: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
      { name: 'Service Reports', href: '/dashboard/service-reports', icon: BarChart2 },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
    marketing_coordinator: [
      { name: 'Leads', href: '/dashboard/leads', icon: Users },
      { name: 'Quotations', href: '/dashboard/quotations', icon: FileText },
      { name: 'Customers', href: '/dashboard/customers', icon: UserCheck },
      { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingBag },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
    service_engineer: [
      { name: 'Installations', href: '/dashboard/installations', icon: Settings },
      { name: 'Service Customers', href: '/dashboard/service-customers', icon: Users },
      { name: 'Cases', href: '/dashboard/cases', icon: Ticket },
      { name: 'Service', href: '/dashboard/service', icon: Wrench },
      { name: 'Performance', href: '/dashboard/performance', icon: BarChart },
      { name: 'Service Reports', href: '/dashboard/service-reports', icon: BarChart2 },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
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
        <div className="h-full bg-white flex flex-col">
          {/* Modern Header Section */}
          <div className="relative overflow-hidden flex-shrink-0">
            {/* Background Gradient */}
            <div className="mobile-profile-gradient p-4 pb-6">
              <div className="flex items-center space-x-3">
                {/* Modern Avatar */}
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg">
                    <span className="text-lg font-bold text-white">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white truncate">
                    {user?.name || 'User Name'}
                  </h2>
                  <p className="text-orange-100 text-xs font-medium capitalize">
                    {(user?.role?.replace('_', ' ') || 'User Role').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Decorative Wave */}
            <div className="absolute bottom-0 left-0 right-0 h-3">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full">
                <path 
                  d="M0,60 C120,30 240,90 360,60 C480,30 600,90 720,60 C840,30 960,90 1080,60 C1140,45 1170,37.5 1200,30 L1200,120 L0,120 Z" 
                  fill="white"
                />
              </svg>
            </div>
          </div>
          
          {/* Navigation Section - This will scroll */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <nav className="px-4 py-2 space-y-1">
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
                        rounded-xl py-3 px-3 mb-1 touch-target
                        ${isActive
                          ? 'active text-white shadow-lg' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                        transition-all duration-200 ease-in-out
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          p-1.5 rounded-lg transition-all duration-200 relative
                          ${isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600'}
                        `}>
                          <item.icon className="h-4 w-4" />
                          {item.name === 'Notifications' && <NotificationBadge />}
                        </div>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      
                      {!isActive && (
                        <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                      )}
                    </Link>
                  );
                })
              )}
            </nav>
          </div>
          
          {/* Bottom Section - Always Visible */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 mobile-bottom-section">
            {/* Settings and Logout Buttons Container */}
            <div className="px-4 py-3 space-y-2">
              {/* Settings Button */}
              <Link
                to="/dashboard/settings"
                onClick={(e) => {
                  e.preventDefault();
                  handleItemClick({ href: '/dashboard/settings' });
                }}
                className="mobile-sidebar-item group flex items-center justify-between rounded-xl py-3 px-3 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 ease-in-out touch-target"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600 transition-all duration-200">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Settings</span>
                </div>
                <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
              </Link>
              
              {/* Logout Button - More Prominent */}
              <button
                onClick={onLogout}
                className="mobile-sidebar-item mobile-logout-button group flex items-center justify-between w-full rounded-xl py-3 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 ease-in-out border border-red-200 hover:border-red-300 touch-target"
                style={{ minHeight: '48px' }}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200 transition-all duration-200">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">Sign Out</span>
                </div>
                <ChevronRight className="h-3 w-3 text-red-400 group-hover:text-red-600 transition-colors duration-200" />
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
      {/* Company Branding Section */}
      <div className="border-b border-slate-700 shrink-0 px-3 py-4 relative">
        <div className="relative h-10">
          {/* Company Logo - Fixed Position */}
          <div className="absolute left-2 top-0 w-10 h-10 flex-shrink-0">
            <img 
              src={process.env.REACT_APP_COMPANY_LOGO_URL} 
              alt="Sunlit Systems Logo" 
              className="w-full h-full object-contain rounded-lg bg-white p-1"
              onError={(e) => {
                // Fallback to a generic icon if logo fails to load
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            {/* Fallback icon */}
            <div className="w-full h-full bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg hidden">
              S
            </div>
          </div>
          
          {/* Company Name - Appears beside logo */}
          <div className={`
            absolute left-14 top-0 h-10 flex flex-col justify-center overflow-hidden
            transition-opacity duration-300 ease-in-out
            ${isEffectivelyCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
          `}>
            <span className="font-bold text-base leading-tight whitespace-nowrap text-white">
              Sunlit Systems
            </span>
            <span className="text-xs text-slate-400 leading-tight whitespace-nowrap">
              CRM Dashboard
            </span>
          </div>
        </div>
      </div>

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
                    <div className="relative">
                      <item.icon className={`h-5 w-5 shrink-0`} />
                      {item.name === 'Notifications' && <NotificationBadge />}
                    </div>
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