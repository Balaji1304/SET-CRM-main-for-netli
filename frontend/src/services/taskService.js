import { apiRequest, invalidateCache } from './apiConfig';

const TASKS_API_BASE = 'customer-purchases/tasks'; // Base path for task-specific operations under customer-purchases
const CUSTOMER_PURCHASES_API_BASE = 'customer-purchases'; // Base path for general customer-purchases

/**
 * Get all service engineers
 * @returns {Promise<Object>} - Response with service engineers list
 */
export const getServiceEngineers = async () => {
  try {
    // The route defined was /api/customer-purchases/tasks/service-engineers
    const response = await apiRequest(`${TASKS_API_BASE}/service-engineers`);
    return response;
  } catch (error) {
    console.error('Error fetching service engineers:', error);
    // Ensure the error is re-thrown so UI can catch it
    throw error;
  }
};

/**
 * Get customer purchases that are assignable for service
 * @returns {Promise<Object>} - Response with assignable tasks list
 */
export const getAssignableTasks = async () => {
  try {
    // The route defined was /api/customer-purchases/tasks/assignable
    const response = await apiRequest(`${TASKS_API_BASE}/assignable`);
    return response;
  } catch (error) {
    console.error('Error fetching assignable tasks:', error);
    throw error;
  }
};

/**
 * Assign a service task to an engineer
 * @param {string} purchaseId - The ID of the customer purchase (task)
 * @param {Object} assignmentData - Data for assignment (assignedEngineerId, serviceDueDate, serviceAssignmentNotes)
 * @returns {Promise<Object>} - Response with updated task
 */
export const assignTask = async (purchaseId, assignmentData) => {
  try {
    // The route defined was /api/customer-purchases/tasks/:purchaseId/assign
    const response = await apiRequest(`${TASKS_API_BASE}/${purchaseId}/assign`, {
      method: 'PUT',
      body: assignmentData,
    }, false); // Don't cache PUT requests

    // Optionally, invalidate caches that might show this task or lists of tasks
    invalidateCache(`${TASKS_API_BASE}/assignable`); // To refresh the assignable tasks list
    invalidateCache(`${CUSTOMER_PURCHASES_API_BASE}/${purchaseId}`); // To refresh details if viewing this task

    return response;
  } catch (error) {
    console.error(`Error assigning task for purchase ${purchaseId}:`, error);
    throw error;
  }
};

/**
 * Get details for a specific customer purchase (viewed as a task)
 * This uses the existing customer purchase detail endpoint.
 * @param {string} purchaseId - The ID of the customer purchase
 * @returns {Promise<Object>} - Response with purchase/task details
 */
export const getTaskDetails = async (purchaseId) => {
  try {
    // This route is GET /api/customer-purchases/:purchaseId
    const response = await apiRequest(`${CUSTOMER_PURCHASES_API_BASE}/${purchaseId}`);
    return response;
  } catch (error) {
    console.error(`Error fetching details for task ${purchaseId}:`, error);
    throw error;
  }
};

/**
 * Get all tasks for the Product Head view
 * @returns {Promise<Object>} - Response with all relevant tasks list
 */
export const getAllProductHeadTasks = async () => {
  try {
    // The route defined is /api/customer-purchases/tasks/all-product-head
    const response = await apiRequest(`${TASKS_API_BASE}/all-product-head`);
    return response;
  } catch (error) {
    console.error('Error fetching all product head tasks:', error);
    throw error;
  }
}; 