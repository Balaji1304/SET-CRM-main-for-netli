import { apiRequest, invalidateCache } from './apiConfig';

const BASE = 'tickets';

// Customer
export const getMyTickets = () => apiRequest(`${BASE}`);
export const createTicket = (payload) => apiRequest(`${BASE}`, { method: 'POST', body: payload }, false);
export const updateMyTicket = (id, payload) => apiRequest(`${BASE}/${id}`, { method: 'PUT', body: payload }, false);
export const deleteMyTicket = (id) => apiRequest(`${BASE}/${id}`, { method: 'DELETE' }, false);

// Product Head
export const getAllTickets = () => apiRequest(`${BASE}/admin/all`);
export const assignTicket = (id, engineerId) => apiRequest(`${BASE}/admin/${id}/assign`, { method: 'PUT', body: { engineerId } }, false);
export const updateTicketMeta = (id, payload) => apiRequest(`${BASE}/admin/${id}/meta`, { method: 'PUT', body: payload }, false);

// Service Engineer
export const getAssignedTickets = () => apiRequest(`${BASE}/engineer/my`);
export const updateTicketStatus = (id, status) => apiRequest(`${BASE}/engineer/${id}/status`, { method: 'PUT', body: { status } }, false);
export const addComment = (id, message) => apiRequest(`${BASE}/engineer/${id}/comments`, { method: 'POST', body: { message } }, false);

export default {
  getMyTickets,
  createTicket,
  updateMyTicket,
  deleteMyTicket,
  getAllTickets,
  assignTicket,
  updateTicketMeta,
  getAssignedTickets,
  updateTicketStatus,
  addComment,
};


