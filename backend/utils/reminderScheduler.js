const Lead = require('../models/Lead');
const CustomerPurchase = require('../models/CustomerPurchase');
const Notification = require('../models/Notification');
const NotificationService = require('./notificationService');
const { sendDailyInstallationReminders } = require('./installationReminders');

// Check if an unread notification of the same type already exists for a recipient + entity.
// When recipientId is null, the check is done across all recipients (team fan-out dedup).
async function alreadyNotified(recipientId, type, entityId) {
  if (!entityId) return false;
  const query = { type, read: false, 'data.entityId': entityId };
  if (recipientId) query.recipient = recipientId;
  const existing = await Notification.findOne(query);
  return !!existing;
}

// Send follow-up reminders to sales people whose leads are due for a follow-up
const runFollowUpReminders = async () => {
  try {
    const now = new Date();

    const dueLeads = await Lead.find({
      followUpRequired: true,
      followUpDateTime: { $ne: null, $lte: now },
      status: { $in: ['active', 'pending', 'on_hold'] }
    }).select('_id firstName lastName phone email status createdBy followUpDateTime');

    let sent = 0;
    for (const lead of dueLeads) {
      // Only remind the owner when they have a user account
      const recipient = lead.createdBy;
      if (!recipient) continue;

      if (await alreadyNotified(recipient, 'follow_up_reminder', lead._id)) continue;

      const daysSinceLastContact = Math.max(0, Math.floor((now - lead.followUpDateTime) / (24 * 60 * 60 * 1000)));

      await NotificationService.createSalesNotification('follow_up_reminder', {
        assignedTo: recipient,
        leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        leadPhone: lead.phone,
        entityId: lead._id
      });

      sent += 1;
    }

    if (sent > 0) console.log(`[reminderScheduler] Sent ${sent} follow-up reminders`);
  } catch (error) {
    console.error('[reminderScheduler] runFollowUpReminders error:', error.message);
  }
};

// Send payment-overdue alerts to the accounts department
const runPaymentOverdueCheck = async () => {
  try {
    const now = new Date();

    // Payment is overdue when there was a scheduled installment date or purchase is older than 30 days
    const cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const overduePurchases = await CustomerPurchase.find({
      isFullyPaid: false,
      remainingAmount: { $gt: 0 },
      purchaseDate: { $lte: cutoffDate }
    }).populate('customerId', 'firstName lastName name businessName');

    let sent = 0;
    for (const purchase of overduePurchases) {
      if (await alreadyNotified(null, 'payment_overdue', purchase._id)) continue;

      const customer = purchase.customerId;
      const customerName = customer
        ? (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : customer.name) || customer.businessName
        : 'Customer';

      const daysOverdue = Math.floor((now - purchase.purchaseDate) / (24 * 60 * 60 * 1000));

      await NotificationService.createAccountsNotification('payment_overdue', {
        customerName,
        amount: purchase.remainingAmount,
        daysOverdue,
        customerPhone: customer?.phone || '',
        invoiceNumber: String(purchase.purchaseID || ''),
        entityId: purchase._id
      });

      sent += 1;
    }

    if (sent > 0) console.log(`[reminderScheduler] Sent payment overdue alerts for ${sent} purchases`);
  } catch (error) {
    console.error('[reminderScheduler] runPaymentOverdueCheck error:', error.message);
  }
};

// Run all periodic checks
const runScheduledReminders = async () => {
  await runFollowUpReminders();
  await runPaymentOverdueCheck();
};

// Schedule a callback to run once daily at a fixed IST hour.
const scheduleDailyIST = (hour, minute, fn) => {
  const tick = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const next = new Date(istNow);
    next.setUTCHours(hour, minute, 0, 0);
    if (next <= istNow) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - istNow.getTime();
    const h = setTimeout(() => { fn().catch(e => console.error(e.message)); tick(); }, delay);
    if (h.unref) h.unref();
  };
  tick();
};

// Start periodic scheduler. Returns the interval handle.
const startReminderScheduler = (intervalMs = 6 * 60 * 60 * 1000) => {
  // Fire once shortly after boot, then every interval
  setTimeout(() => runScheduledReminders(), 60 * 1000);
  const handle = setInterval(runScheduledReminders, intervalMs);
  if (handle.unref) handle.unref();

  // Installation reminders at 18:00 IST daily
  scheduleDailyIST(18, 0, sendDailyInstallationReminders);

  return handle;
};

module.exports = {
  runFollowUpReminders,
  runPaymentOverdueCheck,
  runScheduledReminders,
  startReminderScheduler
};