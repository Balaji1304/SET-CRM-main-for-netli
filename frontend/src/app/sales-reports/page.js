'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, 
  FileText, 
  Download,
  Calendar,
  Plus,
  Eye,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import {
  getSalesDashboard,
  getMyReports,
  generateSalesPerformanceReport,
  generateLeadAnalysisReport,
  exportReportToPDF,
  exportReportToExcel,
  deleteReport,
  getDefaultDateRanges,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDateTime,
  getStatusBadgeColor
} from '../../services/salesReportsService';

import SalesMetricsCards from '../../components/reports/SalesMetricsCards';
import ReportGenerationModal from '../../components/reports/ReportGenerationModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ToastContainer } from '../../components/Toast';

// Custom styles for mobile responsive design
const customStyles = `
  .mobile-action-compact {
    padding: 6px !important;
    margin: 0 1px !important;
  }
  
  .mobile-action-buttons {
    gap: 2px !important;
  }
  
  .mobile-card-compact {
    padding: 12px;
    margin-bottom: 8px;
  }
  
  .mobile-card-container {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .mobile-header-text {
    font-size: 16px !important;
    line-height: 1.4 !important;
  }
  
  .mobile-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  
  .line-clamp {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .touch-target {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  @media (max-width: 640px) {
    .mobile-card-compact {
      padding: 10px;
      margin-bottom: 6px;
    }
    
    .mobile-header-text {
      font-size: 15px !important;
      line-height: 1.3 !important;
    }
    
    .mobile-action-buttons {
      gap: 3px !important;
    }
  }
  
  @media (max-width: 480px) {
    .mobile-card-compact {
      padding: 8px;
      margin-bottom: 6px;
    }
    
    .mobile-header-text {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
    
    .mobile-action-buttons {
      gap: 2px !important;
    }
    
    .mobile-action-compact {
      padding: 5px !important;
    }
  }
  
  @media (max-width: 375px) {
    .mobile-card-compact {
      padding: 6px;
      margin-bottom: 4px;
    }
    
    .mobile-header-text {
      font-size: 13px !important;
      line-height: 1.2 !important;
    }
    
    .mobile-action-buttons {
      gap: 1px !important;
    }
    
    .mobile-action-compact {
      padding: 4px !important;
      margin: 0 !important;
    }
  }
  
  @media (max-width: 320px) {
    .mobile-card-compact {
      padding: 4px;
      margin-bottom: 3px;
    }
    
    .mobile-header-text {
      font-size: 12px !important;
      line-height: 1.2 !important;
    }
  }
  
  /* Mobile header specific styles */
  .mobile-header-container {
    gap: 16px;
  }
  
  .mobile-button-full {
    width: 100%;
    justify-content: center;
  }
  
  @media (max-width: 640px) {
    .mobile-header-container {
      gap: 12px;
    }
    
    .mobile-button-full {
      min-height: 44px;
      padding: 10px 16px;
    }
  }
  
  @media (max-width: 480px) {
    .mobile-header-container {
      gap: 10px;
    }
    
    .mobile-button-full {
      min-height: 40px;
      padding: 8px 12px;
      font-size: 13px;
    }
    
    .mobile-button-full span {
      font-size: 13px;
    }
  }
  
  @media (max-width: 375px) {
    .mobile-header-container {
      gap: 8px;
    }
    
    .mobile-button-full {
      min-height: 38px;
      padding: 6px 10px;
      font-size: 12px;
    }
    
    .mobile-button-full span {
      font-size: 12px;
    }
    
    .mobile-button-full svg {
      width: 14px !important;
      height: 14px !important;
    }
  }
  
  @media (max-width: 320px) {
    .mobile-header-container {
      gap: 6px;
    }
    
    .mobile-button-full {
      min-height: 36px;
      padding: 5px 8px;
      font-size: 11px;
    }
    
    .mobile-button-full span {
      font-size: 11px;
    }
    
    .mobile-button-full svg {
      width: 12px !important;
      height: 12px !important;
    }
  }
  
  /* Tablet and Small Desktop Responsive Design */
  
  /* Large tablets and small desktops - 768px to 1024px */
  @media (min-width: 768px) and (max-width: 1024px) {
    /* Compact table styling */
    .compact-table-cell {
      padding-left: 0.5rem !important;
      padding-right: 0.5rem !important;
    }
    
    .compact-font {
      font-size: 0.75rem !important;
    }
    
    .compact-badge {
      padding: 0.125rem 0.375rem !important;
      font-size: 0.625rem !important;
    }
    
    .compact-button {
      padding: 0.25rem 0.5rem !important;
      font-size: 0.625rem !important;
    }
    
    /* Responsive filter grid */
    .tablet-filter-grid {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
      gap: 0.5rem !important;
    }
    
    /* Header adjustments */
    .tablet-header {
      font-size: 1.25rem !important;
      line-height: 1.75rem !important;
    }
    
    .tablet-subheader {
      font-size: 0.75rem !important;
    }
    
    /* Card adaptations */
    .tablet-card-compact {
      padding: 0.75rem !important;
      margin-bottom: 0.5rem !important;
    }
    
    /* Action button sizing */
    .tablet-action-compact {
      padding: 0.375rem !important;
      margin: 0 0.125rem !important;
    }
  }
  
  /* Medium tablets - 641px to 768px */
  @media (min-width: 641px) and (max-width: 768px) {
    .tablet-transition {
      font-size: 0.875rem !important;
    }
    
    .tablet-transition-padding {
      padding: 0.625rem !important;
    }
    
    .tablet-transition-gap {
      gap: 0.375rem !important;
    }
    
    /* Filter layout for medium tablets */
    .medium-tablet-filters {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 0.75rem !important;
    }
    
    /* Button sizing for medium tablets */
    .medium-tablet-button {
      padding: 0.5rem 0.75rem !important;
      font-size: 0.8125rem !important;
    }
  }
  
  /* Large screens with tight spacing - 1025px to 1280px */
  @media (min-width: 1025px) and (max-width: 1280px) {
    .desktop-compact {
      padding-left: 0.75rem !important;
      padding-right: 0.75rem !important;
    }
    
    .desktop-compact-font {
      font-size: 0.8125rem !important;
    }
    
    /* Tighter spacing for smaller desktops */
    .desktop-spacing {
      gap: 0.5rem !important;
      margin-bottom: 1rem !important;
    }
  }
  
  /* Responsive utility classes */
  .responsive-container {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
  }
  
  .responsive-grid {
    display: grid;
    gap: 1rem;
  }
  
  @media (min-width: 641px) {
    .responsive-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (min-width: 769px) {
    .responsive-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  
  @media (min-width: 1025px) {
    .responsive-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  
  /* Flexible text sizing */
  .responsive-text {
    font-size: clamp(0.75rem, 2vw, 1rem);
    line-height: 1.5;
  }
  
  .responsive-header {
    font-size: clamp(1.125rem, 4vw, 2rem);
    line-height: 1.25;
  }
  
  /* Adaptive spacing */
  .adaptive-padding {
    padding: clamp(0.5rem, 2vw, 1.5rem);
  }
  
  .adaptive-margin {
    margin: clamp(0.25rem, 1vw, 1rem);
  }
  
  /* Touch-friendly targets across all screen sizes */
  .universal-touch-target {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
  
  @media (min-width: 769px) {
    .universal-touch-target {
      min-height: 40px;
      min-width: 40px;
    }
  }
  
  @media (min-width: 1025px) {
    .universal-touch-target {
      min-height: 36px;
      min-width: 36px;
    }
  }
`;

const SalesReportsPage = () => {
  const { user } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [reports, setReports] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('sales_performance');
  const [reportFilters, setReportFilters] = useState({
    reportType: '',
    status: '',
    period: 30
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalReports: 0
  });
  const itemsPerPage = 10;
  
  // Load initial data
  useEffect(() => {
    loadDashboardData();
    loadReports();
  }, []);

  // Reload reports when filters change
  useEffect(() => {
    loadReports();
  }, [reportFilters, pagination.currentPage]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await getSalesDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const params = {
        page: pagination.currentPage,
        limit: 10,
        ...reportFilters
      };
      
      const response = await getMyReports(params);
      setReports(response.data.reports);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleGenerateReport = async (reportData) => {
    try {
      setLoading(true);
      
      let response;
      if (selectedReportType === 'sales_performance') {
        response = await generateSalesPerformanceReport(reportData);
      } else if (selectedReportType === 'lead_analysis') {
        response = await generateLeadAnalysisReport(reportData);
      }
      
      setShowGenerateModal(false);
      
      // Refresh reports list
      await loadReports();
      
      alert('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (reportId, format) => {
    try {
      if (format === 'pdf') {
        await exportReportToPDF(reportId);
      } else if (format === 'excel') {
        await exportReportToExcel(reportId);
      }
      if (window?.showToast) window.showToast(`Exported ${format.toUpperCase()} successfully`, 'success', 3000);
    } catch (error) {
      console.error(`Error exporting report to ${format}:`, error);
      if (window?.showToast) window.showToast(`Failed to export ${format.toUpperCase()}. Please try again.`, 'error', 4000);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await deleteReport(reportId);
        await loadReports();
        if (window?.showToast) window.showToast('Report deleted successfully', 'success', 3000);
      } catch (error) {
        console.error('Error deleting report:', error);
        if (window?.showToast) window.showToast('Failed to delete report', 'error', 4000);
      }
    }
  };

  const handleFilterChange = (field, value) => {
    setReportFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        <ToastContainer />
      
      {/* Header Section - Page Title */}
      <div className="border-b border-gray-200 pb-3 sm:pb-5 mb-4 sm:mb-8 adaptive-padding">
        <div className="mobile-header-container flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <h1 className="responsive-header text-lg sm:text-xl md:text-2xl lg:text-3xl tablet-header font-bold tracking-tight text-gray-900 mobile-truncate leading-tight">
              Sales Reports & Analytics
            </h1>
            <p className="responsive-text text-xs sm:text-sm tablet-subheader text-gray-600 mt-1 mobile-truncate">
              Track performance, analyze trends, and generate insights
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="mobile-header-container tablet-transition-gap flex flex-col sm:flex-row gap-2 sm:gap-3 desktop-spacing flex-shrink-0 w-full sm:w-auto">
            <button
              onClick={() => {
                setSelectedReportType('lead_analysis');
                setShowGenerateModal(true);
              }}
              className="mobile-button-full medium-tablet-button universal-touch-target bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm font-medium"
            >
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
              <span className="mobile-truncate">Lead Analysis</span>
            </button>
            <button
              onClick={() => {
                setSelectedReportType('sales_performance');
                setShowGenerateModal(true);
              }}
              className="mobile-button-full medium-tablet-button universal-touch-target bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm font-medium"
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
              <span className="mobile-truncate">Performance Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sales Metrics Cards */}
      {dashboardData && (
        <div className="mb-6 sm:mb-8">
          <SalesMetricsCards 
            data={dashboardData.dashboard}
            period={dashboardData.period}
          />
        </div>
      )}

      {/* Main Content Area - Contains filters and reports */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden responsive-container">
        {/* Filter and Action Bar */}
        <div className="adaptive-padding p-4 md:p-6 desktop-compact border-b border-gray-200 sticky top-0 bg-white z-20">
          <div className="flex flex-col tablet-transition-gap gap-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <h2 className="responsive-text text-lg sm:text-xl tablet-header font-semibold text-gray-900">Your Reports</h2>
            </div>
            
            {/* Filters Row */}
            <div className="responsive-grid grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 tablet-filter-grid medium-tablet-filters gap-3">
              <select
                value={reportFilters.reportType}
                onChange={(e) => handleFilterChange('reportType', e.target.value)}
                className="compact-font tablet-transition border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">All Types</option>
                <option value="sales_performance">Performance Reports</option>
                <option value="lead_analysis">Lead Analysis</option>
              </select>
              
              <select
                value={reportFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="compact-font tablet-transition border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="generating">Generating</option>
                <option value="failed">Failed</option>
              </select>
              
              <select
                value={reportFilters.period}
                onChange={(e) => handleFilterChange('period', parseInt(e.target.value))}
                className="compact-font tablet-transition border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <FileText className="h-16 w-16 mb-4 text-primary" />
                <p className="text-xl font-medium text-secondary mb-2">No reports found</p>
                <p className="text-gray-600 mb-6">
                  Generate your first report to start tracking your sales performance.
                </p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity inline-flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Generate Report
                </button>
              </div>
            ) : (
              <div className="adaptive-padding p-4 md:p-6 desktop-compact">
                {/* Mobile Card View */}
                <div className="md:hidden flex-1 overflow-y-auto">
                  <div className="tablet-transition-padding p-3 sm:p-4 space-y-3 sm:space-y-4 adaptive-margin">
                    {reports.map((report) => (
                      <div key={report._id} className="mobile-card-compact tablet-card-compact mobile-card-container rounded-lg border border-gray-200 space-y-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-1 sm:gap-2">
                          <div className="flex-1 min-w-0 max-w-[calc(100%-120px)] sm:max-w-[calc(100%-140px)]">
                            <h3 className="mobile-header-text responsive-text text-base sm:text-lg font-semibold text-gray-900 line-clamp leading-tight mb-1">
                              {report.reportName}
                            </h3>
                            <p className="compact-font text-xs sm:text-sm text-gray-500 mobile-truncate">ID: {report.reportId}</p>
                          </div>
                          <div className="mobile-action-buttons tablet-action-compact flex items-center gap-0.5 sm:gap-1 flex-shrink-0 w-[120px] sm:w-[140px] justify-end">
                            {report.reportStatus === 'completed' && (
                              <>
                                <button
                                  onClick={() => handleExportReport(report.reportId, 'pdf')}
                                  className="mobile-action-compact tablet-action-compact universal-touch-target p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                                  title="Export as PDF"
                                >
                                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={() => handleExportReport(report.reportId, 'excel')}
                                  className="mobile-action-compact tablet-action-compact universal-touch-target p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors duration-150"
                                  title="Export as Excel"
                                >
                                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteReport(report.reportId)}
                              className="mobile-action-compact tablet-action-compact universal-touch-target p-1 sm:p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                              title="Delete Report"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center justify-between">
                          <span className={`compact-badge inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.reportStatus)}`}>
                            {report.reportStatus}
                          </span>
                        </div>
                        
                        {/* Report Details */}
                        <div className="grid grid-cols-2 tablet-transition-gap gap-3">
                          <div>
                            <p className="compact-font text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Type</p>
                            <p className="responsive-text text-sm text-gray-900 capitalize mobile-truncate">{report.reportType.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="compact-font text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Generated</p>
                            <p className="responsive-text text-sm text-gray-900 mobile-truncate">{formatDateTime(report.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden responsive-container">
                  <div className="overflow-x-auto flex-1 relative">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="compact-table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Report
                            </th>
                            <th className="compact-table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="compact-table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="compact-table-cell px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Generated
                            </th>
                            <th className="compact-table-cell px-2 lg:px-4 xl:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reports.map((report) => (
                            <tr key={report._id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                              <td className="compact-table-cell px-2 lg:px-4 xl:px-6 py-4">
                                <div>
                                  <div className="desktop-compact-font font-medium text-gray-900 truncate">{report.reportName}</div>
                                  <div className="compact-font text-sm text-gray-500">ID: {report.reportId}</div>
                                </div>
                              </td>
                              <td className="compact-table-cell px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap">
                                <span className="desktop-compact-font text-sm text-gray-900 capitalize">
                                  {report.reportType.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="compact-table-cell px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap">
                                <span className={`compact-badge inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.reportStatus)}`}>
                                  {report.reportStatus}
                                </span>
                              </td>
                              <td className="compact-table-cell px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap compact-font text-sm text-gray-500">
                                {formatDateTime(report.createdAt)}
                              </td>
                              <td className="compact-table-cell px-2 lg:px-4 xl:px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end space-x-1 lg:space-x-2 tablet-transition-gap">
                                  {report.reportStatus === 'completed' && (
                                    <>
                                      <button
                                        onClick={() => handleExportReport(report.reportId, 'pdf')}
                                        className="compact-button universal-touch-target group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                                        title="Export as PDF"
                                      >
                                        <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleExportReport(report.reportId, 'excel')}
                                        className="compact-button universal-touch-target group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md border border-transparent hover:border-green-200"
                                        title="Export as Excel"
                                      >
                                        <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleDeleteReport(report.reportId)}
                                    className="compact-button universal-touch-target group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md border border-transparent hover:border-red-200"
                                    title="Delete Report"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="compact-table-cell px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0 tablet-transition-gap">
            <div className="responsive-text compact-font text-sm text-gray-600 order-2 sm:order-1">
              Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to {Math.min(pagination.currentPage * itemsPerPage, pagination.totalReports)} of {pagination.totalReports} results
            </div>
            <div className="flex items-center tablet-transition-gap gap-2 order-1 sm:order-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="universal-touch-target p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="responsive-text compact-font text-xs sm:text-sm text-gray-600 px-3 py-2 min-w-[80px] text-center"> 
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext}
                className="universal-touch-target p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Generation Modal */}
      {showGenerateModal && (
        <ReportGenerationModal
          reportType={selectedReportType}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateReport}
        />
      )}
      </div>
    </>
  );
};

export default SalesReportsPage;
