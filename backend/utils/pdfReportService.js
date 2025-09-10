const pdf = require('html-pdf');
const path = require('path');
const handlebars = require('handlebars');
const fs = require('fs').promises;

/**
 * PDF Report Service
 * Handles PDF generation for sales reports
 */
class PDFReportService {
  
  /**
   * Generate PDF for sales report
   * @param {Object} report - Report object from database
   * @returns {Buffer} PDF buffer
   */
  static async generateSalesReportPDF(report) {
    try {
      console.log(`Generating PDF for report: ${report.reportId}`);
      
      // Load and compile template
      const templatePath = path.join(__dirname, '../templates/salesReport.handlebars');
      const templateSource = await fs.readFile(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      
      // Prepare data for template
      const templateData = this.preparePDFData(report);
      
      // Generate HTML from template
      const html = template(templateData);
      
      // PDF generation options
      const options = {
        format: 'A4',
        orientation: 'portrait',
        border: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        header: {
          height: '0.5in'
        },
        footer: {
          height: '0.3in',
          contents: '<div style="text-align: center; font-size: 10px; color: #666;">{{page}} of {{pages}} | Generated on {{timestamp}}</div>'
        },
        timeout: 30000,
        type: 'pdf',
        quality: '75'
      };
      
      // Generate PDF buffer
      return new Promise((resolve, reject) => {
        pdf.create(html, options).toBuffer((err, buffer) => {
          if (err) {
            console.error('Error generating PDF:', err);
            reject(new Error(`PDF generation failed: ${err.message}`));
          } else {
            console.log(`PDF generated successfully for report ${report.reportId}`);
            resolve(buffer);
          }
        });
      });
      
    } catch (error) {
      console.error('Error in generateSalesReportPDF:', error);
      throw new Error(`Failed to generate PDF report: ${error.message}`);
    }
  }
  
  /**
   * Prepare data for PDF template
   * @param {Object} report - Report object
   * @returns {Object} Template data
   */
  static preparePDFData(report) {
    const data = report.reportData || {};
    const now = new Date();
    
    return {
      // Report metadata
      reportInfo: {
        reportId: report.reportId,
        reportName: report.reportName,
        reportType: this.formatReportType(report.reportType),
        generatedDate: this.formatDate(report.createdAt || now),
        generatedBy: report.generatedBy?.name || 'System',
        generatedFor: report.generatedFor?.name || report.generatedBy?.name,
        period: {
          start: this.formatDate(report.reportPeriod?.startDate || now),
          end: this.formatDate(report.reportPeriod?.endDate || now),
          type: this.formatPeriodType(report.reportPeriod?.periodType || 'custom')
        },
        timestamp: this.formatDateTime(now)
      },
      
      // KPIs section
      kpis: {
        totalLeads: this.formatNumber(data.kpis?.totalLeads || 0),
        convertedLeads: this.formatNumber(data.kpis?.convertedLeads || 0),
        conversionRate: this.formatPercentage(data.kpis?.conversionRate || 0),
        totalQuotations: this.formatNumber(data.kpis?.totalQuotations || 0),
        approvedQuotations: this.formatNumber(data.kpis?.approvedQuotations || 0),
        quotationSuccessRate: this.formatPercentage(data.kpis?.quotationSuccessRate || 0),
        totalRevenue: this.formatCurrency(data.kpis?.totalRevenue || 0),
        averageDealSize: this.formatCurrency(data.kpis?.averageDealSize || 0),
        pipelineValue: this.formatCurrency(data.kpis?.pipelineValue || 0),
        activitiesCompleted: this.formatNumber(data.kpis?.activitiesCompleted || 0)
      },
      
      // Analytics sections
      leadSources: this.formatLeadSources(data.analytics?.leadSourceBreakdown || []),
      productPerformance: this.formatProductPerformance(data.analytics?.productPerformance || []),
      customerSegmentation: this.formatCustomerSegmentation(data.analytics?.customerSegmentation || []),
      geographicDistribution: this.formatGeographicData(data.analytics?.geographicDistribution || []),
      timeAnalysis: this.formatTimeAnalysis(data.analytics?.timeAnalysis || {}),
      
      // Trends data for charts (simplified for PDF)
      trends: this.formatTrendsForPDF(data.trends || {}),
      
      // Comparative analysis
      comparison: this.formatComparativeAnalysis(data.comparativeAnalysis || {}),
      
      // Performance summary
      performanceSummary: this.generatePerformanceSummary(data),
      
      // Recommendations
      recommendations: this.generateRecommendations(data),
      
      // Charts data (for chart generation if needed)
      charts: this.prepareChartsData(data),
      
      // Styling and formatting
      styles: {
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        successColor: '#10b981',
        warningColor: '#f59e0b',
        dangerColor: '#ef4444'
      }
    };
  }
  
  /**
   * Format lead sources data for PDF
   */
  static formatLeadSources(leadSources) {
    return leadSources.map(source => ({
      source: source.source || 'Unknown',
      count: this.formatNumber(source.count),
      percentage: this.formatPercentage(source.percentage),
      conversionRate: this.formatPercentage(source.conversionRate),
      status: this.getPerformanceStatus(source.conversionRate, 'conversion')
    }));
  }
  
  /**
   * Format product performance data for PDF
   */
  static formatProductPerformance(products) {
    return products.map(product => ({
      productName: product.productName || 'Unknown Product',
      quotations: this.formatNumber(product.quotations),
      sales: this.formatNumber(product.sales),
      revenue: this.formatCurrency(product.revenue),
      successRate: this.formatPercentage(product.successRate),
      status: this.getPerformanceStatus(product.successRate, 'success')
    }));
  }
  
  /**
   * Format customer segmentation data for PDF
   */
  static formatCustomerSegmentation(segments) {
    return segments.map(segment => ({
      segment: segment.segment || 'Unknown',
      count: this.formatNumber(segment.count),
      percentage: this.formatPercentage(segment.percentage),
      averageValue: this.formatCurrency(segment.averageValue),
      priority: this.getSegmentPriority(segment.percentage)
    }));
  }
  
  /**
   * Format geographic distribution data for PDF
   */
  static formatGeographicData(geoData) {
    return geoData.map(region => ({
      region: region.region || 'Unknown',
      leads: this.formatNumber(region.leads),
      sales: this.formatNumber(region.sales),
      revenue: this.formatCurrency(region.revenue),
      conversionRate: region.leads > 0 ? this.formatPercentage((region.sales / region.leads) * 100) : '0%'
    }));
  }
  
  /**
   * Format time analysis data for PDF
   */
  static formatTimeAnalysis(timeData) {
    return {
      avgResponseTime: `${timeData.avgResponseTime || 0} hours`,
      avgQuotationTime: `${timeData.avgQuotationTime || 0} days`,
      avgSalesCycle: `${timeData.avgSalesCycle || 0} days`,
      peakHours: (timeData.peakActivityHours || []).join(', '),
      peakDays: (timeData.peakActivityDays || []).join(', '),
      responseTimeStatus: this.getTimeStatus(timeData.avgResponseTime, 'response'),
      salesCycleStatus: this.getTimeStatus(timeData.avgSalesCycle, 'cycle')
    };
  }
  
  /**
   * Format trends data for PDF display
   */
  static formatTrendsForPDF(trends) {
    const dailyMetrics = trends.dailyMetrics || [];
    const recentDays = dailyMetrics.slice(-7); // Last 7 days
    
    return {
      recentDaily: recentDays.map(day => ({
        date: this.formatDate(day.date),
        leads: this.formatNumber(day.leads),
        quotations: this.formatNumber(day.quotations),
        sales: this.formatNumber(day.sales),
        revenue: this.formatCurrency(day.revenue)
      })),
      hasTrendData: recentDays.length > 0
    };
  }
  
  /**
   * Format comparative analysis for PDF
   */
  static formatComparativeAnalysis(comparison) {
    const previousPeriod = comparison.previousPeriod || {};
    const targetComparison = comparison.targetComparison || {};
    const benchmarkComparison = comparison.benchmarkComparison || {};
    
    return {
      previousPeriod: {
        revenue: this.formatCurrency(previousPeriod.revenue),
        leads: this.formatNumber(previousPeriod.leads),
        conversionRate: this.formatPercentage(previousPeriod.conversionRate),
        change: this.formatPercentageChange(previousPeriod.percentageChange),
        changeStatus: this.getChangeStatus(previousPeriod.percentageChange)
      },
      targets: {
        revenueTarget: this.formatCurrency(targetComparison.revenueTarget),
        leadsTarget: this.formatNumber(targetComparison.leadsTarget),
        conversionTarget: this.formatPercentage(targetComparison.conversionTarget),
        achievement: this.formatPercentage(targetComparison.achievementPercentage),
        achievementStatus: this.getAchievementStatus(targetComparison.achievementPercentage)
      },
      benchmarks: {
        industryAverage: this.formatPercentage(benchmarkComparison.industryAverage),
        teamAverage: this.formatPercentage(benchmarkComparison.teamAverage),
        rating: this.formatPerformanceRating(benchmarkComparison.performanceRating)
      }
    };
  }
  
  /**
   * Generate performance summary
   */
  static generatePerformanceSummary(data) {
    const kpis = data.kpis || {};
    const conversionRate = parseFloat(kpis.conversionRate) || 0;
    const quotationSuccessRate = parseFloat(kpis.quotationSuccessRate) || 0;
    const revenue = kpis.totalRevenue || 0;
    
    let overallRating = 'Needs Improvement';
    let ratingClass = 'warning';
    
    if (conversionRate >= 25 && quotationSuccessRate >= 40 && revenue >= 1000000) {
      overallRating = 'Excellent';
      ratingClass = 'success';
    } else if (conversionRate >= 20 && quotationSuccessRate >= 30 && revenue >= 750000) {
      overallRating = 'Good';
      ratingClass = 'primary';
    } else if (conversionRate >= 15 && quotationSuccessRate >= 20 && revenue >= 500000) {
      overallRating = 'Average';
      ratingClass = 'secondary';
    }
    
    return {
      overallRating,
      ratingClass,
      strengths: this.identifyStrengths(data),
      improvements: this.identifyImprovements(data)
    };
  }
  
  /**
   * Generate recommendations based on data
   */
  static generateRecommendations(data) {
    const recommendations = [];
    const kpis = data.kpis || {};
    const analytics = data.analytics || {};
    
    // Conversion rate recommendations
    if (parseFloat(kpis.conversionRate) < 20) {
      recommendations.push({
        type: 'Conversion Rate',
        priority: 'High',
        recommendation: 'Focus on lead qualification and follow-up processes to improve conversion rate.'
      });
    }
    
    // Lead source recommendations
    const leadSources = analytics.leadSourceBreakdown || [];
    const lowPerformingSource = leadSources.find(source => parseFloat(source.conversionRate) < 15);
    if (lowPerformingSource) {
      recommendations.push({
        type: 'Lead Sources',
        priority: 'Medium',
        recommendation: `Improve lead quality from ${lowPerformingSource.source} or consider reallocating resources.`
      });
    }
    
    // Response time recommendations
    const timeAnalysis = analytics.timeAnalysis || {};
    if (timeAnalysis.avgResponseTime > 4) {
      recommendations.push({
        type: 'Response Time',
        priority: 'High',
        recommendation: 'Reduce average response time to improve lead engagement and conversion.'
      });
    }
    
    // Product performance recommendations
    const products = analytics.productPerformance || [];
    const topProduct = products[0];
    if (topProduct && parseFloat(topProduct.successRate) > 50) {
      recommendations.push({
        type: 'Product Focus',
        priority: 'Medium',
        recommendation: `Focus more on ${topProduct.productName} which shows highest success rate.`
      });
    }
    
    return recommendations;
  }
  
  /**
   * Prepare charts data for PDF
   */
  static prepareChartsData(data) {
    const analytics = data.analytics || {};
    
    return {
      leadSourceChart: (analytics.leadSourceBreakdown || []).map(source => ({
        label: source.source,
        value: source.count,
        percentage: source.percentage
      })),
      productPerformanceChart: (analytics.productPerformance || []).map(product => ({
        label: product.productName,
        value: product.revenue
      })),
      trendsChart: (data.trends?.dailyMetrics || []).slice(-14).map(day => ({
        date: this.formatShortDate(day.date),
        leads: day.leads,
        revenue: day.revenue
      }))
    };
  }
  
  /**
   * Helper formatting functions
   */
  static formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  }
  
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }
  
  static formatPercentage(percent) {
    return `${parseFloat(percent || 0).toFixed(1)}%`;
  }
  
  static formatPercentageChange(change) {
    const changeNum = parseFloat(change || 0);
    const sign = changeNum >= 0 ? '+' : '';
    return `${sign}${changeNum.toFixed(1)}%`;
  }
  
  static formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  static formatShortDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  static formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  static formatReportType(type) {
    if (!type) return '';
    return String(type).split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  static formatPeriodType(type) {
    if (!type) return '';
    return String(type).charAt(0).toUpperCase() + String(type).slice(1);
  }
  
  static formatPerformanceRating(rating) {
    if (!rating) return 'Average';
    return String(rating).split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  /**
   * Status and classification helpers
   */
  static getPerformanceStatus(value, type) {
    const numValue = parseFloat(value) || 0;
    
    if (type === 'conversion') {
      if (numValue >= 25) return 'excellent';
      if (numValue >= 20) return 'good';
      if (numValue >= 15) return 'average';
      return 'poor';
    }
    
    if (type === 'success') {
      if (numValue >= 40) return 'excellent';
      if (numValue >= 30) return 'good';
      if (numValue >= 20) return 'average';
      return 'poor';
    }
    
    return 'average';
  }
  
  static getSegmentPriority(percentage) {
    const numValue = parseFloat(percentage) || 0;
    if (numValue >= 40) return 'high';
    if (numValue >= 25) return 'medium';
    return 'low';
  }
  
  static getTimeStatus(value, type) {
    const numValue = parseFloat(value) || 0;
    
    if (type === 'response') {
      if (numValue <= 1) return 'excellent';
      if (numValue <= 2) return 'good';
      if (numValue <= 4) return 'average';
      return 'poor';
    }
    
    if (type === 'cycle') {
      if (numValue <= 10) return 'excellent';
      if (numValue <= 15) return 'good';
      if (numValue <= 20) return 'average';
      return 'poor';
    }
    
    return 'average';
  }
  
  static getChangeStatus(change) {
    const numValue = parseFloat(change) || 0;
    if (numValue > 0) return 'positive';
    if (numValue < 0) return 'negative';
    return 'neutral';
  }
  
  static getAchievementStatus(achievement) {
    const numValue = parseFloat(achievement) || 0;
    if (numValue >= 100) return 'achieved';
    if (numValue >= 80) return 'ontrack';
    return 'behind';
  }
  
  static identifyStrengths(data) {
    const strengths = [];
    const kpis = data.kpis || {};
    
    if (parseFloat(kpis.conversionRate) >= 25) {
      strengths.push('High lead conversion rate');
    }
    
    if (parseFloat(kpis.quotationSuccessRate) >= 40) {
      strengths.push('Strong quotation success rate');
    }
    
    if (kpis.averageDealSize >= 100000) {
      strengths.push('High average deal value');
    }
    
    return strengths.length > 0 ? strengths : ['Consistent performance'];
  }
  
  static identifyImprovements(data) {
    const improvements = [];
    const kpis = data.kpis || {};
    
    if (parseFloat(kpis.conversionRate) < 20) {
      improvements.push('Lead conversion rate');
    }
    
    if (parseFloat(kpis.quotationSuccessRate) < 30) {
      improvements.push('Quotation success rate');
    }
    
    const timeAnalysis = data.analytics?.timeAnalysis || {};
    if (timeAnalysis.avgResponseTime > 4) {
      improvements.push('Response time');
    }
    
    return improvements.length > 0 ? improvements : ['Maintain current performance'];
  }
}

module.exports = PDFReportService;

