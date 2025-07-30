'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, User as UserIcon, Info } from 'lucide-react'; // UserIcon for Assigned To

const AssignTaskModal = ({
  task, // The task object being assigned
  serviceEngineers, // List of available service engineers { id, name, email }
  loadingEngineers,
  onClose,
  onAssign, // Function to call when assignment is confirmed
  error, // Error message from assignment attempt
  isAssigning, // Boolean to indicate if assignment is in progress
  formatDate
}) => {
  const [assignedEngineerId, setAssignedEngineerId] = useState('');
  const [serviceDueDate, setServiceDueDate] = useState('');
  const [serviceAssignmentNotes, setServiceAssignmentNotes] = useState('');
  const [internalError, setInternalError] = useState('');

  useEffect(() => {
    if (task) {
      // Pre-fill form if editing an existing assignment
      setAssignedEngineerId(task.assignedEngineerId?._id || task.assignedEngineerId || '');
      setServiceDueDate(task.serviceDueDate ? new Date(task.serviceDueDate).toISOString().split('T')[0] : '');
      setServiceAssignmentNotes(task.serviceAssignmentNotes || '');
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setInternalError('');
    if (!assignedEngineerId) {
      setInternalError('Please select a service engineer.');
      return;
    }
    if (!serviceDueDate) {
      setInternalError('Installation date is not set. Please contact the Marketing Coordinator.');
      return;
    }
    
    onAssign({
      assignedEngineerId,
      // serviceDueDate is now read-only and passed from the task's installation date
      serviceAssignmentNotes,
    });
  };

  if (!task) return null;

  const subjectText = `Service Installation for Purchase ID: ${task.purchaseID}`;
  const customerName = task.customerId ? `${task.customerId.firstName} ${task.customerId.lastName}` : 'N/A';
  const relatedToText = task.purchaseID;
  const installationDateText = task.installationDate ? new Date(task.installationDate).toLocaleDateString() : 'Not set';
  const title = "Assign Service Engineer for Installation";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"
            disabled={isAssigning}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject (Read-only) */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              value={subjectText}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Customer Name (Read-only) */}
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <input
              type="text"
              id="customerName"
              value={customerName}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          
          {/* Related To (Read-only) */}
          <div>
            <label htmlFor="relatedTo" className="block text-sm font-medium text-gray-700 mb-1">
              Related To (Purchase ID)
            </label>
            <input
              type="text"
              id="relatedTo"
              value={relatedToText}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Assigned To Dropdown */}
          <div>
            <label htmlFor="assignedEngineerId" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="assignedEngineerId"
                value={assignedEngineerId}
                onChange={(e) => setAssignedEngineerId(e.target.value)}
                className={`w-full p-2 pl-10 border ${internalError && !assignedEngineerId ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none`}
                disabled={loadingEngineers || isAssigning}
              >
                <option value="" disabled>Select Service Engineer...</option>
                {loadingEngineers ? (
                  <option disabled>Loading engineers...</option>
                ) : serviceEngineers.length > 0 ? (
                  serviceEngineers.map((engineer) => (
                    <option key={engineer._id || engineer.id} value={engineer._id || engineer.id}>
                      {engineer.name} ({engineer.email})
                    </option>
                  ))
                ) : (
                  <option disabled>No service engineers available</option>
                )}
              </select>
            </div>
          </div>

          {/* Installation Date (Read-only) */}
          <div>
            <label htmlFor="serviceDueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Installation Date (Set by Marketing Coordinator)
            </label>
            <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                type="date"
                id="serviceDueDate"
                value={serviceDueDate}
                readOnly
                className={`w-full p-2 pl-10 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                disabled={true}
                />
            </div>
            <p className="mt-1 text-xs text-gray-500">This date was already fixed after discussing with the customer.</p>
          </div>
          
          {/* Assignment Notes */}
           <div>
            <label htmlFor="serviceAssignmentNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Assignment Notes
            </label>
            <textarea
              id="serviceAssignmentNotes"
              rows="3"
              value={serviceAssignmentNotes}
              onChange={(e) => setServiceAssignmentNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Add any specific instructions for the service engineer (optional)"
              disabled={isAssigning}
            />
          </div>

          {/* Error Display */}
          {(error || internalError) && (
            <div className="bg-red-50 p-3 rounded-md flex items-start text-red-700">
                <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">{error || internalError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isAssigning}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAssigning || loadingEngineers}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              {isAssigning ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Assigning...
                </>
              ) : (title === "Assign New Task" ? "Assign Task" : "Save Changes")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignTaskModal;

// Basic CSS for modal animation (add to your global CSS or a relevant CSS module)
/*
@keyframes modalShow {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-modalShow {
  animation: modalShow 0.3s forwards;
}
*/ 