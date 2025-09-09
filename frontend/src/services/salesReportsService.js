import { apiRequest, API_URL } from './apiConfig';

/**
 * Sales Reports Service
 * Handles all API calls related to sales reports and analytics
 */

// Generate sales performance report
export const generateSalesPerformanceReport = async (reportData) => {
  try {
    const response = await apiRequest('/reports/sales/performance', {
      method: 'POST',
      body: reportData
    });
    return response;
  } catch (error) {
    console.error('Error generating sales performance report:', error);
    throw error;
  }
};

// Generate lead analysis report
export const generateLeadAnalysisReport = async (reportData) => {
  try {
    const response = await apiRequest('/reports/sales/leads', {
      method: 'POST',
      body: reportData
    });
    return response;
  } catch (error) {
    console.error('Error generating lead analysis report:', error);
    throw error;
  }
};

// Get sales dashboard data
export const getSalesDashboard = async () => {
  try {
    const response = await apiRequest('/reports/sales/dashboard', {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error fetching sales dashboard:', error);
    throw error;
  }
};

// Get user's reports list
export const getMyReports = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/reports/sales/my-reports${queryParams ? `?${queryParams}` : ''}`;
    
    const response = await apiRequest(endpoint, {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error fetching reports list:', error);
    throw error;
  }
};

// Get specific report details
export const getReportDetails = async (reportId) => {
  try {
    const response = await apiRequest(`/reports/sales/${reportId}`, {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error fetching report details:', error);
    throw error;
  }
};

// Export report to PDF
export const exportReportToPDF = async (reportId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/reports/sales/${reportId}/export/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `Sales_Report_${reportId}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting report to PDF:', error);
    throw error;
  }
};

// Export report to Excel
export const exportReportToExcel = async (reportId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/reports/sales/${reportId}/export/excel`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `Sales_Report_${reportId}.xlsx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting report to Excel:', error);
    throw error;
  }
};

// Delete report
export const deleteReport = async (reportId) => {
  try {
    const response = await apiRequest(`/reports/sales/${reportId}`, {
      method: 'DELETE'
    });
    return response;
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
};

// Utility functions for report data formatting
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(num || 0);
};

export const formatPercentage = (percent) => {
  return `${parseFloat(percent || 0).toFixed(1)}%`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get report status badge color
export const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'generating':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'expired':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get performance status color
export const getPerformanceColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-blue-600';
    case 'average':
      return 'text-yellow-600';
    case 'poor':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

// Calculate period type based on date range
export const calculatePeriodType = (startDate, endDate) => {
  const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) return 'daily';
  if (diffDays <= 7) return 'weekly';
  if (diffDays <= 31) return 'monthly';
  if (diffDays <= 92) return 'quarterly';
  if (diffDays <= 365) return 'yearly';
  return 'custom';
};

// Get default date ranges
export const getDefaultDateRanges = () => {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const thisQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const thisYear = new Date(today.getFullYear(), 0, 1);

  return {
    thisMonth: {
      label: 'This Month',
      startDate: thisMonth.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    },
    lastMonth: {
      label: 'Last Month',
      startDate: lastMonth.toISOString().split('T')[0],
      endDate: lastMonthEnd.toISOString().split('T')[0]
    },
    thisQuarter: {
      label: 'This Quarter',
      startDate: thisQuarter.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    },
    thisYear: {
      label: 'This Year',
      startDate: thisYear.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    },
    last30Days: {
      label: 'Last 30 Days',
      startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    },
    last90Days: {
      label: 'Last 90 Days',
      startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }
  };
};
