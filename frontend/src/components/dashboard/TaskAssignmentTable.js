'use client';

import React from 'react';
import { Eye, Edit3, ChevronLeft, ChevronRight } from 'lucide-react'; // Edit3 for Assign, Eye for View

const TaskAssignmentTable = ({
  tasks,
  onAssignTask,
  onViewDetails,
  formatDate,
  formatServiceTaskStatus,
  // Add pagination props if implementing pagination later
  // currentPage, setCurrentPage, totalPages
}) => {
  // if (!tasks || tasks.length === 0) {
  //   // This case is handled in the parent page.js, but as a safeguard:
  //   return <p className="text-center text-gray-500 py-8">No tasks available for assignment.</p>;
  // }

  const itemsPerPage = 10; // Example, make this configurable if needed
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const totalPages = tasks && tasks.length > 0 ? Math.ceil(tasks.length / itemsPerPage) : 1;
  const startIndex = tasks && tasks.length > 0 ? (currentPage - 1) * itemsPerPage : 0;
  const endIndex = tasks && tasks.length > 0 ? startIndex + itemsPerPage : 0;
  const currentTasks = tasks && tasks.length > 0 ? tasks.slice(startIndex, endIndex) : [];


  return (
    <div className="flex flex-col flex-1 min-h-0 relative bg-white shadow-md rounded-lg">
      <div className="overflow-auto flex-1 relative">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-orange-500 border-b border-input sticky top-0 z-10 shadow-sm">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-white uppercase tracking-wider min-w-[150px]">
                  Purchase ID
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-white uppercase tracking-wider min-w-[200px]">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-white uppercase tracking-wider min-w-[250px]">
                  Products (Summary)
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-white uppercase tracking-wider">
                  Purchase Date
                </th>
                 <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-white uppercase tracking-wider min-w-[200px]">
                  Salesperson
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-white uppercase tracking-wider">
                  Assignment Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-white uppercase tracking-wider min-w-[200px]">
                  Assigned To
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-white uppercase tracking-wider">
                  Due Date
                </th>
                <th scope="col" className="px-4 py-3 text-right text-sm font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTasks.length > 0 ? (
                currentTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                      {task.purchaseID}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                      {task.customerId ? `${task.customerId.firstName} ${task.customerId.lastName}` : 'N/A'}
                      <span className="block text-xs text-gray-500 font-normal">{task.customerId?.email}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-normal text-sm text-gray-600 max-w-xs">
                      {task.quotationItemsSummary && task.quotationItemsSummary.length > 0 
                        ? task.quotationItemsSummary.map(item => `${item.productName} (Qty: ${item.quantity})`).join(', ') 
                        : 'No items'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(task.purchaseDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {task.salesperson ? task.salesperson.name : 'N/A'}
                       <span className="block text-xs text-gray-500">{task.salesperson?.email}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.serviceTaskStatus === 'pending_assignment'
                              ? 'bg-yellow-100 text-yellow-800'
                              : task.serviceTaskStatus === 'assigned'
                              ? 'bg-blue-100 text-blue-800'
                              : task.serviceTaskStatus === 'scheduled'
                              ? 'bg-sky-100 text-sky-800' 
                              : task.serviceTaskStatus === 'in_progress'
                              ? 'bg-indigo-100 text-indigo-800'
                              : task.serviceTaskStatus === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : task.serviceTaskStatus === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}
                      >
                        {formatServiceTaskStatus(task.serviceTaskStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {task.assignedEngineerId ? task.assignedEngineerId.name : 'Not Assigned'} 
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {task.serviceDueDate ? formatDate(task.serviceDueDate) : 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onViewDetails(task._id)}
                          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5 text-gray-500 hover:text-orange-600" />
                        </button>
                        {(task.serviceTaskStatus === 'pending_assignment' || task.serviceTaskStatus === 'assigned' || task.serviceTaskStatus === 'scheduled' || task.serviceTaskStatus === 'on_hold') && (
                          <button
                            onClick={() => onAssignTask(task)}
                            className="p-1 hover:bg-gray-100 rounded-md transition-colors flex items-center"
                            title={task.serviceTaskStatus === 'pending_assignment' ? "Assign Task" : "Modify Assignment"}
                          >
                            <Edit3 className={`h-5 w-5 mr-1 ${task.serviceTaskStatus === 'pending_assignment' ? 'text-orange-500 hover:text-orange-700' : 'text-blue-500 hover:text-blue-700'}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    No tasks to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination Controls */} 
      {tasks && tasks.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-input bg-white sticky bottom-0 left-0 right-0 shadow-sm">
            <div className="flex items-center text-sm text-gray-600">
            Showing {tasks.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, tasks.length)} of {tasks.length} results
            </div>
            <div className="flex gap-2">
            <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-input rounded-md disabled:opacity-50 hover:bg-orange-50"
            >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-input rounded-md disabled:opacity-50 hover:bg-orange-50"
            >
                <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default TaskAssignmentTable; 