const User = require('../models/User');
const Lead = require('../models/Lead');
const Quotation = require('../models/Quotation');
const CustomerPurchase = require('../models/CustomerPurchase');
const Ticket = require('../models/Ticket');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer'); // Added Customer model
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
      summaryData = {
        totalCustomers: await safeQuery(User.countDocuments({ role: 'customer' }), 0, 'ProductHead: Error fetching total customers'),
        activeOrders: await safeQuery(CustomerPurchase.countDocuments({ status: 'active' }), 0, 'ProductHead: Error fetching active orders'),
        openTickets: await safeQuery(Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } }), 0, 'ProductHead: Error fetching open tickets'),
        totalRevenue: (await safeQuery(Payment.aggregate([
          { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]), [{ total: 0 }]))[0].total,
        quotationStats: (await safeQuery(Quotation.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]), [])).reduce((acc, stat) => { acc[stat._id] = stat.count; return acc; }, {}),
        lowStockItems: 'N/A', // Product model does not have a direct quantity field for this query
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
    } else if (role === 'inventory_manager') {
      summaryData = {
        totalProducts: await safeQuery(Product.countDocuments(), 0, 'Inventory: Error fetching total products'),
        lowStockItemsCount: 'N/A', // Product model does not have a quantity field
        recentProductUpdatesCount: 'N/A', // Requires tracking product updates if not just last 5 by sort
        inventoryActivity: [
            { message: 'Product "Inverter Model S100" definition updated', time: '1 day ago', type: 'product_update' },
            { message: 'New batch of "Battery Pack B20" expected next week', time: 'Upcoming', type: 'shipment_incoming' },
        ],
        inventoryStats: {
            itemsBelowReorderLevel: 'N/A', // Needs quantity tracking
            stockTurnoverRate: 'N/A' // Placeholder
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