import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

const TicketsPage = () => {
  const [tickets] = useState([
    {
      id: "T-1001",
      customer: "Alice Johnson",
      issue: "Solar Panel Malfunction",
      status: "Open",
      priority: "High",
      date: "2024-02-25",
    },
    {
      id: "T-1002",
      customer: "Bob Smith",
      issue: "Inverter Installation",
      status: "In Progress",
      priority: "Medium",
      date: "2024-02-24",
    },
    // Add more sample tickets as needed
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tickets Management</h2>
          <p className="text-muted-foreground mt-1">View and manage service tickets</p>
        </div>
        <button className="px-4 py-2 bg-[#FF7300] text-white rounded-lg hover:bg-orange-600">
          Create Ticket
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-input sticky top-0 bg-white z-20">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search tickets..."
                className="pl-10 pr-4 py-2 border border-input rounded-lg w-full sm:w-[300px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 border border-input rounded-lg hover:bg-orange-50">
              <Filter className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full">
            <thead className="bg-orange-500 border-b border-input sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                  Ticket ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                  Issue
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-input">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-orange-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ticket.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.issue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${ticket.status === 'Open' ? 'bg-orange-100 text-orange-800' : 
                      ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' : 
                      ticket.priority === 'Medium' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TicketsPage; 