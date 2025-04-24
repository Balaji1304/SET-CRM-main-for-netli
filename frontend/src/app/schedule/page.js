import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

const SchedulePage = () => {
  const tasks = [
    {
      id: 1,
      title: "Solar Panel Installation",
      customer: "John Doe",
      location: "123 Main St",
      time: "10:00 AM",
      date: "2024-02-26",
    },
    {
      id: 2,
      title: "Maintenance Check",
      customer: "Jane Smith",
      location: "456 Oak Ave",
      time: "2:00 PM",
      date: "2024-02-26",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Service Schedule</h2>
          <p className="text-muted-foreground mt-1">Manage service appointments and tasks</p>
        </div>
        <button className="px-4 py-2 bg-[#FF7300] text-white rounded-lg hover:bg-orange-600">
          Add Appointment
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4">
        {/* Calendar Section */}
        <div className="col-span-2 rounded-lg border border-input p-4">
          <h3 className="text-lg font-semibold mb-2">Calendar</h3>
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            Calendar component will be integrated here
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-lg font-semibold mb-4">Today's Tasks</h3>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-gray-500">{task.customer}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
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
  );
};

export default SchedulePage; 