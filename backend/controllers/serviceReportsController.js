const CustomerPurchase = require('../models/CustomerPurchase');
const OrderTracking = require('../models/OrderTracking');
const User = require('../models/User');
const Report = require('../models/Report');
const { errorHandler } = require('../utils/errorHandler');

// @desc    Get service dashboard summary for service engineers
// @route   GET /api/reports/service/dashboard
// @access  Private (Service Engineer)
exports.getServiceDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    // Base query - service engineers only see their own data
    const baseQuery = userRole === 'service_engineer' 
      ? { assignedEngineerId: userId }
      : {}; // Product heads can see all data
    
    // Current month date range
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    
    // Get key metrics
    const [
      totalAssignedTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      averageRating,
      completedThisMonth,
      issuesReported
    ] = await Promise.all([
      // Total assigned tasks
      CustomerPurchase.countDocuments({
        ...baseQuery,
        serviceTaskStatus: { $ne: 'pending_assignment' }
      }),
      
      // Completed tasks
      CustomerPurchase.countDocuments({
        ...baseQuery,
        installationStatus: 'completed'
      }),
      
      // Pending tasks
      CustomerPurchase.countDocuments({
        ...baseQuery,
        serviceTaskStatus: { $in: ['assigned', 'ready_to_dispatch', 'installation_date_allocated'] },
        installationStatus: { $ne: 'completed' }
      }),
      
      // In progress tasks
      CustomerPurchase.countDocuments({
        ...baseQuery,
        installationStatus: 'in_progress'
      }),
      
      // Average customer rating
      CustomerPurchase.aggregate([
        { $match: { ...baseQuery, 'customerSignoffData.overallRating': { $exists: true, $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$customerSignoffData.overallRating' } } }
      ]),
      
      // Completed this month
      CustomerPurchase.countDocuments({
        ...baseQuery,
        installationStatus: 'completed',
        workCompletedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      
      // Issues reported
      CustomerPurchase.countDocuments({
        ...baseQuery,
        'issuesReported.0': { $exists: true },
        'issuesReported.resolved': false
      })
    ]);
    
    // Calculate completion rate
    const completionRate = totalAssignedTasks > 0 
      ? Math.round((completedTasks / totalAssignedTasks) * 100) 
      : 0;
    
    // Get recent activity
    const recentActivity = await CustomerPurchase.find({
      ...baseQuery,
      $or: [
        { installationStatus: { $in: ['completed', 'in_progress'] } },
        { serviceTaskStatus: 'assigned' }
      ]
    })
    .populate('customerId', 'firstName lastName')
    .populate('quotationId', 'quotationNumber')
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('purchaseID installationStatus serviceTaskStatus updatedAt customerId quotationId');

    const dashboardData = {
      metrics: {
        totalAssignedTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        completionRate,
        averageRating: averageRating.length > 0 ? averageRating[0].avgRating : 0,
        completedThisMonth,
        issuesReported
      },
      recentActivity: recentActivity.map(task => ({
        id: task._id,
        purchaseID: task.purchaseID,
        customerName: `${task.customerId?.firstName || ''} ${task.customerId?.lastName || ''}`.trim(),
        quotationNumber: task.quotationId?.quotationNumber,
        status: task.installationStatus,
        serviceStatus: task.serviceTaskStatus,
        updatedAt: task.updatedAt
      }))
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Generate installation performance report
// @route   POST /api/reports/service/installation-performance
// @access  Private (Service Engineer)
exports.generateInstallationPerformanceReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { startDate, endDate, engineerId } = req.body;
    
    // Service engineers can only generate reports for themselves
    const targetEngineerId = userRole === 'service_engineer' ? userId : (engineerId || userId);
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.workCompletedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Generate report data
    const installations = await CustomerPurchase.find({
      assignedEngineerId: targetEngineerId,
      installationStatus: 'completed',
      ...dateFilter
    })
    .populate('customerId', 'firstName lastName email phone')
    .populate('quotationId', 'quotationNumber totalAmount')
    .sort({ workCompletedAt: -1 });
    
    // Calculate metrics
    const totalInstallations = installations.length;
    const averageRating = installations.reduce((sum, inst) => 
      sum + (inst.customerSignoffData?.overallRating || 0), 0) / totalInstallations || 0;
    
    const averageCompletionTime = installations.reduce((sum, inst) => {
      if (inst.workStartedAt && inst.workCompletedAt) {
        return sum + (new Date(inst.workCompletedAt) - new Date(inst.workStartedAt));
      }
      return sum;
    }, 0) / installations.filter(inst => inst.workStartedAt && inst.workCompletedAt).length || 0;
    
    const issuesCount = installations.reduce((sum, inst) => 
      sum + (inst.issuesReported?.length || 0), 0);
    
    // Create report record
    const report = new Report({
      reportName: `Installation Performance Report - ${new Date().toLocaleDateString()}`,
      reportType: 'installation_performance',
      reportCategory: 'service',
      generatedBy: req.user._id,
      generatedFor: targetEngineerId,
      accessLevel: 'personal',
      reportPeriod: {
        startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate) : new Date(),
        periodType: 'custom'
      },
      reportData: {
        summary: {
          totalInstallations,
          averageRating: Math.round(averageRating * 10) / 10,
          averageCompletionTimeHours: Math.round(averageCompletionTime / (1000 * 60 * 60) * 10) / 10,
          issuesReported: issuesCount,
          successRate: Math.round(((totalInstallations - issuesCount) / totalInstallations) * 100) || 100
        },
        installations: installations.map(inst => ({
          purchaseID: inst.purchaseID,
          customerName: `${inst.customerId?.firstName || ''} ${inst.customerId?.lastName || ''}`.trim(),
          quotationNumber: inst.quotationId?.quotationNumber,
          amount: inst.quotationId?.totalAmount,
          completedAt: inst.workCompletedAt,
          rating: inst.customerSignoffData?.overallRating,
          issues: inst.issuesReported?.length || 0,
          feedback: inst.customerSignoffData?.customerFeedback
        }))
      },
      reportStatus: 'completed'
    });
    
    // Generate reportId
    report.reportId = report.generateReportId();
    await report.save();

    res.status(201).json({
      success: true,
      message: 'Installation performance report generated successfully',
      data: {
        reportId: report.reportId,
        report: report
      }
    });

  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Generate task efficiency report
// @route   POST /api/reports/service/task-efficiency
// @access  Private (Service Engineer)
exports.generateTaskEfficiencyReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { startDate, endDate, engineerId } = req.body;
    
    const targetEngineerId = userRole === 'service_engineer' ? userId : (engineerId || userId);
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get all tasks assigned to engineer
    const tasks = await CustomerPurchase.find({
      assignedEngineerId: targetEngineerId,
      ...dateFilter
    })
    .populate('customerId', 'firstName lastName')
    .populate('quotationId', 'quotationNumber')
    .sort({ updatedAt: -1 });
    
    // Calculate efficiency metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.installationStatus === 'completed').length;
    const inProgressTasks = tasks.filter(task => task.installationStatus === 'in_progress').length;
    const pendingTasks = tasks.filter(task => 
      ['assigned', 'ready_to_dispatch', 'installation_date_allocated'].includes(task.serviceTaskStatus) &&
      task.installationStatus !== 'completed'
    ).length;
    
    // Task status distribution
    const statusDistribution = {
      completed: completedTasks,
      inProgress: inProgressTasks,
      pending: pendingTasks,
      issues: tasks.filter(task => task.installationStatus === 'issues').length
    };
    
    // Average time from assignment to completion
    const completedTasksWithTimes = tasks.filter(task => 
      task.installationStatus === 'completed' && 
      task.engineerAcceptedAt && 
      task.workCompletedAt
    );
    
    const averageTaskTime = completedTasksWithTimes.reduce((sum, task) => {
      return sum + (new Date(task.workCompletedAt) - new Date(task.engineerAcceptedAt));
    }, 0) / completedTasksWithTimes.length || 0;
    
    // Create report record
    const report = new Report({
      reportName: `Task Efficiency Report - ${new Date().toLocaleDateString()}`,
      reportType: 'task_efficiency',
      reportCategory: 'service',
      generatedBy: req.user._id,
      generatedFor: targetEngineerId,
      accessLevel: 'personal',
      reportPeriod: {
        startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate) : new Date(),
        periodType: 'custom'
      },
      reportData: {
        summary: {
          totalTasks,
          completionRate: Math.round((completedTasks / totalTasks) * 100) || 0,
          averageTaskTimeDays: Math.round(averageTaskTime / (1000 * 60 * 60 * 24) * 10) / 10,
          statusDistribution
        },
        tasks: tasks.map(task => ({
          purchaseID: task.purchaseID,
          customerName: `${task.customerId?.firstName || ''} ${task.customerId?.lastName || ''}`.trim(),
          serviceStatus: task.serviceTaskStatus,
          installationStatus: task.installationStatus,
          assignedAt: task.createdAt,
          acceptedAt: task.engineerAcceptedAt,
          completedAt: task.workCompletedAt,
          issues: task.issuesReported?.length || 0
        }))
      },
      reportStatus: 'completed'
    });
    
    report.reportId = report.generateReportId();
    await report.save();

    res.status(201).json({
      success: true,
      message: 'Task efficiency report generated successfully',
      data: {
        reportId: report.reportId,
        report: report
      }
    });

  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get service engineer's reports
// @route   GET /api/reports/service/my-reports
// @access  Private (Service Engineer)
exports.getMyServiceReports = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, reportType, status } = req.query;
    
    const query = {
      $or: [
        { generatedBy: userId },
        { generatedFor: userId }
      ],
      reportCategory: 'service'
    };
    
    if (reportType) {
      query.reportType = reportType;
    }
    
    if (status) {
      query.reportStatus = status;
    }
    
    const reports = await Report.find(query)
      .populate('generatedBy', 'name email')
      .populate('generatedFor', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalReports = await Report.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: reports.length,
      totalPages: Math.ceil(totalReports / limit),
      currentPage: page,
      data: reports
    });

  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get specific service report
// @route   GET /api/reports/service/:reportId
// @access  Private (Service Engineer)
exports.getServiceReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;
    
    const report = await Report.findOne({
      reportId,
      $or: [
        { generatedBy: userId },
        { generatedFor: userId }
      ],
      reportCategory: 'service'
    })
    .populate('generatedBy', 'name email')
    .populate('generatedFor', 'name email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Service report not found'
      });
    }
    
    // Add view to report history
    await report.addView(userId, req.ip);
    
    res.status(200).json({
      success: true,
      data: report
    });

  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Delete service report
// @route   DELETE /api/reports/service/:reportId
// @access  Private (Service Engineer)
exports.deleteServiceReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;
    
    const report = await Report.findOneAndDelete({
      reportId,
      generatedBy: userId, // Only creator can delete
      reportCategory: 'service'
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Service report not found or you do not have permission to delete it'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Service report deleted successfully'
    });

  } catch (error) {
    errorHandler(res, error);
  }
};

