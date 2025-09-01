const CustomerPurchase = require('../models/CustomerPurchase');
const User = require('../models/User');
const { sendServiceEngineerWhatsApp } = require('./sendNotification');

/**
 * Send WhatsApp reminders to service engineers for installations scheduled for tomorrow
 * This function should be called daily via a cron job or scheduled task
 */
const sendDailyInstallationReminders = async () => {
  try {
    console.log('🔄 Starting daily installation reminder check...');

    // Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find all installations scheduled for tomorrow
    const upcomingInstallations = await CustomerPurchase.find({
      installationDate: {
        $gte: tomorrow,
        $lt: dayAfterTomorrow
      },
      installationStatus: { $in: ['assigned', 'accepted'] },
      assignedEngineerId: { $exists: true, $ne: null }
    })
    .populate('assignedEngineerId', 'name phone whatsapp countryCode notificationPreferences')
    .populate('customerId', 'firstName lastName phone whatsapp address');

    console.log(`📋 Found ${upcomingInstallations.length} installations scheduled for tomorrow`);

    if (upcomingInstallations.length === 0) {
      console.log('✅ No reminders to send today');
      return { success: true, remindersSent: 0 };
    }

    // Group installations by engineer
    const installationsByEngineer = {};
    upcomingInstallations.forEach(installation => {
      const engineerId = installation.assignedEngineerId._id.toString();
      if (!installationsByEngineer[engineerId]) {
        installationsByEngineer[engineerId] = {
          engineer: installation.assignedEngineerId,
          installations: []
        };
      }
      installationsByEngineer[engineerId].installations.push(installation);
    });

    let remindersSent = 0;
    const reminderPromises = [];

    // Send reminders to each engineer
    for (const [engineerId, data] of Object.entries(installationsByEngineer)) {
      const { engineer, installations } = data;

      // Skip if engineer has WhatsApp disabled
      if (engineer.notificationPreferences && !engineer.notificationPreferences.whatsappEnabled) {
        console.log(`⏭️ Skipping ${engineer.name} - WhatsApp notifications disabled`);
        continue;
      }

      // Create reminder for each installation
      installations.forEach(installation => {
        const customerName = installation.customerId.firstName 
          ? `${installation.customerId.firstName} ${installation.customerId.lastName || ''}`
          : 'Customer';
        const customerPhone = installation.customerId.phone || installation.customerId.whatsapp || 'Not provided';
        const installationDate = new Date(installation.installationDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        const reminderPromise = sendServiceEngineerWhatsApp('installation_reminder', engineer, {
          customerName,
          customerPhone,
          installationDate,
          orderNumber: installation.purchaseID
        }).then(result => {
          if (result.success) {
            console.log(`✅ Reminder sent to ${engineer.name} for order ${installation.purchaseID}`);
            remindersSent++;
          } else {
            console.log(`❌ Failed to send reminder to ${engineer.name}: ${result.error || result.reason}`);
          }
          return result;
        }).catch(error => {
          console.error(`❌ Error sending reminder to ${engineer.name}:`, error);
          return { success: false, error: error.message };
        });

        reminderPromises.push(reminderPromise);
      });
    }

    // Wait for all reminders to be sent
    await Promise.all(reminderPromises);

    console.log(`✅ Installation reminder process completed. Sent ${remindersSent} reminders.`);
    return { success: true, remindersSent };

  } catch (error) {
    console.error('❌ Error in daily installation reminder process:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send urgent WhatsApp notification when a customer tries to contact an engineer
 * This can be called from customer service or support systems
 */
const sendUrgentCustomerContactNotification = async (purchaseId, customerMessage = '') => {
  try {
    const purchase = await CustomerPurchase.findById(purchaseId)
      .populate('assignedEngineerId', 'name phone whatsapp countryCode notificationPreferences')
      .populate('customerId', 'firstName lastName phone whatsapp');

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (!purchase.assignedEngineerId) {
      throw new Error('No engineer assigned to this purchase');
    }

    const engineer = purchase.assignedEngineerId;
    const customerName = purchase.customerId.firstName 
      ? `${purchase.customerId.firstName} ${purchase.customerId.lastName || ''}`
      : 'Customer';
    const customerPhone = purchase.customerId.phone || purchase.customerId.whatsapp || 'Not provided';

    const result = await sendServiceEngineerWhatsApp('urgent_customer_contact', engineer, {
      customerName,
      customerPhone,
      message: customerMessage || 'Customer is trying to reach you regarding the installation.',
      orderNumber: purchase.purchaseID
    });

    console.log(`Urgent customer contact notification sent to ${engineer.name}:`, result.success);
    return result;

  } catch (error) {
    console.error('Error sending urgent customer contact notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test function to verify WhatsApp notifications are working
 */
const testEngineerWhatsApp = async (engineerId, testMessage = 'Test message from CRM system') => {
  try {
    const engineer = await User.findById(engineerId);
    if (!engineer) {
      throw new Error('Engineer not found');
    }

    if (engineer.role !== 'service_engineer') {
      throw new Error('User is not a service engineer');
    }

    const result = await sendServiceEngineerWhatsApp('custom_message', engineer, {
      message: `🧪 TEST MESSAGE\n\n${testMessage}\n\nThis is a test from the Sunlit CRM system to verify WhatsApp notifications are working correctly.`
    });

    console.log(`Test WhatsApp sent to ${engineer.name}:`, result.success);
    return result;

  } catch (error) {
    console.error('Error sending test WhatsApp:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendDailyInstallationReminders,
  sendUrgentCustomerContactNotification,
  testEngineerWhatsApp
};

