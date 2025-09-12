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
  Filter
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <ToastContainer />
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">
                Track performance, analyze trends, and generate insights
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setSelectedReportType('lead_analysis');
                  setShowGenerateModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Lead Analysis
              </button>
              <button
                onClick={() => {
                  setSelectedReportType('sales_performance');
                  setShowGenerateModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <FileText className="h-5 w-5 mr-2" />
                Performance Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sales Metrics Cards */}
        {dashboardData && (
          <SalesMetricsCards 
            data={dashboardData.dashboard}
            period={dashboardData.period}
          />
        )}

        {/* Reports Section */}
        <div className="bg-white rounded-lg shadow-sm border mt-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
              <h2 className="text-lg font-semibold text-gray-900">Your Reports</h2>
              
              {/* Filters */}
              <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3 sm:items-center">
                <select
                  value={reportFilters.reportType}
                  onChange={(e) => handleFilterChange('reportType', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full sm:w-auto"
                >
                  <option value="">All Types</option>
                  <option value="sales_performance">Performance Reports</option>
                  <option value="lead_analysis">Lead Analysis</option>
                </select>
                
                <select
                  value={reportFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full sm:w-auto"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="generating">Generating</option>
                  <option value="failed">Failed</option>
                </select>
                
                <select
                  value={reportFilters.period}
                  onChange={(e) => handleFilterChange('period', parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full sm:w-auto"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="p-6">
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-600 mb-6">
                  Generate your first report to start tracking your sales performance.
                </p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Generate Report
                </button>
              </div>
            ) : (
              <>
                {/* Mobile list */}
                <div className="md:hidden space-y-3">
                  {reports.map((report) => (
                    <div key={report._id} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{report.reportName}</div>
                          <div className="text-[11px] text-gray-500 mt-1">ID: {report.reportId}</div>
                          <div className="text-xs text-gray-700 mt-2 capitalize">{report.reportType.replace('_', ' ')}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatDateTime(report.createdAt)}</div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-[10px] font-semibold rounded-full h-fit ${getStatusBadgeColor(report.reportStatus)}`}>
                          {report.reportStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-2">
                        {report.reportStatus === 'completed' && (
                          <>
                            <button
                              onClick={() => handleExportReport(report.reportId, 'pdf')}
                              className="text-blue-600 hover:text-blue-900 p-1.5 rounded border border-gray-200"
                              title="Export as PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleExportReport(report.reportId, 'excel')}
                              className="text-green-600 hover:text-green-900 p-1.5 rounded border border-gray-200"
                              title="Export as Excel"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteReport(report.reportId)}
                          className="text-red-600 hover:text-red-900 p-1.5 rounded border border-gray-200"
                          title="Delete Report"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Report
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Generated
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.map((report) => (
                        <tr key={report._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{report.reportName}</div>
                              <div className="text-sm text-gray-500">ID: {report.reportId}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 capitalize">
                              {report.reportType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.reportStatus)}`}>
                              {report.reportStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(report.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {report.reportStatus === 'completed' && (
                                <>
                                  <button
                                    onClick={() => handleExportReport(report.reportId, 'pdf')}
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                    title="Export as PDF"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleExportReport(report.reportId, 'excel')}
                                    className="text-green-600 hover:text-green-900 p-1 rounded"
                                    title="Export as Excel"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteReport(report.reportId)}
                                className="text-red-600 hover:text-red-900 p-1 rounded"
                                title="Delete Report"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalReports)} of {pagination.totalReports} reports
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
  );
};

export default SalesReportsPage;
