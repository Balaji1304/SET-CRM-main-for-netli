const mongoose = require('mongoose');

// Schema for storing generated reports metadata
const reportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Report Identification
  reportName: {
    type: String,
    required: [true, 'Report name is required'],
    trim: true
  },
  reportType: {
    type: String,
    required: [true, 'Report type is required'],
    enum: {
      values: [
        'sales_performance',
        'lead_analysis', 
        'quotation_performance',
        'revenue_analysis',
        'customer_analysis',
        'pipeline_analysis',
        'product_performance',
        'geographic_analysis',
        'time_period_analysis',
        'custom_report',
        'installation_performance',
        'task_efficiency'
      ],
      message: 'Invalid report type'
    }
  },
  reportCategory: {
    type: String,
    required: true,
    enum: {
      values: ['individual', 'team', 'company', 'comparative', 'service'],
      message: 'Invalid report category'
    }
  },

  // User & Access Control
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Report generator is required']
  },
  generatedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // For team/company reports
  },
  accessLevel: {
    type: String,
    enum: ['private', 'team', 'management', 'public', 'personal'],
    default: 'private'
  },
  allowedRoles: [{
    type: String,
    enum: ['sales_person', 'sales_head', 'marketing_coordinator', 'product_head', 'accounts_department', 'service_engineer']
  }],

  // Report Configuration
  reportPeriod: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    periodType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      required: true
    }
  },

  // Filters & Parameters
  filters: {
    leadSources: [String],
    productTypes: [String],
    customerTypes: [String],
    geographicRegions: [String],
    statusFilters: [String],
    valueRanges: {
      minValue: Number,
      maxValue: Number
    }
  },

  // Report Data Structure
  reportData: {
    // Key Performance Indicators
    kpis: {
      totalLeads: { type: Number, default: 0 },
      convertedLeads: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      totalQuotations: { type: Number, default: 0 },
      approvedQuotations: { type: Number, default: 0 },
      quotationSuccessRate: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageDealSize: { type: Number, default: 0 },
      pipelineValue: { type: Number, default: 0 },
      activitiesCompleted: { type: Number, default: 0 }
    },

    // Detailed Analytics
    analytics: {
      leadSourceBreakdown: [{
        source: String,
        count: Number,
        percentage: Number,
        conversionRate: Number
      }],
      productPerformance: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        quotations: Number,
        sales: Number,
        revenue: Number,
        successRate: Number
      }],
      customerSegmentation: [{
        segment: String,
        count: Number,
        percentage: Number,
        averageValue: Number
      }],
      geographicDistribution: [{
        region: String,
        leads: Number,
        sales: Number,
        revenue: Number
      }],
      timeAnalysis: {
        avgResponseTime: Number, // in hours
        avgQuotationTime: Number, // in days
        avgSalesCycle: Number, // in days
        peakActivityHours: [Number],
        peakActivityDays: [String]
      }
    },

    // Trend Data for Charts
    trends: {
      dailyMetrics: [{
        date: Date,
        leads: Number,
        quotations: Number,
        sales: Number,
        revenue: Number
      }],
      weeklyMetrics: [{
        weekStart: Date,
        leads: Number,
        quotations: Number,
        sales: Number,
        revenue: Number
      }],
      monthlyMetrics: [{
        month: Number,
        year: Number,
        leads: Number,
        quotations: Number,
        sales: Number,
        revenue: Number
      }]
    },

    // Comparative Data
    comparativeAnalysis: {
      previousPeriod: {
        revenue: Number,
        leads: Number,
        conversionRate: Number,
        percentageChange: Number
      },
      targetComparison: {
        revenueTarget: Number,
        leadsTarget: Number,
        conversionTarget: Number,
        achievementPercentage: Number
      },
      benchmarkComparison: {
        industryAverage: Number,
        teamAverage: Number,
        performanceRating: String // 'above_average', 'average', 'below_average'
      }
    }
  },

  // Report Metadata
  reportStatus: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'expired'],
    default: 'generating'
  },
  generationStartTime: {
    type: Date,
    default: Date.now
  },
  generationEndTime: {
    type: Date
  },
  generationDuration: {
    type: Number // in milliseconds
  },

  // Export Information
  exportFormats: [{
    format: {
      type: String,
      enum: ['pdf', 'excel', 'csv', 'json']
    },
    filePath: String,
    fileSize: Number, // in bytes
    downloadCount: { type: Number, default: 0 },
    lastDownloaded: Date
  }],

  // Scheduling Information
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduleConfig: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly']
    },
    nextExecution: Date,
    emailRecipients: [String],
    autoExport: Boolean
  },

  // Report Settings
  reportSettings: {
    includeCharts: { type: Boolean, default: true },
    includeTables: { type: Boolean, default: true },
    includeComparisons: { type: Boolean, default: true },
    chartTypes: [String], // ['bar', 'line', 'pie', 'area']
    colorScheme: { type: String, default: 'professional' },
    reportTemplate: { type: String, default: 'standard' }
  },

  // Audit Trail
  viewHistory: [{
    viewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String
  }],

  // Report Sharing
  sharedWith: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sharedAt: { type: Date, default: Date.now },
    permissions: {
      type: String,
      enum: ['view', 'download', 'edit'],
      default: 'view'
    }
  }],

  // Error Handling
  errorLogs: [{
    error: String,
    errorCode: String,
    timestamp: { type: Date, default: Date.now },
    stackTrace: String
  }],

  // Performance Metrics
  dataPoints: {
    type: Number,
    default: 0
  },
  cacheKey: String,
  cacheExpiry: Date

}, {
  timestamps: true,
  // Index for better query performance
  indexes: [
    { generatedBy: 1, reportType: 1 },
    { 'reportPeriod.startDate': 1, 'reportPeriod.endDate': 1 },
    { reportStatus: 1, createdAt: -1 }
  ]
});

// Virtual for report age
reportSchema.virtual('reportAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // in days
});

// Virtual for file size in readable format
reportSchema.virtual('readableFileSize').get(function() {
  const bytes = this.exportFormats.reduce((total, format) => total + (format.fileSize || 0), 0);
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Instance method to generate report ID
reportSchema.methods.generateReportId = function() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  const typePrefix = this.reportType.substr(0, 3).toUpperCase();
  return `RPT-${typePrefix}-${timestamp}-${randomStr}`;
};

// Instance method to update report status
reportSchema.methods.updateStatus = function(status, endTime = null) {
  this.reportStatus = status;
  if (endTime) {
    this.generationEndTime = endTime;
    this.generationDuration = endTime - this.generationStartTime;
  }
  return this.save();
};

// Instance method to add view history
reportSchema.methods.addView = function(userId, ipAddress, userAgent) {
  this.viewHistory.push({
    viewedBy: userId,
    ipAddress,
    userAgent
  });
  return this.save();
};

// Instance method to calculate performance rating
reportSchema.methods.calculatePerformanceRating = function() {
  const conversionRate = this.reportData.kpis.conversionRate || 0;
  const quotationSuccessRate = this.reportData.kpis.quotationSuccessRate || 0;
  
  if (conversionRate >= 25 && quotationSuccessRate >= 40) return 'excellent';
  if (conversionRate >= 20 && quotationSuccessRate >= 30) return 'good';
  if (conversionRate >= 15 && quotationSuccessRate >= 20) return 'average';
  return 'needs_improvement';
};

// Static method to find reports by user and period
reportSchema.statics.findUserReports = function(userId, periodDays = 30) {
  const startDate = new Date(Date.now() - (periodDays * 24 * 60 * 60 * 1000));
  return this.find({
    $or: [
      { generatedBy: userId },
      { generatedFor: userId },
      { 'sharedWith.userId': userId }
    ],
    createdAt: { $gte: startDate }
  }).sort({ createdAt: -1 });
};

// Static method to cleanup old reports
reportSchema.statics.cleanupOldReports = function(daysOld = 90) {
  const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isScheduled: false // Don't delete scheduled reports
  });
};

// Pre-save middleware
reportSchema.pre('save', function(next) {
  // Generate report ID if not exists
  if (!this.reportId) {
    this.reportId = this.generateReportId();
  }
  
  // Set generation end time if status is completed
  if (this.reportStatus === 'completed' && !this.generationEndTime) {
    this.generationEndTime = new Date();
    this.generationDuration = this.generationEndTime - this.generationStartTime;
  }
  
  next();
});

// Post-save middleware for logging
reportSchema.post('save', function(doc) {
  console.log(`Report ${doc.reportId} saved with status: ${doc.reportStatus}`);
});

module.exports = mongoose.model('Report', reportSchema);

