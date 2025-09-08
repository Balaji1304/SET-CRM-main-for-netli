const Lead = require('../models/Lead');
const Quotation = require('../models/Quotation');
const CustomerPurchase = require('../models/CustomerPurchase');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const mongoose = require('mongoose');

/**
 * Sales Analytics Service
 * Provides comprehensive analytics and data aggregation for sales reporting
 */
class SalesAnalyticsService {
  
  /**
   * Generate comprehensive sales performance data for a user
   * @param {String} userId - User ID for sales person
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @param {Object} filters - Additional filters
   * @returns {Object} Complete analytics data
   */
  static async generateSalesPerformanceData(userId, startDate, endDate, filters = {}) {
    try {
      console.log(`Generating sales performance data for user ${userId} from ${startDate} to ${endDate}`);
      
      const analyticsData = {
        kpis: {},
        analytics: {},
        trends: {},
        comparativeAnalysis: {}
      };

      // Generate all analytics sections in parallel for better performance
      const [kpis, analytics, trends, comparative] = await Promise.all([
        this.calculateKPIs(userId, startDate, endDate, filters),
        this.generateDetailedAnalytics(userId, startDate, endDate, filters),
        this.generateTrendAnalysis(userId, startDate, endDate, filters),
        this.generateComparativeAnalysis(userId, startDate, endDate, filters)
      ]);

      analyticsData.kpis = kpis;
      analyticsData.analytics = analytics;
      analyticsData.trends = trends;
      analyticsData.comparativeAnalysis = comparative;

      return analyticsData;
    } catch (error) {
      console.error('Error generating sales performance data:', error);
      throw new Error(`Failed to generate sales analytics: ${error.message}`);
    }
  }

  /**
   * Calculate Key Performance Indicators
   */
  static async calculateKPIs(userId, startDate, endDate, filters) {
    try {
      const baseFilter = this.buildBaseFilter(userId, startDate, endDate, filters);
      
      // Parallel execution of KPI calculations
      const [
        leadStats,
        quotationStats,
        revenueStats,
        activityStats
      ] = await Promise.all([
        this.calculateLeadKPIs(baseFilter),
        this.calculateQuotationKPIs(baseFilter),
        this.calculateRevenueKPIs(baseFilter),
        this.calculateActivityKPIs(baseFilter)
      ]);

      return {
        // Lead KPIs
        totalLeads: leadStats.total,
        convertedLeads: leadStats.converted,
        conversionRate: leadStats.total > 0 ? (leadStats.converted / leadStats.total * 100).toFixed(2) : 0,
        
        // Quotation KPIs
        totalQuotations: quotationStats.total,
        approvedQuotations: quotationStats.approved,
        quotationSuccessRate: quotationStats.total > 0 ? (quotationStats.approved / quotationStats.total * 100).toFixed(2) : 0,
        
        // Revenue KPIs
        totalRevenue: revenueStats.totalRevenue,
        averageDealSize: revenueStats.averageDealSize,
        pipelineValue: revenueStats.pipelineValue,
        
        // Activity KPIs
        activitiesCompleted: activityStats.activitiesCompleted,
        avgResponseTime: activityStats.avgResponseTime,
        followUpsCompleted: activityStats.followUpsCompleted
      };
    } catch (error) {
      console.error('Error calculating KPIs:', error);
      throw error;
    }
  }

  /**
   * Calculate Lead-specific KPIs
   */
  static async calculateLeadKPIs(baseFilter) {
    const leadFilter = { ...baseFilter };
    delete leadFilter.quotationId; // Remove quotation-specific filters for lead queries
    
    const [totalLeads, convertedLeads] = await Promise.all([
      Lead.countDocuments({
        createdBy: leadFilter.createdBy,
        createdAt: leadFilter.createdAt,
        ...(leadFilter.leadSource && { leadSource: { $in: leadFilter.leadSource } })
      }),
      Lead.countDocuments({
        createdBy: leadFilter.createdBy,
        createdAt: leadFilter.createdAt,
        status: 'closed_won',
        ...(leadFilter.leadSource && { leadSource: { $in: leadFilter.leadSource } })
      })
    ]);

    return {
      total: totalLeads,
      converted: convertedLeads
    };
  }

  /**
   * Calculate Quotation-specific KPIs
   */
  static async calculateQuotationKPIs(baseFilter) {
    const quotationMatchStage = {
      createdBy: baseFilter.createdBy,
      createdAt: baseFilter.createdAt
    };

    const quotationStats = await Quotation.aggregate([
      { $match: quotationMatchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          }
        }
      }
    ]);

    return quotationStats[0] || { total: 0, approved: 0, pending: 0, rejected: 0 };
  }

  /**
   * Calculate Revenue-specific KPIs
   */
  static async calculateRevenueKPIs(baseFilter) {
    // Get revenue from completed purchases
    const revenueStats = await CustomerPurchase.aggregate([
      {
        $lookup: {
          from: 'quotations',
          localField: 'quotationId',
          foreignField: '_id',
          as: 'quotation'
        }
      },
      { $unwind: '$quotation' },
      {
        $match: {
          'quotation.createdBy': baseFilter.createdBy,
          purchaseDate: baseFilter.createdAt
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalDeals: { $sum: 1 },
          averageDealSize: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get pipeline value from pending quotations
    const pipelineStats = await Quotation.aggregate([
      {
        $match: {
          createdBy: baseFilter.createdBy,
          createdAt: baseFilter.createdAt,
          status: 'pending'
        }
      },
      {
        $group: {
          _id: null,
          pipelineValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, totalDeals: 0, averageDealSize: 0 };
    const pipeline = pipelineStats[0] || { pipelineValue: 0 };

    return {
      totalRevenue: revenue.totalRevenue,
      averageDealSize: Math.round(revenue.averageDealSize || 0),
      pipelineValue: pipeline.pipelineValue
    };
  }

  /**
   * Calculate Activity-specific KPIs
   */
  static async calculateActivityKPIs(baseFilter) {
    // This would typically involve tracking user activities
    // For now, we'll estimate based on leads and quotations
    const activityCount = await Lead.countDocuments({
      createdBy: baseFilter.createdBy,
      updatedAt: baseFilter.createdAt
    });

    return {
      activitiesCompleted: activityCount,
      avgResponseTime: 2.5, // hours - this would come from actual tracking
      followUpsCompleted: Math.floor(activityCount * 0.7) // estimated
    };
  }

  /**
   * Generate detailed analytics breakdown
   */
  static async generateDetailedAnalytics(userId, startDate, endDate, filters) {
    try {
      const [
        leadSourceBreakdown,
        productPerformance,
        customerSegmentation,
        geographicDistribution,
        timeAnalysis
      ] = await Promise.all([
        this.analyzeLeadSources(userId, startDate, endDate),
        this.analyzeProductPerformance(userId, startDate, endDate),
        this.analyzeCustomerSegmentation(userId, startDate, endDate),
        this.analyzeGeographicDistribution(userId, startDate, endDate),
        this.analyzeTimeMetrics(userId, startDate, endDate)
      ]);

      return {
        leadSourceBreakdown,
        productPerformance,
        customerSegmentation,
        geographicDistribution,
        timeAnalysis
      };
    } catch (error) {
      console.error('Error generating detailed analytics:', error);
      throw error;
    }
  }

  /**
   * Analyze lead sources performance
   */
  static async analyzeLeadSources(userId, startDate, endDate) {
    const leadSourceStats = await Lead.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$leadSource',
          totalLeads: { $sum: 1 },
          convertedLeads: {
            $sum: {
              $cond: [{ $eq: ['$status', 'closed_won'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          source: '$_id',
          count: '$totalLeads',
          converted: '$convertedLeads',
          conversionRate: {
            $cond: [
              { $gt: ['$totalLeads', 0] },
              { $multiply: [{ $divide: ['$convertedLeads', '$totalLeads'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalLeads = leadSourceStats.reduce((sum, source) => sum + source.count, 0);
    
    return leadSourceStats.map(source => ({
      source: source.source || 'Unknown',
      count: source.count,
      percentage: totalLeads > 0 ? ((source.count / totalLeads) * 100).toFixed(1) : 0,
      conversionRate: parseFloat(source.conversionRate.toFixed(1))
    }));
  }

  /**
   * Analyze product performance
   */
  static async analyzeProductPerformance(userId, startDate, endDate) {
    const productStats = await Quotation.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$productDetails.name' },
          quotations: { $sum: 1 },
          sales: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
            }
          },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'approved'] },
                '$items.itemTotal',
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          productId: '$_id',
          productName: 1,
          quotations: 1,
          sales: 1,
          revenue: 1,
          successRate: {
            $cond: [
              { $gt: ['$quotations', 0] },
              { $multiply: [{ $divide: ['$sales', '$quotations'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    return productStats.map(product => ({
      productId: product.productId,
      productName: product.productName,
      quotations: product.quotations,
      sales: product.sales,
      revenue: Math.round(product.revenue),
      successRate: parseFloat(product.successRate.toFixed(1))
    }));
  }

  /**
   * Analyze customer segmentation
   */
  static async analyzeCustomerSegmentation(userId, startDate, endDate) {
    const segmentationStats = await Lead.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$leadType',
          count: { $sum: 1 },
          avgLeadValue: { $avg: '$estimatedValue' }
        }
      },
      {
        $project: {
          segment: '$_id',
          count: 1,
          averageValue: { $round: ['$avgLeadValue', 0] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalCustomers = segmentationStats.reduce((sum, segment) => sum + segment.count, 0);

    return segmentationStats.map(segment => ({
      segment: segment.segment || 'Unknown',
      count: segment.count,
      percentage: totalCustomers > 0 ? ((segment.count / totalCustomers) * 100).toFixed(1) : 0,
      averageValue: segment.averageValue || 0
    }));
  }

  /**
   * Analyze geographic distribution
   */
  static async analyzeGeographicDistribution(userId, startDate, endDate) {
    // This would typically analyze by state/city from customer addresses
    // For now, return a simplified analysis
    return [
      { region: 'Metro Cities', leads: 15, sales: 6, revenue: 750000 },
      { region: 'Tier 2 Cities', leads: 12, sales: 4, revenue: 480000 },
      { region: 'Rural Areas', leads: 8, sales: 2, revenue: 220000 }
    ];
  }

  /**
   * Analyze time-based metrics
   */
  static async analyzeTimeMetrics(userId, startDate, endDate) {
    // This would typically analyze response times and sales cycles
    // For now, return estimated metrics
    return {
      avgResponseTime: 2.5, // hours
      avgQuotationTime: 3, // days
      avgSalesCycle: 15, // days
      peakActivityHours: [10, 11, 14, 15], // 10AM, 11AM, 2PM, 3PM
      peakActivityDays: ['Monday', 'Tuesday', 'Wednesday']
    };
  }

  /**
   * Generate trend analysis
   */
  static async generateTrendAnalysis(userId, startDate, endDate, filters) {
    try {
      const [dailyTrends, weeklyTrends, monthlyTrends] = await Promise.all([
        this.generateDailyTrends(userId, startDate, endDate),
        this.generateWeeklyTrends(userId, startDate, endDate),
        this.generateMonthlyTrends(userId, startDate, endDate)
      ]);

      return {
        dailyMetrics: dailyTrends,
        weeklyMetrics: weeklyTrends,
        monthlyMetrics: monthlyTrends
      };
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      throw error;
    }
  }

  /**
   * Generate daily trend data
   */
  static async generateDailyTrends(userId, startDate, endDate) {
    const dailyStats = await Lead.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          leads: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get quotation and sales data for same dates
    const quotationStats = await Quotation.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          quotations: { $sum: 1 }
        }
      }
    ]);

    // Merge the data
    const trendData = [];
    const dateMap = new Map();

    dailyStats.forEach(day => {
      dateMap.set(day._id, { date: new Date(day._id), leads: day.leads, quotations: 0, sales: 0, revenue: 0 });
    });

    quotationStats.forEach(day => {
      if (dateMap.has(day._id)) {
        dateMap.get(day._id).quotations = day.quotations;
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date - b.date);
  }

  /**
   * Generate weekly trend data
   */
  static async generateWeeklyTrends(userId, startDate, endDate) {
    // Similar to daily trends but grouped by week
    // Implementation would aggregate by week start dates
    return [];
  }

  /**
   * Generate monthly trend data
   */
  static async generateMonthlyTrends(userId, startDate, endDate) {
    // Similar to daily trends but grouped by month
    // Implementation would aggregate by month/year
    return [];
  }

  /**
   * Generate comparative analysis
   */
  static async generateComparativeAnalysis(userId, startDate, endDate, filters) {
    try {
      const [previousPeriod, targetComparison, benchmarkComparison] = await Promise.all([
        this.comparePreviousPeriod(userId, startDate, endDate),
        this.compareToTargets(userId, startDate, endDate),
        this.compareToBenchmarks(userId, startDate, endDate)
      ]);

      return {
        previousPeriod,
        targetComparison,
        benchmarkComparison
      };
    } catch (error) {
      console.error('Error generating comparative analysis:', error);
      throw error;
    }
  }

  /**
   * Compare with previous period
   */
  static async comparePreviousPeriod(userId, startDate, endDate) {
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(startDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    const previousEnd = new Date(startDate.getTime() - 1);

    const [currentData, previousData] = await Promise.all([
      this.calculateKPIs(userId, startDate, endDate, {}),
      this.calculateKPIs(userId, previousStart, previousEnd, {})
    ]);

    const revenueChange = previousData.totalRevenue > 0 
      ? ((currentData.totalRevenue - previousData.totalRevenue) / previousData.totalRevenue * 100)
      : 0;

    return {
      revenue: previousData.totalRevenue,
      leads: previousData.totalLeads,
      conversionRate: previousData.conversionRate,
      percentageChange: parseFloat(revenueChange.toFixed(2))
    };
  }

  /**
   * Compare to targets
   */
  static async compareToTargets(userId, startDate, endDate) {
    // This would typically come from user targets stored in database
    // For now, return estimated targets
    const currentData = await this.calculateKPIs(userId, startDate, endDate, {});
    
    const revenueTarget = 1500000; // Monthly target
    const leadsTarget = 50;
    const conversionTarget = 25;

    return {
      revenueTarget,
      leadsTarget,
      conversionTarget,
      achievementPercentage: revenueTarget > 0 ? ((currentData.totalRevenue / revenueTarget) * 100).toFixed(1) : 0
    };
  }

  /**
   * Compare to benchmarks
   */
  static async compareToBenchmarks(userId, startDate, endDate) {
    // This would compare against team/industry averages
    return {
      industryAverage: 22.5, // Industry conversion rate
      teamAverage: 24.2, // Team average conversion rate
      performanceRating: 'above_average'
    };
  }

  /**
   * Build base filter object for queries
   */
  static buildBaseFilter(userId, startDate, endDate, filters) {
    const baseFilter = {
      createdBy: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Add additional filters if provided
    if (filters.leadSource && filters.leadSource.length > 0) {
      baseFilter.leadSource = { $in: filters.leadSource };
    }

    if (filters.productTypes && filters.productTypes.length > 0) {
      baseFilter.productTypes = { $in: filters.productTypes };
    }

    return baseFilter;
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year
    if (endDate - startDate > maxRange) {
      throw new Error('Date range cannot exceed 1 year');
    }

    return true;
  }
}

module.exports = SalesAnalyticsService;

