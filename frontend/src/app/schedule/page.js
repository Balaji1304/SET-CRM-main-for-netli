'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Correctly changed from next/navigation
import { getAllProductHeadTasks, assignTask, getServiceEngineers } from '../../services/taskService';
import TaskAssignmentTable from '../../components/dashboard/TaskAssignmentTable';
import AssignTaskModal from '../../components/dashboard/AssignTaskModal';
import { PlusCircle, Search, Filter } from 'lucide-react';

// Function to format date string (if needed, or use a library)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
  } catch (e) {
    return dateString; // Return original if formatting fails
  }
};

// Function to format service task status
const formatServiceTaskStatus = (status) => {
  if (!status) return 'N/A';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function SchedulePage() {
  const navigate = useNavigate(); // Correctly changed from useRouter
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [serviceEngineers, setServiceEngineers] = useState([]);
  const [loadingEngineers, setLoadingEngineers] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState(null);
  const [assignTaskError, setAssignTaskError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [engineerFilter, setEngineerFilter] = useState('');

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

  // Memoized filtered tasks
  const filteredTasks = React.useMemo(() => {
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

  // Define possible service task statuses for filter dropdown
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
    return <div className="flex items-center justify-center h-screen"><p>Loading tasks...</p></div>;
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">Service Task Assignments</h1>
      </div>

      {/* Search and Filter Controls */} 
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Search Input */}
          <div className="md:col-span-1">
            <label htmlFor="search-tasks" className="block text-sm font-medium text-gray-700 mb-1">Search Tasks</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="search-tasks"
                id="search-tasks"
                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md shadow-sm"
                placeholder="Search by ID, Customer, Salesperson..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              id="status-filter"
              name="status-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md shadow-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {serviceTaskStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Engineer Filter */}
          <div>
            <label htmlFor="engineer-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Engineer</label>
            <select
              id="engineer-filter"
              name="engineer-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md shadow-sm"
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
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Conditional rendering for no tasks AFTER filtering */}
      {!loading && filteredTasks.length === 0 && !error && (
        <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow">
          <p>No tasks match your current search/filter criteria.</p>
        </div>
      )}

      {/* Pass filteredTasks to the table */}
      {!loading && (filteredTasks.length > 0 || error) && (  /* Show table if there are tasks OR if there was an error to display message inside table */
        <TaskAssignmentTable
          tasks={filteredTasks} // Pass filtered tasks
          onAssignTask={handleOpenAssignModal}
          onViewDetails={handleViewTaskDetails}
          formatDate={formatDate}
          formatServiceTaskStatus={formatServiceTaskStatus}
        />
      )}

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