import { apiRequest, API_URL } from './apiConfig';

// Get service dashboard summary
export const getDashboardSummary = async () => {
  return await apiRequest('reports/service/dashboard');
};

// Generate installation performance report
export const generateInstallationPerformanceReport = async (reportData) => {
  return await apiRequest('reports/service/installation-performance', {
    method: 'POST',
    body: JSON.stringify(reportData)
  });
};

// Generate task efficiency report
export const generateTaskEfficiencyReport = async (reportData) => {
  return await apiRequest('reports/service/task-efficiency', {
    method: 'POST',
    body: JSON.stringify(reportData)
  });
};

// Get user's service reports
export const getMyReports = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString ? `reports/service/my-reports?${queryString}` : 'reports/service/my-reports';
  return await apiRequest(endpoint);
};

// Get specific service report
export const getReport = async (reportId) => {
  return await apiRequest(`reports/service/${reportId}`);
};

// Delete service report
export const deleteReport = async (reportId) => {
  return await apiRequest(`reports/service/${reportId}`, {
    method: 'DELETE'
  });
};

// Export report as PDF (if implemented later)
export const exportReportPDF = async (reportId) => {
  const url = `${API_URL}/reports/service/${reportId}/export/pdf`;
  window.open(url, '_blank');
};

// Export report as Excel (if implemented later)
export const exportReportExcel = async (reportId) => {
  const url = `${API_URL}/reports/service/${reportId}/export/excel`;
  window.open(url, '_blank');
};

