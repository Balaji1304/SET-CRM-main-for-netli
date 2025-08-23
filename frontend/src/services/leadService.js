import { apiRequest, invalidateCache } from './apiConfig';

export const createLead = async (leadData) => {
  const response = await apiRequest('leads', {
    method: 'POST',
    body: leadData
  }, false); // Don't cache POST requests
  
  // Invalidate leads cache after creating a new lead
  invalidateCache('leads');
  return response;
};

export const getLeads = async (forQuotation = false) => {
  const endpoint = forQuotation ? 'leads?forQuotation=true' : 'leads';
  return await apiRequest(endpoint);
};

export const getLead = async (id) => {
  return await apiRequest(`leads/${id}`);
};

export const updateLead = async (id, leadData) => {
  const response = await apiRequest(`leads/${id}`, {
    method: 'PUT',
    body: leadData
  }, false); // Don't cache PUT requests
  
  // Invalidate leads cache after updating
  invalidateCache('leads');
  return response;
};

export const deleteLead = async (id) => {
  const response = await apiRequest(`leads/${id}`, {
    method: 'DELETE'
  }, false); // Don't cache DELETE requests
  
  // Invalidate leads cache after deletion
  invalidateCache('leads');
  return response;
};

export const checkEmailExists = async (email, excludeId = null) => {
  return await apiRequest('leads/check-email', {
    method: 'POST',
    body: { email, excludeId }
  }, false); // Don't cache email checks
};

export const checkPhoneExists = async (phone, excludeId = null) => {
  return await apiRequest('leads/check-phone', {
    method: 'POST',
    body: { phone, excludeId }
  }, false); // Don't cache phone checks
}; 