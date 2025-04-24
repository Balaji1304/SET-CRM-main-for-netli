const API_URL = 'https://set-crm-main-for-netli.onrender.com/api';

export const createLead = async (leadData) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(leadData)
    });
    return await response.json();
  } catch (error) {
    throw new Error('Failed to create lead');
  }
};

export const getLeads = async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/leads`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    throw new Error('Failed to fetch leads');
  }
};

export const getLead = async (id) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/leads/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    throw new Error('Failed to fetch lead');
  }
};

export const updateLead = async (id, leadData) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/leads/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(leadData)
    });
    return await response.json();
  } catch (error) {
    throw new Error('Failed to update lead');
  }
};

export const deleteLead = async (id) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    throw new Error('Failed to delete lead');
  }
}; 