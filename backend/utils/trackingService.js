const OrderTracking = require('../models/OrderTracking');
const CustomerPurchase = require('../models/CustomerPurchase');
const NotificationService = require('./notificationService');

/**
 * Centralized tracking service for managing order tracking updates
 */
class TrackingService {
  
  /**
   * Create or ensure tracking record exists for a purchase
   * @param {string} purchaseId - Purchase ID
   * @param {string} updatedBy - User ID who triggered the update
   * @returns {Promise<Object>} - Tracking record
   */
  static async ensureTrackingExists(purchaseId, updatedBy) {
    try {
      let tracking = await OrderTracking.findOne({ purchaseId });
      
      if (!tracking) {
        const trackingNumber = await OrderTracking.generateTrackingNumber();
        tracking = new OrderTracking({
          purchaseId,
          trackingNumber,
          currentStatus: 'order_placed'
        });

        await tracking.addEvent({
          status: 'order_placed',
          title: 'Order Placed',
          description: 'Your order has been successfully placed and is being processed.',
          isVisible: true
        }, updatedBy);
        
        console.log(`Created tracking record for purchase ${purchaseId}`);
      }
      
      return tracking;
    } catch (error) {
      console.error('Error ensuring tracking exists:', error);
      throw error;
    }
  }

  /**
   * Update tracking when purchase status changes
   * @param {string} purchaseId - Purchase ID
   * @param {string} newStatus - New purchase status
   * @param {string} updatedBy - User ID who triggered the update
   * @param {Object} additionalData - Additional data for the tracking event
   * @returns {Promise<Object>} - Updated tracking record
   */
  static async updateFromPurchaseStatus(purchaseId, newStatus, updatedBy, additionalData = {}) {
    try {
      // Ensure tracking record exists
      const tracking = await this.ensureTrackingExists(purchaseId, updatedBy);
      
      // Map purchase status to tracking status
      const statusMapping = {
        'pending_assignment': { 
          status: 'order_processing', 
          title: 'Order Processing', 
          description: 'Your order is being processed by our team.' 
        },
        'order_accepted': { 
          status: 'order_accepted', 
          title: 'Order Accepted', 
          description: 'Your order has been accepted and is being prepared for production.' 
        },
        'ready_to_dispatch': { 
          status: 'ready_to_dispatch', 
          title: 'Ready to Dispatch', 
          description: 'Your order is ready and will be dispatched soon.' 
        },
        'assigned': { 
          status: 'engineer_assigned', 
          title: 'Engineer Assigned', 
          description: 'A service engineer has been assigned for installation.' 
        },
        'in_progress': { 
          status: 'installation_in_progress', 
          title: 'Installation in Progress', 
          description: 'Installation is currently underway.' 
        },
        'completed': { 
          status: 'installation_completed', 
          title: 'Installation Completed', 
          description: 'Installation has been successfully completed.' 
        }
      };

      const trackingUpdate = statusMapping[newStatus];
      if (!trackingUpdate) {
        console.log(`No tracking mapping found for purchase status: ${newStatus}`);
        return tracking;
      }

      // Add the tracking event
      await tracking.addEvent({
        ...trackingUpdate,
        ...additionalData,
        isVisible: true
      }, updatedBy);

      // Send notification to customer
      await this.notifyCustomer(purchaseId, trackingUpdate, tracking.trackingNumber);
      
      console.log(`Updated tracking for purchase ${purchaseId} to status ${newStatus}`);
      return tracking;
    } catch (error) {
      console.error('Error updating tracking from purchase status:', error);
      throw error;
    }
  }

  /**
   * Update tracking for installation events
   * @param {string} purchaseId - Purchase ID
   * @param {string} event - Installation event type
   * @param {string} updatedBy - User ID who triggered the update
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Updated tracking record
   */
  static async updateInstallationStatus(purchaseId, event, updatedBy, metadata = {}) {
    try {
      const tracking = await this.ensureTrackingExists(purchaseId, updatedBy);
      
      const eventMapping = {
        'scheduled': {
          status: 'installation_scheduled',
          title: 'Installation Scheduled',
          description: `Installation has been scheduled${metadata.scheduledDate ? ` for ${new Date(metadata.scheduledDate).toLocaleDateString()}` : ''}.`
        },
        'started': {
          status: 'installation_in_progress',
          title: 'Installation Started',
          description: 'Installation work has begun at your location.'
        },
        'completed': {
          status: 'installation_completed',
          title: 'Installation Completed',
          description: 'Installation has been successfully completed. Your solar system is now ready.'
        }
      };

      const trackingUpdate = eventMapping[event];
      if (!trackingUpdate) {
        console.log(`No tracking mapping found for installation event: ${event}`);
        return tracking;
      }

      await tracking.addEvent({
        ...trackingUpdate,
        metadata,
        estimatedDate: metadata.scheduledDate ? new Date(metadata.scheduledDate) : null,
        isVisible: true
      }, updatedBy);

      // Send notification to customer
      await this.notifyCustomer(purchaseId, trackingUpdate, tracking.trackingNumber);
      
      return tracking;
    } catch (error) {
      console.error('Error updating installation tracking:', error);
      throw error;
    }
  }

  /**
   * Update tracking for shipping events
   * @param {string} purchaseId - Purchase ID
   * @param {Object} shippingData - Shipping information
   * @param {string} updatedBy - User ID who triggered the update
   * @returns {Promise<Object>} - Updated tracking record
   */
  static async updateShippingStatus(purchaseId, shippingData, updatedBy) {
    try {
      const tracking = await this.ensureTrackingExists(purchaseId, updatedBy);
      
      // Update shipping details
      tracking.shippingDetails = {
        carrier: shippingData.carrier,
        trackingId: shippingData.trackingId,
        shippedDate: shippingData.shippedDate ? new Date(shippingData.shippedDate) : new Date()
      };

      await tracking.addEvent({
        status: 'dispatched',
        title: 'Order Dispatched',
        description: `Your order has been dispatched via ${shippingData.carrier}${shippingData.trackingId ? `. Tracking ID: ${shippingData.trackingId}` : ''}.`,
        metadata: { 
          carrier: shippingData.carrier, 
          trackingId: shippingData.trackingId 
        },
        isVisible: true
      }, updatedBy);

      // Send notification to customer
      await this.notifyCustomer(purchaseId, {
        title: 'Order Dispatched',
        description: `Your order has been dispatched via ${shippingData.carrier}.`
      }, tracking.trackingNumber);
      
      return tracking;
    } catch (error) {
      console.error('Error updating shipping tracking:', error);
      throw error;
    }
  }

  /**
   * Send notification to customer about tracking update
   * @param {string} purchaseId - Purchase ID
   * @param {Object} eventData - Event data
   * @param {string} trackingNumber - Tracking number
   */
  static async notifyCustomer(purchaseId, eventData, trackingNumber) {
    try {
      const purchase = await CustomerPurchase.findById(purchaseId).populate('customerId');
      if (purchase && purchase.customerId && purchase.customerId.user) {
        // Use the User ID from the Customer record for notifications
        await NotificationService.createNotification({
          recipient: purchase.customerId.user,
          sender: null, // System notification
          title: `Order Update: ${eventData.title}`,
          message: eventData.description,
          type: 'order_update',
          priority: 'medium',
          data: {
            purchaseId: purchaseId,
            trackingNumber: trackingNumber,
            status: eventData.status || 'update'
          }
        });
      } else {
        console.warn(`Cannot send notification for purchase ${purchaseId}: Customer or User not found`);
      }
    } catch (error) {
      console.error('Error sending tracking notification:', error);
      // Don't throw - notification failure shouldn't break tracking update
    }
  }

  /**
   * Get tracking data with error handling
   * @param {string} purchaseId - Purchase ID
   * @returns {Promise<Object>} - Tracking data
   */
  static async getTrackingData(purchaseId) {
    try {
      let tracking = await OrderTracking.findOne({ purchaseId })
        .populate('events.updatedBy', 'name role')
        .populate('installationDetails.assignedEngineerId', 'name phone email')
        .populate('customerNotes.addedBy', 'name role');

      // Auto-create if not exists (for backward compatibility)
      if (!tracking) {
        console.log(`No tracking found for purchase ${purchaseId}, creating...`);
        const trackingNumber = await OrderTracking.generateTrackingNumber();
        tracking = new OrderTracking({
          purchaseId,
          trackingNumber,
          currentStatus: 'order_placed'
        });
        await tracking.save();
      }

      return tracking;
    } catch (error) {
      console.error('Error getting tracking data:', error);
      throw error;
    }
  }

  /**
   * Bulk create missing tracking records
   * @param {Array} purchaseIds - Array of purchase IDs
   * @param {string} updatedBy - User ID
   * @returns {Promise<Array>} - Created tracking records
   */
  static async bulkCreateMissingTracking(purchaseIds, updatedBy) {
    try {
      const existingTrackings = await OrderTracking.find({ 
        purchaseId: { $in: purchaseIds } 
      }).select('purchaseId');
      
      const existingIds = new Set(existingTrackings.map(t => String(t.purchaseId)));
      const missingPurchaseIds = purchaseIds.filter(id => !existingIds.has(String(id)));

      if (missingPurchaseIds.length === 0) {
        return [];
      }

      const created = [];
      for (const purchaseId of missingPurchaseIds) {
        try {
          const tracking = await this.ensureTrackingExists(purchaseId, updatedBy);
          created.push(tracking);
        } catch (error) {
          console.error(`Error creating tracking for purchase ${purchaseId}:`, error);
          // Continue with others
        }
      }

      console.log(`Created ${created.length} missing tracking records`);
      return created;
    } catch (error) {
      console.error('Error in bulk create missing tracking:', error);
      throw error;
    }
  }
}

module.exports = TrackingService;
