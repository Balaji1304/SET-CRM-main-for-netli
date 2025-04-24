import React from 'react';
import { Wrench, Calendar, Clock, MapPin } from 'lucide-react';

const MaintenancePage = () => {
  const maintenanceTasks = [
    {
      id: 1,
      title: "Regular System Check",
      location: "Solar Farm A",
      status: "Scheduled",
      date: "2024-02-28",
      time: "10:00 AM",
    },
    {
      id: 2,
      title: "Panel Cleaning",
      location: "Residential Site B",
      status: "In Progress",
      date: "2024-02-26",
      time: "2:00 PM",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Maintenance Management</h2>
          <p className="text-muted-foreground mt-1">Schedule and track maintenance tasks</p>
        </div>
        <button className="px-4 py-2 bg-[#FF7300] text-white rounded-lg hover:bg-orange-600">
          Schedule Maintenance
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="grid gap-4 md:grid-cols-3 p-4">
          {/* Maintenance Calendar */}
          <div className="md:col-span-2 rounded-lg border border-input p-4">
            <h3 className="text-lg font-semibold mb-4">Maintenance Schedule</h3>
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              Calendar component will be integrated here
            </div>
          </div>

          {/* Upcoming Maintenance */}
          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-semibold mb-4">Upcoming Maintenance</h3>
            <div className="space-y-4">
              {maintenanceTasks.map((task) => (
                <div key={task.id} className="border-b pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full 
                        ${task.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 
                        task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      {task.date}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      {task.time}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      {task.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage; 