import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, Users, Clock, CheckCircle, AlertTriangle, 
  Star, TrendingUp, Calendar, FileText, Download,
  Plus, Filter, Search, Trash2, Eye, BarChart3
} from 'lucide-react';
import ServiceMetricsCards from '../../components/service-reports/ServiceMetricsCards';
import ServiceReportGenerationModal from '../../components/service-reports/ServiceReportGenerationModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import * as serviceReportsService from '../../services/serviceReportsService';

const ServiceReportsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [reports, setReports] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadReports();
  }, []);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const loadDashboardData = async () => {
    try {
      const response = await serviceReportsService.getDashboardSummary();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await serviceReportsService.getMyReports();
      setReports(response.data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportData) => {
    try {
      let response;
      if (reportData.reportType === 'installation_performance') {
        response = await serviceReportsService.generateInstallationPerformanceReport(reportData);
      } else if (reportData.reportType === 'task_efficiency') {
        response = await serviceReportsService.generateTaskEfficiencyReport(reportData);
      }
      
      showToast('Report generated successfully!');
      setShowGenerateModal(false);
      loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Failed to generate report', 'error');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await serviceReportsService.deleteReport(reportId);
      showToast('Report deleted successfully!');
      loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      showToast('Failed to delete report', 'error');
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const response = await serviceReportsService.getReport(reportId);
      // Here you could open a modal or navigate to a detailed view
      console.log('Report details:', response.data);
      showToast('Report loaded successfully!');
    } catch (error) {
      console.error('Error viewing report:', error);
      showToast('Failed to load report', 'error');
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.reportName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || report.reportType === filterType;
    return matchesSearch && matchesFilter;
  });

  const getReportTypeLabel = (type) => {
    const labels = {
      'installation_performance': 'Installation Performance',
      'task_efficiency': 'Task Efficiency'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'text-green-600 bg-green-100',
      'processing': 'text-blue-600 bg-blue-100',
      'failed': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Messages */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-white text-sm ${
              toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                </div>
                Service Reports & Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Track your installation performance and service efficiency
              </p>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dashboard Metrics */}
        {dashboardData && <ServiceMetricsCards data={dashboardData} />}

        {/* Reports Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Generated Reports
              </h2>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm w-full sm:w-64"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="installation_performance">Installation Performance</option>
                  <option value="task_efficiency">Task Efficiency</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No reports found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Generate your first report to get started'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Report Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Generated</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredReports.map((report) => (
                        <tr key={report._id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{report.reportName}</div>
                            <div className="text-sm text-gray-500">
                              {report.reportPeriod?.startDate && report.reportPeriod?.endDate && (
                                `${new Date(report.reportPeriod.startDate).toLocaleDateString()} - ${new Date(report.reportPeriod.endDate).toLocaleDateString()}`
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {getReportTypeLabel(report.reportType)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.reportStatus)}`}>
                              {report.reportStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewReport(report.reportId)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                title="View Report"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReport(report.reportId)}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
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

                {/* Mobile View */}
                <div className="sm:hidden space-y-4">
                  {filteredReports.map((report) => (
                    <div key={report._id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {report.reportName}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {getReportTypeLabel(report.reportType)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.reportStatus)}`}>
                          {report.reportStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewReport(report.reportId)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.reportId)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <ServiceReportGenerationModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateReport}
          userRole={user?.role}
        />
      )}
    </div>
  );
};

export default ServiceReportsPage;

