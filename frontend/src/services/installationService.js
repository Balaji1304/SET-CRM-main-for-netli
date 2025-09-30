import { apiRequest } from './apiConfig';

// Service Engineer API calls
export const getMyAssignments = async (useCache = true) => {
  try {
    const response = await apiRequest('installations/my-assignments', {
      method: 'GET'
    }, useCache);
    return response;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
};

export const acceptAssignment = async (purchaseId, data) => {
  try {
    const response = await apiRequest(`installations/${purchaseId}/accept`, {
      method: 'PUT',
      body: data
    });
    return response;
  } catch (error) {
    console.error('Error accepting assignment:', error);
    throw error;
  }
};

export const startWork = async (purchaseId, data) => {
  try {
    const response = await apiRequest(`installations/${purchaseId}/start-work`, {
      method: 'PUT',
      body: data
    });
    return response;
  } catch (error) {
    console.error('Error starting work:', error);
    throw error;
  }
};

export const completeInstallation = async (purchaseId, formData) => {
  try {
    const response = await apiRequest(`installations/${purchaseId}/complete`, {
      method: 'POST',
      body: formData,
      isFormData: true
    });
    return response;
  } catch (error) {
    console.error('Error completing installation:', error);
    throw error;
  }
};

export const reportIssue = async (purchaseId, issueData) => {
  try {
    const response = await apiRequest(`installations/${purchaseId}/report-issue`, {
      method: 'POST',
      body: issueData
    });
    return response;
  } catch (error) {
    console.error('Error reporting issue:', error);
    throw error;
  }
};

// Customer API calls
export const getInstallationForSignoff = async (purchaseId) => {
  try {
    const response = await apiRequest(`installations/${purchaseId}/signoff`, {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error fetching installation details:', error);
    throw error;
  }
};

export const submitCustomerSignoff = async (purchaseId, signoffData) => {
  try {
    const response = await apiRequest(`installations/${purchaseId}/signoff`, {
      method: 'POST',
      body: signoffData
    });
    return response;
  } catch (error) {
    console.error('Error submitting signoff:', error);
    throw error;
  }
};

// Utility functions
export const getInstallationStatusLabel = (status) => {
  const labels = {
    'assigned': 'Assigned',
    'accepted': 'Accepted',
    'in_progress': 'Work in progress',
    'completed': 'Completed',
    'issues': 'Issues reported'
  };
  return labels[status] || status;
};

export const getInstallationStatusColor = (status) => {
  const colors = {
    'assigned': 'bg-blue-100 text-blue-800',
    'accepted': 'bg-green-100 text-green-800',
    'in_progress': 'bg-purple-100 text-purple-800',
    'completed': 'bg-green-100 text-green-800',
    'issues': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

