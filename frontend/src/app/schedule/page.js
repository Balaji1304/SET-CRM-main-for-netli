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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Schedule</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Calendar Section */}
        <div className="col-span-2 rounded-lg border bg-white p-4">
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