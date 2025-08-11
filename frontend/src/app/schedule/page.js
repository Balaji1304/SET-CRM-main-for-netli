'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignTask, getServiceEngineers, getAllProductHeadTasks } from '../../services/taskService';
import AssignTaskModal from '../../components/dashboard/AssignTaskModal';
import { Loader2, AlertTriangle, Search, Filter, Eye, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

const formatServiceTaskStatus = (status) => {
  if (!status) return 'N/A';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getStatusBadgeClass = (status) => {
    const classes = {
      pending_assignment: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      assigned: 'bg-blue-100 text-blue-700 border-blue-300',
      scheduled: 'bg-sky-100 text-sky-700 border-sky-300',
      in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      completed: 'bg-green-100 text-green-700 border-green-300',
      cancelled: 'bg-red-100 text-red-700 border-red-300',
      on_hold: 'bg-purple-100 text-purple-700 border-purple-300',
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border-gray-300';
};

export default function SchedulePage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [serviceEngineers, setServiceEngineers] = useState([]);
  const [loadingEngineers, setLoadingEngineers] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState(null);
  const [assignTaskError, setAssignTaskError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [engineerFilter, setEngineerFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllProductHeadTasks();
      if (response.success) {
        setTasks(response.data || []);
      } else {
        setError(response.message || 'Failed to fetch tasks.');
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'An error occurred while fetching tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEngineers = useCallback(async () => {
    try {
      setLoadingEngineers(true);
      const response = await getServiceEngineers();
      if (response.success) {
        setServiceEngineers(response.data || []);
      } else {
        console.error(response.message || 'Failed to fetch service engineers.');
      }
    } catch (err) {
      console.error('Error fetching engineers:', err);
    } finally {
      setLoadingEngineers(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchEngineers();
  }, [fetchTasks, fetchEngineers]);

  const handleOpenAssignModal = (task) => {
    setSelectedTaskForAssignment(task);
    setAssignTaskError('');
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedTaskForAssignment(null);
    setAssignTaskError('');
  };

  const handleAssignTask = async (assignmentData) => {
    if (!selectedTaskForAssignment || !selectedTaskForAssignment._id) {
      setAssignTaskError('No task selected for assignment.');
      return;
    }
    try {
      setIsAssigning(true);
      setAssignTaskError('');
      const response = await assignTask(selectedTaskForAssignment._id, assignmentData);
      if (response.success) {
        setShowAssignModal(false);
        setSelectedTaskForAssignment(null);
        await fetchTasks();
      } else {
        setAssignTaskError(response.message || 'Failed to assign task.');
      }
    } catch (err) {
      console.error('Error assigning task:', err);
      setAssignTaskError(err.message || 'An error occurred during assignment.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleViewTaskDetails = (taskId) => {
    navigate(`/dashboard/schedule/${taskId}`);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const customerName = task.customerId ? `${task.customerId.firstName} ${task.customerId.lastName}` : '';
      const customerEmail = task.customerId ? task.customerId.email : '';
      const salespersonName = task.salesperson ? task.salesperson.name : '';
      const salespersonEmail = task.salesperson ? task.salesperson.email : '';
      const productsSummary = task.quotationItemsSummary ? task.quotationItemsSummary.map(item => item.productName).join(' ') : '';
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        task.purchaseID?.toLowerCase().includes(searchLower) ||
        customerName.toLowerCase().includes(searchLower) ||
        customerEmail.toLowerCase().includes(searchLower) ||
        salespersonName.toLowerCase().includes(searchLower) ||
        salespersonEmail.toLowerCase().includes(searchLower) ||
        productsSummary.toLowerCase().includes(searchLower) ||
        (task.assignedEngineerId?.name.toLowerCase().includes(searchLower));

      const matchesStatus = statusFilter === '' || task.serviceTaskStatus === statusFilter;
      const matchesEngineer = engineerFilter === '' || task.assignedEngineerId?._id === engineerFilter;

      return matchesSearch && matchesStatus && matchesEngineer;
    });
  }, [tasks, searchTerm, statusFilter, engineerFilter]);
  
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const currentTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const serviceTaskStatuses = [
    { value: 'pending_assignment', label: 'Pending Assignment' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'on_hold', label: 'On Hold' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-tertiary">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading service tasks...</p>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-tertiary text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Tasks</p>
        <p className="text-sm text-secondary mb-4">{error}</p>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-tertiary font-sans">
      <div className="border-b border-fourth pb-5 mb-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-secondary">Service Task Assignments</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden bg-tertiary rounded-lg border border-fourth shadow-sm p-6 flex flex-col">
        {/* Toolbar with Search and Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:max-w-xs">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-fourth rounded-lg text-sm text-secondary focus:ring-1 focus:ring-primary focus:border-primary transition-colors bg-white"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                <select
                  id="status-filter"
                  name="status-filter"
                  className="w-full p-2.5 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm text-secondary bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {serviceTaskStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>

                <select
                  id="engineer-filter"
                  name="engineer-filter"
                  className="w-full p-2.5 border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm text-secondary bg-white"
                  value={engineerFilter}
                  onChange={(e) => setEngineerFilter(e.target.value)}
                  disabled={loadingEngineers}
                >
                  <option value="">All Engineers</option>
                  {serviceEngineers.map(engineer => (
                    <option key={engineer._id || engineer.id} value={engineer._id || engineer.id}>{engineer.name}</option>
                  ))}
                </select>
            </div>
        </div>

        {error && tasks.length > 0 && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-4 flex items-center gap-2" role="alert">
            <AlertTriangle className="h-5 w-5 text-red-600"/>
            <div>
                <strong className="font-bold">An error occurred: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
            </div>
        )}
        
        {/* Table Area */}
        <div className="flex-1 overflow-y-auto -mx-6 -mb-6">
          <table className="min-w-full divide-y divide-fourth">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Purchase ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Products (Summary)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Purchase Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Salesperson</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Assignment Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Assigned To</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Due Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-tertiary divide-y divide-fourth">
              {currentTasks.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-16 px-6">
                    <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-xl font-medium text-secondary">No Tasks Found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchTerm || statusFilter || engineerFilter
                        ? "No tasks match your current filters."
                        : "There are no service tasks to display."}
                    </p>
                  </td>
                </tr>
              ) : (
                currentTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">{task.purchaseID}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">
                      {task.customerId ? `${task.customerId.firstName} ${task.customerId.lastName}` : 'N/A'}
                      <span className="block text-xs text-gray-500 font-normal">{task.customerId?.email}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-600 max-w-xs">
                      {task.quotationItemsSummary?.map(item => `${item.productName} (Qty: ${item.quantity})`).join(', ') || 'No items'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(task.purchaseDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {task.salesperson ? task.salesperson.name : 'N/A'}
                       <span className="block text-xs text-gray-500">{task.salesperson?.email}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(task.serviceTaskStatus)}`}>
                        {formatServiceTaskStatus(task.serviceTaskStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.assignedEngineerId ? task.assignedEngineerId.name : 'Not Assigned'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.serviceDueDate ? formatDate(task.serviceDueDate) : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleViewTaskDetails(task._id)} className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors" title="View Details">
                          <Eye className="h-4 w-4" />
                        </button>
                        {(task.serviceTaskStatus === 'pending_assignment' || task.serviceTaskStatus === 'assigned' || task.serviceTaskStatus === 'scheduled' || task.serviceTaskStatus === 'on_hold') && (
                          <button onClick={() => handleOpenAssignModal(task)} className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-fourth transition-colors" title={task.serviceTaskStatus === 'pending_assignment' ? "Assign Task" : "Modify Assignment"}>
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-fourth bg-tertiary flex items-center justify-between sticky bottom-0 left-0 right-0">
                <div className="text-sm text-gray-600">
                Showing {filteredTasks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredTasks.length)} of {filteredTasks.length} results
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 border border-fourth rounded-md text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fourth transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600"> 
                    Page {currentPage} of {totalPages}
                    </span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 border border-fourth rounded-md text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fourth transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}
      </div>

      {showAssignModal && selectedTaskForAssignment && (
        <AssignTaskModal
          task={selectedTaskForAssignment}
          serviceEngineers={serviceEngineers}
          loadingEngineers={loadingEngineers}
          onClose={handleCloseAssignModal}
          onAssign={handleAssignTask}
          error={assignTaskError}
          isAssigning={isAssigning}
          formatDate={formatDate}
        />
      )}
    </div>
  );
} 