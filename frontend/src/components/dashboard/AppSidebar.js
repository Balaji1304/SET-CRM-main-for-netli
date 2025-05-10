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
  Bell as BellIcon
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
      { name: 'Add Lead', href: '/dashboard/add-lead', icon: UserPlus },
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

const AppSidebar = ({ onItemClick = () => {}, isMobile = false, isCollapsed = false, onToggle = () => {}, onLogout = () => {} }) => {
  const { user, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = getNavigation(user?.role);

  const handleItemClick = (item) => {
    // If clicking the same active item, only toggle sidebar
    if (location.pathname === item.href) {
      onToggle();
      return;
    }
    
    // If clicking a different item while collapsed, expand first
    if (isCollapsed) {
      onToggle();
    }
    
    // Navigate to the new route
    onItemClick();
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

  return (
    <div className={`
      ${isMobile ? 'p-4 w-full' : `fixed top-0 left-0 h-screen ${isCollapsed ? 'w-16' : 'w-64'} border-r z-10`}
      transition-all duration-300 ease-in-out
      bg-white flex flex-col
    `}>
      {!isMobile && (
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-lg font-semibold">{user?.name?.[0] || 'U'}</span>
            </div>
            <div className={`flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
              <span className="font-medium">{user?.name || 'User'}</span>
              <span className="text-xs text-muted-foreground">{user?.role || 'Role'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="flex-1 px-3 py-4">
          {navigation.map((section) => (
            <div key={section.title} className="mb-8">
              <div className="space-y-2">
                {section.items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={(e) => {
                      e.preventDefault(); // Prevent default Link behavior
                      handleItemClick(item);
                    }}
                    className={`
                      flex items-center rounded-md text-sm font-medium
                      h-10 px-3 transition-all duration-300 ease-in-out
                      ${location.pathname === item.href
                        ? 'bg-orange-500 text-white hover:bg-orange-600' 
                        : 'text-gray-700 hover:bg-orange-50'}
                    `}
                    title={isCollapsed ? item.name : ''}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className={`ml-3 truncate transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
                      {item.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t px-3 py-4 mt-auto">
        <button
          onClick={handleLogout}
          className={`
            flex items-center rounded-md text-sm font-medium
            h-10 px-3 transition-all duration-300 ease-in-out
            text-gray-700 hover:bg-orange-50
          `}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={`ml-3 truncate transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export { AppSidebar }; 