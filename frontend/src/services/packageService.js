import axios from 'axios';

const API_URL = '/api/packages';

const getPackages = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.get(API_URL, config);
  return response.data;
};

const createPackage = async (salesOrderId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.post(API_URL, { salesOrderId }, config);
  return response.data;
};

const updatePackageStatus = async (id, status, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.put(`${API_URL}/${id}/status`, { status }, config);
  return response.data;
};

const packageService = {
  getPackages,
  createPackage,
  updatePackageStatus,
};

export default packageService; 