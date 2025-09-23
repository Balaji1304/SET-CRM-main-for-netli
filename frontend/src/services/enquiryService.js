import { apiRequest, invalidateCache } from './apiConfig';

// Create new enquiry
export const createEnquiry = async (enquiryData) => {
  const response = await apiRequest('enquiries', {
    method: 'POST',
    body: enquiryData
  }, false); // Don't cache POST requests
  
  // Invalidate enquiries cache after creating
  invalidateCache('enquiries');
  return response;
};

// Get all enquiries
export const getEnquiries = async () => {
  return await apiRequest('enquiries');
};

// Get single enquiry by ID
export const getEnquiry = async (id) => {
  return await apiRequest(`enquiries/${id}`);
};

// Update enquiry
export const updateEnquiry = async (id, enquiryData) => {
  const response = await apiRequest(`enquiries/${id}`, {
    method: 'PUT',
    body: enquiryData
  }, false); // Don't cache PUT requests
  
  // Invalidate enquiries cache after updating
  invalidateCache('enquiries');
  return response;
};

// Delete enquiry
export const deleteEnquiry = async (id) => {
  const response = await apiRequest(`enquiries/${id}`, {
    method: 'DELETE'
  }, false); // Don't cache DELETE requests
  
  // Invalidate enquiries cache after deletion
  invalidateCache('enquiries');
  return response;
};

// Get available salespersons for assignment
export const getSalespersons = async () => {
  return await apiRequest('enquiries/salespersons');
};

// Assign enquiry to salesperson (creates lead automatically)
export const assignEnquiryToSalesperson = async (enquiryId, assignmentData) => {
  const response = await apiRequest(`enquiries/${enquiryId}/assign`, {
    method: 'POST',
    body: assignmentData
  }, false); // Don't cache POST requests
  
  // Invalidate both enquiries and leads cache after assignment
  invalidateCache('enquiries');
  invalidateCache('leads');
  return response;
};

// Get enquiries pending assignment
export const getPendingAssignmentEnquiries = async () => {
  return await apiRequest('enquiries/pending-assignment');
};

// Get enquiries created by current user (for front office executives)
export const getMyEnquiries = async () => {
  return await apiRequest('enquiries/my-enquiries');
};

/**
 * Export enquiries data
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise<Object>} - Response with enquiries data for export
 */
export const exportEnquiries = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const endpoint = `enquiries/export?${query}`;
    const response = await apiRequest(endpoint, { method: 'GET' }, false);
    return response;
  } catch (error) {
    console.error('Error exporting enquiries:', error);
    throw error;
  }
}; 