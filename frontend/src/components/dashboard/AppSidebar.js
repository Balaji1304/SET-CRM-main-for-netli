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
  Plus
} from 'lucide-react';

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
    inventory_manager: [
      { name: 'Products', href: '/dashboard/products', icon: Box },
      { name: 'Add Product', href: '/dashboard/products/add', icon: Plus },
      { name: 'Product Bundles', href: '/dashboard/bundles', icon: Package },
    ],
    sales_head: [
      { name: 'Leads', href: '/dashboard/leads', icon: Users },
      { name: 'Quotations', href: '/dashboard/quotations', icon: FileText },
      { name: 'Packages', href: '/dashboard/packages', icon: Plus },
    ],
    product_head: [
      { name: 'Products', href: '/dashboard/products', icon: Box },
      { name: 'Product Bundles', href: '/dashboard/bundles', icon: Package },
      { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
      { name: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
    service_engineer: [
      { name: 'Service Customers', href: '/dashboard/service-customers', icon: Users },
      { name: 'Cases', href: '/dashboard/cases', icon: Ticket },
      { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
      { name: 'Accounts', href: '/dashboard/accounts', icon: FileText },
      { name: 'Sales', href: '/dashboard/sales', icon: BarChart },
      { name: 'Service', href: '/dashboard/service', icon: Wrench },
      { name: 'Outreach', href: '/dashboard/outreach', icon: Bell },
      { name: 'Commerce', href: '/dashboard/commerce', icon: ShoppingBag },
      { name: 'Generative Canvas', href: '/dashboard/generative-canvas', icon: BookOpen },
      { name: 'Performance', href: '/dashboard/performance', icon: BarChart },
    ],
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
    // Mobile view remains unchanged
    return (
      <div className="h-full bg-white flex flex-col overflow-y-auto">
        {/* User Profile Header for Mobile */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center text-white">
              <span className="text-lg font-semibold">{user?.name?.[0] || 'U'}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{user?.name || 'User'}</span>
              <span className="text-xs text-gray-500">{user?.role?.replace('_', ' ') || 'Role'}</span>
            </div>
          </div>
        </div>
        
        {/* Navigation Items - Mobile */}
        <div className="flex-1 py-2">
          <nav className="px-4 space-y-1">
            {navigation.flatMap(section => 
              section.items.map(item => {
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
                    key={item.name}
                    to={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleItemClick(item);
                    }}
                    className={`
                      flex items-center rounded-md py-3 px-4
                      ${isActive
                        ? 'bg-orange-500 text-white' 
                        : 'text-gray-700 hover:bg-gray-50'}
                    `}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })
            )}
          </nav>
        </div>
        
        {/* Bottom Actions - Mobile */}
        <div className="border-t mt-auto">
          <div className="px-4 py-2">
            <button
              onClick={handleLogout} // Use the unified handleLogout
              className="flex items-center rounded-md py-3 px-4 w-full text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
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