"use client"

import React from 'react';
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Info, Bell, X } from 'lucide-react';

// Sample notifications data structure
const initialNotifications = [
  {
    id: 1,
    type: "stock",
    priority: "high",
    message: "Low stock alert: Solar Panel Model SP-001 (5 units remaining)",
    timestamp: "2024-02-25T10:30:00",
    isRead: false
  },
  {
    id: 2,
    type: "price",
    priority: "medium",
    message: "Price update required: Inverter INV-200 (last updated 30 days ago)",
    timestamp: "2024-02-24T15:45:00",
    isRead: false
  },
  {
    id: 3,
    type: "maintenance",
    priority: "low",
    message: "Scheduled maintenance completed for Battery Storage BS-100",
    timestamp: "2024-02-24T09:15:00",
    isRead: true
  }
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "medium":
        return <Info className="h-5 w-5 text-yellow-500" />;
      case "low":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-50 border-red-200 hover:border-red-300";
      case "medium":
        return "bg-yellow-50 border-yellow-200 hover:border-yellow-300";
      case "low":
        return "bg-green-50 border-green-200 hover:border-green-300";
      default:
        return "bg-gray-50 border-gray-200 hover:border-gray-300";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMarkAsRead = (id) => {
    setNotifications(notifications.map(notification =>
      notification.id === id ? { ...notification, isRead: true } : notification
    ));
  };

  const handleDeleteNotification = (id) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === "all" || notification.type === filter;
    const matchesSearch = notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground mt-1">View your notifications and updates</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Notifications</option>
                <option value="stock">Stock Alerts</option>
                <option value="price">Price Updates</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative border rounded-lg p-4 transition-all ${getPriorityClass(notification.priority)} ${
                  notification.isRead ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {getPriorityIcon(notification.priority)}
                  
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(notification.timestamp)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-sm text-orange-500 hover:text-orange-600"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 