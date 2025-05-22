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
  MoreHorizontal
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
      { name: 'My Products', href: '/dashboard/my-products', icon: ShoppingBag },
      { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
      { name: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
    ],
    sales_person: [
      { name: 'Leads', href: '/dashboard/leads', icon: Users },
      { name: 'Quotations', href: '/dashboard/quotations', icon: FileText },
    ],
    inventory_manager: [
      { name: 'Products', href: '/dashboard/products', icon: Box },
    ],
    product_head: [
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);

  const navigation = getNavigation(user?.role);

  const handleItemClick = (item) => {
    // Navigate to the new route
    if (onItemClick && typeof onItemClick === 'function') {
      onItemClick();
    }
    navigate(item.href);
  };

  // Handle logout, using the provided onLogout if available
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      authLogout();
    }
  };

  // Special styling for mobile view
  if (isMobile) {
    return (
      <div className="h-full bg-white flex flex-col overflow-y-auto">
        {/* User Profile Header for Mobile - Styled like desktop but for mobile */}
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
        
        {/* Navigation Items - Match the desktop styling but with mobile sizing */}
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
        
        {/* Bottom Actions */}
        <div className="border-t mt-auto">
          <div className="px-4 py-2">
            <button
              onClick={handleLogout}
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

  // Desktop view
  return (
    <div className="fixed top-0 left-0 h-screen w-60 bg-slate-800 text-white flex flex-col z-10">
      {/* Company Logo Section */}
      <div className="h-20 flex items-center justify-center px-4 border-b border-slate-700">
        <img src="https://res.cloudinary.com/dcua87ney/image/upload/v1747940426/set-logo.9fc3ca1f3b1472eaca1d_mmqwnt.png" alt="Company Logo" className="h-16 w-auto" /> {/* Replace with your logo path */}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="flex-1 px-3 py-4">
          {navigation.map((section) => (
            <div key={section.title} className="mb-4"> {/* Reduced margin-bottom */}
              <div className="space-y-1"> {/* Reduced space between items */}
                {section.items.map((item) => {
                  const isActive = 
                    location.pathname === item.href ||
                    // Handle active state for parent routes as well
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href)) ||
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
                        flex flex-col items-center justify-center rounded-md text-xs font-medium
                        py-3 px-2 h-auto transition-colors duration-150 ease-in-out
                        hover:bg-slate-700 
                        ${isActive ? 'bg-slate-600 text-white' : 'text-slate-300 hover:text-white'}
                      `}
                      title={item.name}
                    >
                      <item.icon className="h-6 w-6 mb-1 shrink-0" />
                      <span className="text-center leading-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Profile Section with Pop-up Menu at the bottom */}
      <div className="border-t border-slate-700 p-3 mt-auto w-full relative">
        {isProfileMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-slate-700 rounded-md shadow-lg z-20 transition-all duration-300 ease-in-out">
            <button
              onClick={() => {
                navigate('/dashboard/settings'); // Placeholder for settings navigation
                setIsProfileMenuOpen(false);
              }}
              className="flex items-center w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 rounded-md"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
            <button
              onClick={() => {
                handleLogout();
                setIsProfileMenuOpen(false);
              }}
              className="flex items-center w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 rounded-md mt-1"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        )}
        <button 
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="flex items-center justify-between w-full p-2 hover:bg-slate-700 rounded-md focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-base font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm leading-tight">{user?.name || 'User Name'}</span>
              <span className="text-xs text-slate-400 leading-tight">{(user?.role?.replace('_', ' ') || 'User Role').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};

export { AppSidebar }; 