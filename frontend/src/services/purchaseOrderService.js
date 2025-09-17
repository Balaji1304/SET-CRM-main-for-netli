import { apiRequest } from './apiConfig';

export const getAllPurchaseOrders = async () => {
  try {
    const res = await apiRequest('customer-purchases', { method: 'GET' });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const getPurchaseOrderDetails = async (id) => {
  try {
    const res = await apiRequest(`customer-purchases/${id}`, { method: 'GET' });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const acceptOrder = async (id, estimatedDispatchDate) => {
  try {
    const res = await apiRequest(`customer-purchases/${id}/accept-order`, {
      method: 'PUT',
      body: { estimatedDispatchDate },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const updateStatusToReadyToDispatch = async (id) => {
  try {
    const res = await apiRequest(`customer-purchases/${id}/ready-to-dispatch`, { method: 'PUT' });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const allocateInstallationDate = async (id, installationDate) => {
  try {
    const res = await apiRequest(`customer-purchases/${id}/allocate-installation-date`, {
      method: 'PUT',
      body: { installationDate },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const getServiceEngineers = async () => {
  try {
    const res = await apiRequest('customer-purchases/tasks/service-engineers', { method: 'GET' });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const assignTask = async (purchaseId, data) => {
  try {
    // We're now passing only the engineer ID and notes since we're using the pre-allocated installation date
    const res = await apiRequest(`customer-purchases/tasks/${purchaseId}/assign`, {
      method: 'PUT',
      body: {
        assignedEngineerId: data.assignedEngineerId,
        serviceAssignmentNotes: data.serviceAssignmentNotes
      },
    });
    return res;
  } catch (err) {
    throw err;
  }
};

// Get customer purchases for current user (or all purchases for admin)
export const getCustomerPurchasesByUser = async () => {
  try {
    const res = await apiRequest('customer-purchases/my-purchases', { method: 'GET' });
    return res;
  } catch (err) {
    throw err;
  }
};