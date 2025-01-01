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
  UserPlus
} from 'lucide-react';

const navigation = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Add Lead', href: '/dashboard/add-lead', icon: UserPlus },
      { name: 'Leads', href: '/dashboard/leads', icon: Users },
      { name: 'Products', href: '/dashboard/products', icon: Box },
    ],
  },
  {
    title: 'Service Engineer',
    items: [
      { name: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
      { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
      { name: 'Service Customers', href: '/dashboard/service-customers', icon: Users },
      { name: 'Performance', href: '/dashboard/performance', icon: BarChart2 },
      { name: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
    ],
  },
  {
    title: 'Resources',
    items: [
      { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: BookOpen },
      { name: 'Reports', href: '/dashboard/reports', icon: FileText },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
  }
];

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLeadsSection = (pathname) => {
    return pathname.startsWith('/dashboard/leads') || pathname.startsWith('/dashboard/edit-lead');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Solar CRM</h2>
          <p className="text-sm text-gray-500">{user?.role || 'User'}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {navigation.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="px-3 text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? 'bg-orange-50 text-[#FF7300]'
                            : 'text-gray-700 hover:bg-orange-50 hover:text-[#FF7300]'
                        }`}
                      >
                        <item.icon className={`mr-3 h-5 w-5 ${
                          isActive ? 'text-[#FF7300]' : 'text-gray-400'
                        }`} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-orange-50 hover:text-[#FF7300]"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export { AppSidebar }; 