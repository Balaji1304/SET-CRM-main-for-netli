const User = require('../models/User');
const Lead = require('../models/Lead');
const Quotation = require('../models/Quotation');
const CustomerPurchase = require('../models/CustomerPurchase');
const Ticket = require('../models/Ticket');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer'); // Added Customer model
const Enquiry = require('../models/Enquiry'); // Added Enquiry model
const mongoose = require('mongoose');

// Helper to safely execute promises and return default value on error
const safeQuery = async (promise, defaultValue = 0, errorMessagePrefix = 'Error') => {
  try {
    return await promise;
  } catch (error) {
    console.error(`${errorMessagePrefix}: ${error.message}`);
    return defaultValue;
  }
};

// @desc    Get dashboard summary data based on user role
// @route   GET /api/dashboard/summary
// @access  Private
exports.getDashboardSummary = async (req, res, next) => {
  const { role, id: userId } = req.user;
  let summaryData = {};

  try {
    if (role === 'product_head') {
      const lowStockProducts = await safeQuery(Product.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }), [], 'ProductHead: Error fetching low stock products');
      
      const totalRevenueResult = await safeQuery(Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]), [], 'ProductHead: Error fetching total revenue');
      const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
      
      summaryData = {
        totalCustomers: await safeQuery(User.countDocuments({ role: 'customer' }), 0, 'ProductHead: Error fetching total customers'),
        activeOrders: await safeQuery(CustomerPurchase.countDocuments({ status: 'active' }), 0, 'ProductHead: Error fetching active orders'),
        openTickets: await safeQuery(Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } }), 0, 'ProductHead: Error fetching open tickets'),
        totalRevenue: totalRevenue,
        quotationStats: (await safeQuery(Quotation.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]), [])).reduce((acc, stat) => { acc[stat._id] = stat.count; return acc; }, {}),
        lowStockItems: lowStockProducts.length,
        totalProducts: await safeQuery(Product.countDocuments(), 0, 'ProductHead: Error fetching total products'),
        lowStockItemsCount: lowStockProducts.length,
        inventoryStats: {
            itemsBelowReorderLevel: lowStockProducts.length,
            stockTurnoverRate: 'N/A' // Placeholder
        },
        lowStockItemsList: lowStockProducts.map(p => ({
            id: p._id,
            name: p.name,
            quantity: p.quantity,
            reorderLevel: p.reorderLevel
        })),
        recentActivity: [
            { message: 'New Order #ORD-00124 Received', time: '2 hours ago', type: 'order'},
            { message: 'Customer "Ramesh Kumar" Meeting Scheduled', time: '5 hours ago', type: 'meeting'},
            { message: 'Product "Solar Panel X2000" stock updated', time: '1 day ago', type: 'inventory'}
        ],
        performanceMetrics: {
            tasksCompleted: '85%', // Placeholder
            customerSatisfaction: '4.8/5.0' // Placeholder
        },
        supportTicketsSummary: {
            openTickets: (await safeQuery(Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } }), 0, 'ProductHead: Error fetching open tickets summary')), // Re-query or use previous
            avgResponseTime: '2h' // Placeholder - requires complex calculation
        }
      };
    } else if (role === 'customer') {
      const customerDetails = await safeQuery(Customer.findOne({ userId: userId }), null, 'Customer: Error fetching customer details by userId');
      let customerIdForQueries = null;
      if (customerDetails) {
        customerIdForQueries = customerDetails._id;
      }

      summaryData = {
        myOpenTickets: customerIdForQueries ? await safeQuery(Ticket.countDocuments({ user: userId, status: { $in: ['open', 'in_progress'] } }), 0, 'Customer: Error fetching open tickets') : 0,
        myRecentOrdersCount: customerIdForQueries ? await safeQuery(CustomerPurchase.countDocuments({ customerId: customerIdForQueries, status: 'active' }), 0, 'Customer: Error fetching recent orders count') : 0,
        myActiveQuotations: 0, // Placeholder, as direct link from Customer to Quotation isn't straightforward via Lead without potential data gaps
        recentActivity: [
            { message: 'Your order #ORD-00123 has been shipped!', time: '1 day ago', type: 'order' },
            { message: 'Invoice #INV-00701 for solar panel service due soon', time: '3 days ago', type: 'invoice' },
            { message: 'Your support ticket #TICK-0056 status updated to In Progress', time: '4 hours ago', type: 'ticket' }
        ],
        myStats: {
            ordersPlaced: customerIdForQueries ? await safeQuery(CustomerPurchase.countDocuments({ customerId: customerIdForQueries }), 0, 'Customer: Error fetching total orders placed') : 0,
            supportTicketsOpened: await safeQuery(Ticket.countDocuments({ user: userId }), 0, 'Customer: Error fetching total support tickets opened')
        }
      };
      // Attempt to fetch customer quotations if lead association exists (as per original logic)
      if (customerDetails && customerDetails.email) {
        const lead = await safeQuery(Lead.findOne({ email: customerDetails.email }), null, 'Customer: Error fetching lead for quotations');
        if (lead) {
          summaryData.myActiveQuotations = await safeQuery(Quotation.countDocuments({ lead: lead._id, status: { $in: ['sent', 'approved'] } }), 0, 'Customer: Error fetching active quotations');
        }
      }

    } else if (role === 'sales_person' || role === 'sales_representative') {
      const salesUserId = userId; // Alias for clarity

      const quotationAggregation = await safeQuery(Quotation.aggregate([
        { $match: { createdBy: new mongoose.Types.ObjectId(salesUserId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$total', 0] } }
          }
        }
      ]), [], 'Sales: Error aggregating quotation stats');

      let myQuotationStats = {};
      let revenueFromApprovedQuotations = 0;

      quotationAggregation.forEach(stat => {
        myQuotationStats[stat._id] = stat.count;
        if (stat._id === 'approved') {
          revenueFromApprovedQuotations += stat.totalValue;
        }
      });

      summaryData = {
        myLeadsCreated: await safeQuery(Lead.countDocuments({ createdBy: salesUserId }), 0, 'Sales: Error fetching leads created'),
        myQuotationStats: myQuotationStats, // Contains counts for 'draft', 'approved', etc.
        revenueFromApprovedQuotations: revenueFromApprovedQuotations,
        // myInvoicesGenerated: await safeQuery(Invoice.countDocuments({ createdBy: salesUserId, paymentStatus: 'PAID' }), 0, 'Sales: Error fetching paid invoices generated'), // Removed as per user request
        recentActivity: [
            { message: 'New lead "Priya Sharma" created', time: '30 mins ago', type: 'lead' },
            { message: 'Quotation #QTN-0088 for "ABC Corp" approved by client', time: '1 hour ago', type: 'quotation' },
            { message: 'Follow-up meeting scheduled with "XYZ Ltd"', time: 'Tomorrow 10 AM', type: 'meeting'}
        ],
        salesPerformance: {
            closedDeals: myQuotationStats.approved || 0, // Use count from aggregation
            conversionRate: 'N/A' // Placeholder - requires leads vs deals calculation
        }
      };
    } else if (role === 'service_engineer') {
      summaryData = {
        myAssignedCustomerTasks: await safeQuery(CustomerPurchase.countDocuments({ assignedEngineerId: userId, serviceTaskStatus: { $in: ['assigned', 'scheduled', 'in_progress'] } }), 0, 'Service: Error fetching assigned customer tasks'),
        avgResolutionTime: 'N/A', // Placeholder - requires complex calculation on Ticket/CustomerPurchase data
        serviceActivity: [
            { message: 'Service task for Order #ORD-00120 completed', time: '45 mins ago', type: 'task_completed' },
            { message: 'New service task assigned for Order #ORD-00125', time: '2 hours ago', type: 'task_assigned' },
        ],
        servicePerformance: {
            tasksCompletedToday: 'N/A', // Placeholder - requires date tracking on CustomerPurchase completion
            firstCallResolutionRate: 'N/A' // Placeholder
        }
      };
    } else if (role === 'sales_head') {
      const quotationAggregation = await safeQuery(Quotation.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$total' }
          }
        }
      ]), [], 'Sales Head: Error aggregating quotation stats');

      const quotationStats = quotationAggregation.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalValue: stat.totalValue
        };
        return acc;
      }, {});

      summaryData = {
        totalQuotations: await safeQuery(Quotation.countDocuments(), 0),
        totalQuotationsValue: (quotationStats.draft?.totalValue || 0) + (quotationStats.sent?.totalValue || 0) + (quotationStats.approved?.totalValue || 0),
        approvedDeals: quotationStats.approved?.count || 0
      };
    } else if (role === 'front_office_executive') {
      // Get current date ranges
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Basic stats
      const totalEnquiries = await safeQuery(Enquiry.countDocuments(), 0, 'FrontOffice: Error fetching total enquiries');
      const enquiriesToday = await safeQuery(Enquiry.countDocuments({ createdAt: { $gte: startOfToday } }), 0, 'FrontOffice: Error fetching today enquiries');
      const pendingAssignments = await safeQuery(Enquiry.countDocuments({ assignmentStatus: 'pending_assignment' }), 0, 'FrontOffice: Error fetching pending assignments');
      const leadsAssignedToday = await safeQuery(Enquiry.countDocuments({ 
        assignmentStatus: 'converted_to_lead', 
        convertedAt: { $gte: startOfToday } 
      }), 0, 'FrontOffice: Error fetching today assignments');

      // Weekly and monthly stats
      const weeklyAssignments = await safeQuery(Enquiry.countDocuments({ 
        assignmentStatus: 'converted_to_lead', 
        convertedAt: { $gte: startOfWeek } 
      }), 0, 'FrontOffice: Error fetching weekly assignments');
      const monthlyEnquiries = await safeQuery(Enquiry.countDocuments({ createdAt: { $gte: startOfMonth } }), 0, 'FrontOffice: Error fetching monthly enquiries');

      // Lead source breakdown
      const leadSourceStats = await safeQuery(Enquiry.aggregate([
        { $group: { _id: '$leadSource', count: { $sum: 1 } } }
      ]), [], 'FrontOffice: Error aggregating lead sources');

      const leadSourceBreakdown = leadSourceStats.map(source => ({
        source: source._id,
        count: source.count,
        percentage: Math.round((source.count / totalEnquiries) * 100) || 0
      }));

      // Assignment status breakdown
      const assignmentStats = await safeQuery(Enquiry.aggregate([
        { $group: { _id: '$assignmentStatus', count: { $sum: 1 } } }
      ]), [], 'FrontOffice: Error aggregating assignment stats');

      const assignmentStatsObj = assignmentStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      // Recent enquiries for table
      const recentEnquiries = await safeQuery(Enquiry.find()
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(), [], 'FrontOffice: Error fetching recent enquiries');

      const formattedRecentEnquiries = recentEnquiries.map(enquiry => ({
        id: enquiry._id,
        customerName: `${enquiry.firstName} ${enquiry.lastName || ''}`.trim(),
        phone: enquiry.phone,
        leadSource: enquiry.leadSource,
        status: enquiry.assignmentStatus,
        createdAt: new Date(enquiry.createdAt).toLocaleDateString('en-GB')
      }));

      summaryData = {
        totalEnquiries,
        enquiriesToday,
        pendingAssignments,
        leadsAssignedToday,
        weeklyAssignments,
        monthlyEnquiries,
        avgResponseTime: 'N/A', // Placeholder - requires complex calculation
        todayConversionRate: enquiriesToday > 0 ? `${Math.round((leadsAssignedToday / enquiriesToday) * 100)}%` : '0%',
        
        // Lead source stats (for cards)
        leadSourceStats: leadSourceStats.reduce((acc, source) => {
          acc[source._id] = source.count;
          return acc;
        }, {}),
        
        // Detailed breakdown
        leadSourceBreakdown,
        assignmentStats: {
          total: totalEnquiries,
          pending: assignmentStatsObj.pending_assignment || 0,
          assigned: assignmentStatsObj.assigned || 0,
          converted: assignmentStatsObj.converted_to_lead || 0
        },
        
        recentEnquiries: formattedRecentEnquiries,
        recentActivity: [
          { message: `${enquiriesToday} new enquiries captured today`, time: 'Today', type: 'enquiry' },
          { message: `${leadsAssignedToday} enquiries assigned to sales team`, time: 'Today', type: 'assignment' },
          { message: `${pendingAssignments} enquiries awaiting assignment`, time: 'Current', type: 'pending' },
          { message: `${weeklyAssignments} total assignments this week`, time: 'This week', type: 'weekly' }
        ]
      };
    } else if (role === 'marketing_coordinator') {
      // Get current date ranges for time-based analytics
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Purchase Order Analytics - Primary responsibility
      const totalPurchaseOrders = await safeQuery(CustomerPurchase.countDocuments(), 0, 'MarketingCoord: Error fetching total purchase orders');
      const activePurchaseOrders = await safeQuery(CustomerPurchase.countDocuments({ status: 'active' }), 0, 'MarketingCoord: Error fetching active purchase orders');
      const readyToDispatch = await safeQuery(CustomerPurchase.countDocuments({ serviceTaskStatus: 'ready_to_dispatch' }), 0, 'MarketingCoord: Error fetching ready to dispatch orders');
      const pendingDateAllocation = await safeQuery(CustomerPurchase.countDocuments({ serviceTaskStatus: 'ready_to_dispatch' }), 0, 'MarketingCoord: Error fetching pending date allocation');
      const dateAllocatedToday = await safeQuery(CustomerPurchase.countDocuments({ 
        serviceTaskStatus: 'installation_date_allocated',
        updatedAt: { $gte: startOfToday }
      }), 0, 'MarketingCoord: Error fetching today date allocations');
      
      // Installation Analytics
      const upcomingInstallations = await safeQuery(CustomerPurchase.countDocuments({
        installationDate: { 
          $gte: startOfToday,
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      }), 0, 'MarketingCoord: Error fetching upcoming installations');
      const installationsThisWeek = await safeQuery(CustomerPurchase.countDocuments({
        installationDate: { $gte: startOfWeek }
      }), 0, 'MarketingCoord: Error fetching this week installations');

      // Service Task Status breakdown
      const serviceTaskStats = await safeQuery(CustomerPurchase.aggregate([
        { $group: { _id: '$serviceTaskStatus', count: { $sum: 1 } } }
      ]), [], 'MarketingCoord: Error aggregating service task stats');

      const serviceTaskBreakdown = serviceTaskStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      // Customer Analytics - Secondary responsibility
      const totalCustomers = await safeQuery(Customer.countDocuments(), 0, 'MarketingCoord: Error fetching total customers');
      const newCustomersThisMonth = await safeQuery(Customer.countDocuments({ createdAt: { $gte: startOfMonth } }), 0, 'MarketingCoord: Error fetching new customers this month');

      // Additional permissions analytics
      const totalQuotations = await safeQuery(Quotation.countDocuments(), 0, 'MarketingCoord: Error fetching total quotations');
      const pendingQuotations = await safeQuery(Quotation.countDocuments({ status: 'sent' }), 0, 'MarketingCoord: Error fetching pending quotations');
      const totalLeads = await safeQuery(Lead.countDocuments(), 0, 'MarketingCoord: Error fetching total leads');
      const activeLeads = await safeQuery(Lead.countDocuments({ status: 'active' }), 0, 'MarketingCoord: Error fetching active leads');

      // Revenue Analytics
      const totalRevenueResult = await safeQuery(Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]), [], 'MarketingCoord: Error fetching total revenue');
      const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
      
      const monthlyRevenueResult = await safeQuery(Payment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]), [], 'MarketingCoord: Error fetching monthly revenue');
      const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;

      // Recent Purchase Orders with customer details
      const recentPurchaseOrders = await safeQuery(CustomerPurchase.find()
        .populate('customerId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(), [], 'MarketingCoord: Error fetching recent purchase orders');

      const formattedRecentOrders = recentPurchaseOrders.map(order => ({
        id: order._id,
        purchaseID: order.purchaseID,
        customerName: order.customerId ? `${order.customerId.firstName} ${order.customerId.lastName}` : 'N/A',
        status: order.serviceTaskStatus,
        totalAmount: order.totalAmount,
        installationDate: order.installationDate ? new Date(order.installationDate).toLocaleDateString('en-GB') : 'Not set',
        createdAt: new Date(order.createdAt).toLocaleDateString('en-GB')
      }));

      // Upcoming installations for calendar view
      const upcomingInstallationsList = await safeQuery(CustomerPurchase.find({
        installationDate: { 
          $gte: startOfToday,
          $lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // Next 14 days
        }
      })
        .populate('customerId', 'firstName lastName')
        .populate('assignedEngineerId', 'name')
        .sort({ installationDate: 1 })
        .limit(10)
        .lean(), [], 'MarketingCoord: Error fetching upcoming installations list');

      const formattedUpcomingInstallations = upcomingInstallationsList.map(order => ({
        id: order._id,
        purchaseID: order.purchaseID,
        customerName: order.customerId ? `${order.customerId.firstName} ${order.customerId.lastName}` : 'N/A',
        engineerName: order.assignedEngineerId ? order.assignedEngineerId.name : 'Not assigned',
        installationDate: new Date(order.installationDate).toLocaleDateString('en-GB'),
        status: order.serviceTaskStatus
      }));

      summaryData = {
        // Primary KPIs
        totalPurchaseOrders,
        activePurchaseOrders,
        readyToDispatch,
        pendingDateAllocation,
        dateAllocatedToday,
        upcomingInstallations,
        installationsThisWeek,

        // Service Task Analytics
        serviceTaskBreakdown,
        
        // Customer Analytics
        totalCustomers,
        newCustomersThisMonth,
        
        // Additional Permissions
        totalQuotations,
        pendingQuotations,
        totalLeads,
        activeLeads,
        
        // Revenue Analytics
        totalRevenue,
        monthlyRevenue,
        
        // Lists for tables
        recentPurchaseOrders: formattedRecentOrders,
        upcomingInstallationsList: formattedUpcomingInstallations,
        
        // Performance metrics
        avgInstallationTime: 'N/A', // Placeholder - requires complex calculation
        customerSatisfactionRate: 'N/A', // Placeholder
        
        recentActivity: [
          { message: `${dateAllocatedToday} installation dates allocated today`, time: 'Today', type: 'date_allocation' },
          { message: `${readyToDispatch} orders ready for dispatch coordination`, time: 'Current', type: 'dispatch' },
          { message: `${upcomingInstallations} installations scheduled for next week`, time: 'Upcoming', type: 'installation' },
          { message: `${newCustomersThisMonth} new customers acquired this month`, time: 'This month', type: 'customer' }
        ]
      };
    } else if (role === 'accounts_department') {
      // Get current date ranges for time-based analytics
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Core approval metrics - using existing endpoints data structure
      const pendingApprovals = await safeQuery(Quotation.countDocuments({ status: 'pending_approval' }), 0, 'Accounts: Error fetching pending quotation approvals') +
        await safeQuery(CustomerPurchase.countDocuments({ paymentReviewStatus: 'pending_verification' }), 0, 'Accounts: Error fetching pending payment approvals');

      const approvalsToday = await safeQuery(Quotation.countDocuments({ 
        status: 'approved',
        advancePaymentConfirmedAt: { $gte: startOfToday }
      }), 0, 'Accounts: Error fetching today quotation approvals') +
        await safeQuery(CustomerPurchase.countDocuments({ 
          paymentReviewStatus: 'verified',
          updatedAt: { $gte: startOfToday }
        }), 0, 'Accounts: Error fetching today payment approvals');

      // Payment processing metrics
      const totalPaymentsResult = await safeQuery(Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]), [], 'Accounts: Error aggregating total payments');
      const totalPaymentsProcessed = totalPaymentsResult.length > 0 ? totalPaymentsResult[0].total : 0;

      const monthlyPaymentsResult = await safeQuery(Payment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]), [], 'Accounts: Error aggregating monthly payments');
      const monthlyCollections = monthlyPaymentsResult.length > 0 ? monthlyPaymentsResult[0].total : 0;

      // Payment type breakdown
      const quotationApprovals = await safeQuery(Quotation.countDocuments({ status: 'pending_approval' }), 0, 'Accounts: Error fetching quotation approvals count');
      const paymentApprovals = await safeQuery(CustomerPurchase.countDocuments({ paymentReviewStatus: 'pending_verification' }), 0, 'Accounts: Error fetching payment approvals count');

      // Payment method analytics for current month
      const paymentMethodStats = await safeQuery(Payment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { 
          $group: { 
            _id: '$paymentMethod', 
            count: { $sum: 1 }, 
            amount: { $sum: '$amountPaid' }
          } 
        }
      ]), [], 'Accounts: Error aggregating payment methods');

      const paymentMethodBreakdown = paymentMethodStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          amount: stat.amount
        };
        return acc;
      }, {});

      // Outstanding payments calculation
      const outstandingResult = await safeQuery(CustomerPurchase.aggregate([
        { $match: { remainingAmount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
      ]), [], 'Accounts: Error calculating outstanding payments');
      const outstandingPayments = outstandingResult.length > 0 ? outstandingResult[0].total : 0;

      // Fully paid orders
      const fullyPaidOrders = await safeQuery(CustomerPurchase.countDocuments({ isFullyPaid: true }), 0, 'Accounts: Error fetching fully paid orders');
      const activePurchaseOrders = await safeQuery(CustomerPurchase.countDocuments({ status: 'active' }), 0, 'Accounts: Error fetching active purchase orders');

      // Recent pending approvals for table
      const recentPendingQuotations = await safeQuery(Quotation.find({ status: 'pending_approval' })
        .populate('lead', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean(), [], 'Accounts: Error fetching recent pending quotations');

      const recentPendingPayments = await safeQuery(CustomerPurchase.find({ paymentReviewStatus: 'pending_verification' })
        .populate('customerId', 'firstName lastName')
        .populate('quotationId', 'quotationNumber')
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean(), [], 'Accounts: Error fetching recent pending payments');

      const recentPendingApprovals = [
        ...recentPendingQuotations.map(q => ({
          id: q._id,
          type: 'quotation_approval',
          customerName: q.lead ? `${q.lead.firstName} ${q.lead.lastName}` : 'N/A',
          quotationNumber: q.quotationNumber,
          amount: q.advancePaymentAmount || q.total,
          createdAt: new Date(q.createdAt).toLocaleDateString('en-GB')
        })),
        ...recentPendingPayments.map(p => ({
          id: p._id,
          type: 'remaining_payment_approval',
          customerName: p.customerId ? `${p.customerId.firstName} ${p.customerId.lastName}` : 'N/A',
          quotationNumber: p.quotationId ? p.quotationId.quotationNumber : 'N/A',
          amount: p.totalAmount - p.advancePaid,
          createdAt: new Date(p.createdAt).toLocaleDateString('en-GB')
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Recent approved payments for table
      const recentApprovedQuotations = await safeQuery(Quotation.find({ status: 'approved' })
        .populate('lead', 'firstName lastName')
        .sort({ advancePaymentConfirmedAt: -1 })
        .limit(3)
        .lean(), [], 'Accounts: Error fetching recent approved quotations');

      const recentApprovedPayments = await safeQuery(CustomerPurchase.find({ paymentReviewStatus: 'verified' })
        .populate('customerId', 'firstName lastName')
        .populate('quotationId', 'quotationNumber')
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean(), [], 'Accounts: Error fetching recent approved payments');

      const recentApprovedPaymentsList = [
        ...recentApprovedQuotations.map(q => ({
          id: q._id,
          customerName: q.lead ? `${q.lead.firstName} ${q.lead.lastName}` : 'N/A',
          quotationNumber: q.quotationNumber,
          amount: q.advancePaymentAmount || q.total,
          paymentMethod: q.paymentMethod,
          approvedAt: q.advancePaymentConfirmedAt ? new Date(q.advancePaymentConfirmedAt).toLocaleDateString('en-GB') : 'N/A'
        })),
        ...recentApprovedPayments.map(p => ({
          id: p._id,
          customerName: p.customerId ? `${p.customerId.firstName} ${p.customerId.lastName}` : 'N/A',
          quotationNumber: p.quotationId ? p.quotationId.quotationNumber : 'N/A',
          amount: p.totalAmount - p.advancePaid,
          paymentMethod: 'manual', // Remaining payments are typically manual
          approvedAt: new Date(p.updatedAt).toLocaleDateString('en-GB')
        }))
      ].sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));

      // Calculate approval metrics
      const todayApprovedAmountResult = await safeQuery(Payment.aggregate([
        { $match: { createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]), [], 'Accounts: Error calculating today approved amount');
      const amountApprovedToday = todayApprovedAmountResult.length > 0 ? todayApprovedAmountResult[0].total : 0;

      summaryData = {
        // Core approval metrics
        pendingApprovals,
        approvalsToday,
        totalPaymentsProcessed,
        monthlyCollections,

        // Payment type analytics
        quotationApprovals,
        paymentApprovals,
        cashPayments: paymentMethodBreakdown.cash?.count || 0,
        digitalPayments: (paymentMethodBreakdown.bank_transfer?.count || 0) + (paymentMethodBreakdown.razorpay?.count || 0),

        // Performance metrics
        avgApprovalTime: '2.5', // Placeholder - requires complex calculation
        outstandingPayments,
        fullyPaidOrders,
        activePurchaseOrders,

        // Today's performance
        amountApprovedToday,
        approvalRate: pendingApprovals > 0 ? `${Math.round((approvalsToday / (approvalsToday + pendingApprovals)) * 100)}%` : '100%',

        // Payment method breakdown
        paymentMethodBreakdown,

        // Outstanding analysis placeholders
        overduePayments: Math.round(outstandingPayments * 0.3), // Placeholder: assume 30% is overdue
        dueThisWeek: Math.round(outstandingPayments * 0.15), // Placeholder: assume 15% due this week
        collectionRate: '85%', // Placeholder

        // Recent data for tables
        recentPendingApprovals,
        recentApprovedPayments: recentApprovedPaymentsList,

        recentActivity: [
          { message: `${approvalsToday} payments approved today`, time: 'Today', type: 'approval' },
          { message: `₹${monthlyCollections.toLocaleString()} collected this month`, time: 'This month', type: 'collection' },
          { message: `${pendingApprovals} approvals pending review`, time: 'Current', type: 'pending' },
          { message: `₹${outstandingPayments.toLocaleString()} outstanding payments`, time: 'Current', type: 'outstanding' }
        ]
      };
    } else {
      summaryData = { message: "Dashboard data is not configured for this role, or no data found." };
    }

    res.status(200).json({
      success: true,
      data: summaryData
    });

  } catch (error) {
    // This is a fallback for unexpected errors not caught by safeQuery
    console.error('General error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Server Error while fetching dashboard summary' });
  }
}; 