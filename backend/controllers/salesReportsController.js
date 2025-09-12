const Report = require('../models/Report');
const SalesAnalyticsService = require('../utils/salesAnalyticsService');
const User = require('../models/User');
const { errorHandler, AppError } = require('../utils/errorHandler');
const PDFReportService = require('../utils/pdfReportService');
const ExcelReportService = require('../utils/excelReportService');

/**
 * Sales Reports Controller
 * Handles all sales reporting and analytics endpoints
 */

// @desc    Generate sales performance report
// @route   POST /api/reports/sales/performance
// @access  Private (sales_person, sales_head, marketing_coordinator)
exports.generateSalesPerformanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, reportType = 'sales_performance', filters = {} } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Validate required fields
    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    SalesAnalyticsService.validateDateRange(start, end);

    // Determine report scope based on user role
    let targetUserId = userId;
    if (userRole === 'sales_head' && req.body.salesPersonId) {
      targetUserId = req.body.salesPersonId;
      
      // Verify the requested sales person exists and is under this sales head
      const salesPerson = await User.findById(targetUserId);
      if (!salesPerson || salesPerson.role !== 'sales_person') {
        return next(new AppError('Invalid sales person ID', 400));
      }
    }

    console.log(`Generating sales performance report for user ${targetUserId} from ${start} to ${end}`);

    // Generate unique report ID
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    const reportId = `RPT-SAL-${timestamp}-${randomStr}`;

    // Create report record
    const report = new Report({
      reportId: reportId,
      reportName: `Sales Performance Report - ${start.toDateString()} to ${end.toDateString()}`,
      reportType,
      reportCategory: userRole === 'sales_head' ? 'team' : 'individual',
      generatedBy: userId,
      generatedFor: targetUserId,
      accessLevel: 'private',
      allowedRoles: [userRole],
      reportPeriod: {
        startDate: start,
        endDate: end,
        periodType: calculatePeriodType(start, end)
      },
      filters,
      reportStatus: 'generating'
    });

    await report.save();

    // Generate analytics data
    try {
      const analyticsData = await SalesAnalyticsService.generateSalesPerformanceData(
        targetUserId, 
        start, 
        end, 
        filters
      );

      // Update report with generated data
      report.reportData = analyticsData;
      report.dataPoints = calculateDataPoints(analyticsData);
      await report.updateStatus('completed');

      res.status(200).json({
        success: true,
        message: 'Sales performance report generated successfully',
        data: {
          reportId: report.reportId,
          report: {
            ...report.toObject(),
            reportData: analyticsData
          }
        }
      });

    } catch (analyticsError) {
      console.error('Error generating analytics:', analyticsError);
      
      // Update report status to failed
      report.errorLogs.push({
        error: analyticsError.message,
        errorCode: 'ANALYTICS_GENERATION_FAILED',
        stackTrace: analyticsError.stack
      });
      await report.updateStatus('failed');

      return next(new AppError('Failed to generate report analytics', 500));
    }

  } catch (error) {
    console.error('Error in generateSalesPerformanceReport:', error);
    return next(new AppError(error.message, 500));
  }
};

// @desc    Get user's reports list
// @route   GET /api/reports/sales/my-reports
// @access  Private (sales_person, sales_head, marketing_coordinator)
exports.getMyReports = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, reportType, status, period = 30 } = req.query;

    // Build query filter
    const filter = {
      $or: [
        { generatedBy: userId },
        { generatedFor: userId },
        { 'sharedWith.userId': userId }
      ]
    };

    if (reportType) {
      filter.reportType = reportType;
    }

    if (status) {
      filter.reportStatus = status;
    }

    // Add date filter for period
    const periodDays = parseInt(period);
    if (periodDays > 0) {
      const startDate = new Date(Date.now() - (periodDays * 24 * 60 * 60 * 1000));
      filter.createdAt = { $gte: startDate };
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [reports, totalReports] = await Promise.all([
      Report.find(filter)
        .populate('generatedBy', 'name email role')
        .populate('generatedFor', 'name email role')
        .select('-reportData -errorLogs -viewHistory') // Exclude heavy data for list view
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalReports / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalReports,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in getMyReports:', error);
    return next(new AppError(error.message, 500));
  }
};

// @desc    Get specific report details
// @route   GET /api/reports/sales/:reportId
// @access  Private (sales_person, sales_head, marketing_coordinator)
exports.getReportDetails = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;

    // Find report with access validation
    const report = await Report.findOne({
      reportId,
      $or: [
        { generatedBy: userId },
        { generatedFor: userId },
        { 'sharedWith.userId': userId },
        { accessLevel: 'public' }
      ]
    })
    .populate('generatedBy', 'name email role')
    .populate('generatedFor', 'name email role');

    if (!report) {
      return next(new AppError('Report not found or access denied', 404));
    }

    // Add view history
    await report.addView(userId, req.ip, req.get('User-Agent'));

    res.status(200).json({
      success: true,
      data: {
        report
      }
    });

  } catch (error) {
    console.error('Error in getReportDetails:', error);
    return next(new AppError(error.message, 500));
  }
};

// @desc    Export report to PDF
// @route   GET /api/reports/sales/:reportId/export/pdf
// @access  Private (sales_person, sales_head, marketing_coordinator)
exports.exportReportToPDF = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;

    // Find and validate report access
    const report = await Report.findOne({
      reportId,
      $or: [
        { generatedBy: userId },
        { generatedFor: userId },
        { 'sharedWith.userId': userId }
      ]
    })
    .populate('generatedBy', 'name email role')
    .populate('generatedFor', 'name email role');

    if (!report) {
      return next(new AppError('Report not found or access denied', 404));
    }

    if (report.reportStatus !== 'completed') {
      return next(new AppError('Report is not ready for export', 400));
    }

    console.log(`Exporting report ${reportId} to PDF for user ${userId}`);

    // Generate PDF
    const pdfBuffer = await PDFReportService.generateSalesReportPDF(report);
    
    // Update export information
    const existingPDFExport = report.exportFormats.find(exp => exp.format === 'pdf');
    if (existingPDFExport) {
      existingPDFExport.downloadCount += 1;
      existingPDFExport.lastDownloaded = new Date();
    } else {
      report.exportFormats.push({
        format: 'pdf',
        fileSize: pdfBuffer.length,
        downloadCount: 1,
        lastDownloaded: new Date()
      });
    }
    
    await report.save();

    // Set headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Sales_Report_${reportId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error exporting report to PDF:', error);
    return next(new AppError('Failed to export report to PDF', 500));
  }
};

// @desc    Export report to Excel
// @route   GET /api/reports/sales/:reportId/export/excel
// @access  Private (sales_person, sales_head, marketing_coordinator)
exports.exportReportToExcel = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;

    // Find and validate report access
    const report = await Report.findOne({
      reportId,
      $or: [
        { generatedBy: userId },
        { generatedFor: userId },
        { 'sharedWith.userId': userId }
      ]
    });

    if (!report) {
      return next(new AppError('Report not found or access denied', 404));
    }

    if (report.reportStatus !== 'completed') {
      return next(new AppError('Report is not ready for export', 400));
    }

    console.log(`Exporting report ${reportId} to Excel for user ${userId}`);

    // Generate Excel file
    const excelBuffer = await ExcelReportService.generateSalesReportExcel(report);
    
    // Update export information
    const existingExcelExport = report.exportFormats.find(exp => exp.format === 'excel');
    if (existingExcelExport) {
      existingExcelExport.downloadCount += 1;
      existingExcelExport.lastDownloaded = new Date();
    } else {
      report.exportFormats.push({
        format: 'excel',
        fileSize: excelBuffer.length,
        downloadCount: 1,
        lastDownloaded: new Date()
      });
    }
    
    await report.save();

    // Set headers and send Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Sales_Report_${reportId}.xlsx"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);

  } catch (error) {
    console.error('Error exporting report to Excel:', error);
    return next(new AppError('Failed to export report to Excel', 500));
  }
};

// @desc    Generate lead analysis report
// @route   POST /api/reports/sales/leads
// @access  Private (sales_person, sales_head, marketing_coordinator)
exports.generateLeadAnalysisReport = async (req, res, next) => {
  try {
    const { startDate, endDate, filters = {} } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    SalesAnalyticsService.validateDateRange(start, end);

    // Generate unique report ID
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    const reportId = `RPT-LEA-${timestamp}-${randomStr}`;

    // Create report record
    const report = new Report({
      reportId: reportId,
      reportName: `Lead Analysis Report - ${start.toDateString()} to ${end.toDateString()}`,
      reportType: 'lead_analysis',
      reportCategory: 'individual',
      generatedBy: userId,
      generatedFor: userId,
      reportPeriod: {
        startDate: start,
        endDate: end,
        periodType: calculatePeriodType(start, end)
      },
      filters,
      reportStatus: 'generating'
    });

    await report.save();

    // Generate lead-specific analytics
    try {
      const analyticsData = await SalesAnalyticsService.generateSalesPerformanceData(
        userId, 
        start, 
        end, 
        filters
      );

      // Focus on lead-specific data
      const leadFocusedData = {
        kpis: {
          totalLeads: analyticsData.kpis.totalLeads,
          convertedLeads: analyticsData.kpis.convertedLeads,
          conversionRate: analyticsData.kpis.conversionRate,
          avgResponseTime: analyticsData.kpis.avgResponseTime
        },
        analytics: {
          leadSourceBreakdown: analyticsData.analytics.leadSourceBreakdown,
          timeAnalysis: analyticsData.analytics.timeAnalysis
        },
        trends: analyticsData.trends
      };

      report.reportData = leadFocusedData;
      await report.updateStatus('completed');

      res.status(200).json({
        success: true,
        message: 'Lead analysis report generated successfully',
        data: {
          reportId: report.reportId,
          report: {
            ...report.toObject(),
            reportData: leadFocusedData
          }
        }
      });

    } catch (analyticsError) {
      report.errorLogs.push({
        error: analyticsError.message,
        errorCode: 'LEAD_ANALYTICS_FAILED'
      });
      await report.updateStatus('failed');
      return next(new AppError('Failed to generate lead analytics', 500));
    }

  } catch (error) {
    console.error('Error in generateLeadAnalysisReport:', error);
    return next(new AppError(error.message, 500));
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/sales/:reportId
// @access  Private (sales_person, sales_head, marketing_coordinator)
exports.deleteReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;

    // Find report and validate ownership
    const report = await Report.findOne({
      reportId,
      generatedBy: userId // Only allow deletion by report creator
    });

    if (!report) {
      return next(new AppError('Report not found or access denied', 404));
    }

    // Don't allow deletion of scheduled reports
    if (report.isScheduled) {
      return next(new AppError('Cannot delete scheduled reports', 400));
    }

    await Report.deleteOne({ _id: report._id });

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteReport:', error);
    return next(new AppError(error.message, 500));
  }
};

// @desc    Get sales dashboard summary
// @route   GET /api/reports/sales/dashboard
// @access  Private (sales_person, sales_head, marketing_coordinator)
exports.getSalesDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get current month data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Generate quick analytics for dashboard
    const dashboardData = await SalesAnalyticsService.generateSalesPerformanceData(
      userId,
      startOfMonth,
      endOfMonth,
      {}
    );

    // Get recent reports
    const recentReports = await Report.find({
      $or: [
        { generatedBy: userId },
        { generatedFor: userId }
      ]
    })
    .select('reportId reportName reportType reportStatus createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    // Calculate quick stats
    const quickStats = {
      thisMonth: {
        leads: dashboardData.kpis.totalLeads,
        quotations: dashboardData.kpis.totalQuotations,
        sales: dashboardData.kpis.convertedLeads,
        revenue: dashboardData.kpis.totalRevenue
      },
      performance: {
        conversionRate: dashboardData.kpis.conversionRate,
        quotationSuccessRate: dashboardData.kpis.quotationSuccessRate,
        avgDealSize: dashboardData.kpis.averageDealSize
      },
      recentReports: recentReports
    };

    res.status(200).json({
      success: true,
      data: {
        dashboard: quickStats,
        period: {
          start: startOfMonth,
          end: endOfMonth,
          type: 'monthly'
        }
      }
    });

  } catch (error) {
    console.error('Error in getSalesDashboard:', error);
    return next(new AppError(error.message, 500));
  }
};

/**
 * Helper Functions
 */

// Calculate period type based on date range
function calculatePeriodType(startDate, endDate) {
  const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) return 'daily';
  if (diffDays <= 7) return 'weekly';
  if (diffDays <= 31) return 'monthly';
  if (diffDays <= 92) return 'quarterly';
  if (diffDays <= 365) return 'yearly';
  return 'custom';
}

// Calculate total data points in report
function calculateDataPoints(analyticsData) {
  let points = 0;
  
  if (analyticsData.analytics) {
    points += analyticsData.analytics.leadSourceBreakdown?.length || 0;
    points += analyticsData.analytics.productPerformance?.length || 0;
    points += analyticsData.analytics.customerSegmentation?.length || 0;
  }
  
  if (analyticsData.trends) {
    points += analyticsData.trends.dailyMetrics?.length || 0;
    points += analyticsData.trends.weeklyMetrics?.length || 0;
    points += analyticsData.trends.monthlyMetrics?.length || 0;
  }
  
  return points;
}
