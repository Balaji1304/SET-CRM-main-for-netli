const mongoose = require('mongoose');

const trackingEventSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      // Order Processing
      'order_placed',
      'payment_confirmed',
      'order_approved',
      'order_processing',
      
      // Inventory & Packaging  
      'items_reserved',
      'packaging_started',
      'package_ready',
      'ready_to_dispatch',
      
      // Shipping & Logistics
      'dispatched',
      'in_transit',
      'out_for_delivery',
      'delivered',
      
      // Installation & Service
      'installation_scheduled',
      'engineer_assigned',
      'installation_in_progress',
      'installation_completed',
      'service_activated',
      
      // Completion
      'order_completed',
      'warranty_active',
      
      // Issues
      'on_hold',
      'delayed',
      'cancelled',
      'returned',
      
      // Additional statuses
      'order_accepted'
    ]
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isVisible: {
    type: Boolean,
    default: true // Controls if customer can see this event
  },
  estimatedDate: {
    type: Date,
    default: null
  },
  actualDate: {
    type: Date,
    default: null
  }
});

const orderTrackingSchema = new mongoose.Schema({
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerPurchase',
    required: true,
    unique: true
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true
  },
  currentStatus: {
    type: String,
    required: true,
    enum: [
      'order_placed', 'payment_confirmed', 'order_approved', 'order_processing',
      'items_reserved', 'packaging_started', 'package_ready', 'ready_to_dispatch',
      'dispatched', 'in_transit', 'out_for_delivery', 'delivered',
      'installation_scheduled', 'engineer_assigned', 'installation_in_progress',
      'installation_completed', 'service_activated', 'order_completed', 
      'warranty_active', 'on_hold', 'delayed', 'cancelled', 'returned',
      'order_accepted'
    ],
    default: 'order_placed'
  },
  currentPhase: {
    type: String,
    enum: ['processing', 'packaging', 'shipping', 'installation', 'completed', 'issues'],
    default: 'processing'
  },
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  estimatedDelivery: {
    type: Date,
    default: null
  },
  estimatedInstallation: {
    type: Date,
    default: null
  },
  actualDelivery: {
    type: Date,
    default: null
  },
  actualInstallation: {
    type: Date,
    default: null
  },
  events: [trackingEventSchema],
  shippingDetails: {
    carrier: {
      type: String,
      default: null
    },
    trackingId: {
      type: String,
      default: null
    },
    shippedDate: {
      type: Date,
      default: null
    },
    deliveredDate: {
      type: Date,
      default: null
    }
  },
  installationDetails: {
    assignedEngineerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    scheduledDate: {
      type: Date,
      default: null
    },
    completedDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: null
    }
  },
  customerNotes: [{
    note: {
      type: String,
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false // false means customer can see it
    }
  }],
  milestones: {
    orderPlaced: { type: Date, default: null },
    paymentConfirmed: { type: Date, default: null },
    orderApproved: { type: Date, default: null },
    packageReady: { type: Date, default: null },
    dispatched: { type: Date, default: null },
    delivered: { type: Date, default: null },
    installationCompleted: { type: Date, default: null },
    orderCompleted: { type: Date, default: null }
  }
}, {
  timestamps: true
});

// Index for efficient queries
orderTrackingSchema.index({ purchaseId: 1 });
orderTrackingSchema.index({ trackingNumber: 1 });
orderTrackingSchema.index({ currentStatus: 1 });
orderTrackingSchema.index({ currentPhase: 1 });

// Method to add tracking event
orderTrackingSchema.methods.addEvent = async function(eventData, updatedBy) {
  try {
    // Validate required fields
    if (!eventData.status || !eventData.title || !eventData.description) {
      throw new Error('Missing required fields: status, title, and description are required');
    }

    // Validate status against enum
    const validStatuses = this.schema.paths.currentStatus.enumValues;
    if (!validStatuses.includes(eventData.status)) {
      throw new Error(`Invalid status: ${eventData.status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Check for duplicate events (prevent race conditions)
    const existingEvent = this.events.find(e => 
      e.status === eventData.status && 
      Math.abs(new Date() - e.timestamp) < 60000 // within 1 minute
    );

    if (existingEvent) {
      console.log(`Duplicate event detected for status ${eventData.status}, skipping...`);
      return this;
    }

    const event = {
      ...eventData,
      updatedBy,
      timestamp: new Date(),
      actualDate: eventData.actualDate || (eventData.status.includes('completed') || eventData.status.includes('delivered') ? new Date() : null)
    };
    
    this.events.push(event);
    this.currentStatus = eventData.status;
    
    // Update phase based on status
    const phaseMapping = {
      'order_placed': 'processing',
      'payment_confirmed': 'processing',
      'order_approved': 'processing',
      'order_accepted': 'processing',
      'order_processing': 'processing',
      'items_reserved': 'packaging',
      'packaging_started': 'packaging',
      'package_ready': 'packaging',
      'ready_to_dispatch': 'packaging',
      'dispatched': 'shipping',
      'in_transit': 'shipping',
      'out_for_delivery': 'shipping',
      'delivered': 'shipping',
      'installation_scheduled': 'installation',
      'engineer_assigned': 'installation',
      'installation_in_progress': 'installation',
      'installation_completed': 'installation',
      'service_activated': 'completed',
      'order_completed': 'completed',
      'warranty_active': 'completed',
      'on_hold': 'issues',
      'delayed': 'issues',
      'cancelled': 'issues',
      'returned': 'issues'
    };
    
    this.currentPhase = phaseMapping[eventData.status] || this.currentPhase;
    
    // Update progress percentage
    const progressMapping = {
      'order_placed': 5,
      'payment_confirmed': 15,
      'order_approved': 20,
      'order_accepted': 25,
      'order_processing': 35,
      'items_reserved': 45,
      'packaging_started': 55,
      'package_ready': 65,
      'ready_to_dispatch': 70,
      'dispatched': 75,
      'in_transit': 80,
      'out_for_delivery': 85,
      'delivered': 90,
      'installation_scheduled': 92,
      'engineer_assigned': 94,
      'installation_in_progress': 96,
      'installation_completed': 98,
      'service_activated': 99,
      'order_completed': 100,
      'warranty_active': 100
    };
    
    this.progressPercentage = progressMapping[eventData.status] || this.progressPercentage;
    
    // Update milestones
    const milestoneMapping = {
      'order_placed': 'orderPlaced',
      'payment_confirmed': 'paymentConfirmed',
      'order_approved': 'orderApproved',
      'order_accepted': 'orderApproved', // Use same milestone as order_approved
      'package_ready': 'packageReady',
      'dispatched': 'dispatched',
      'delivered': 'delivered',
      'installation_completed': 'installationCompleted',
      'order_completed': 'orderCompleted'
    };
    
    if (milestoneMapping[eventData.status]) {
      this.milestones[milestoneMapping[eventData.status]] = new Date();
    }

    // Update actual dates based on status
    if (eventData.status === 'delivered') {
      this.actualDelivery = new Date();
    } else if (eventData.status === 'installation_completed') {
      this.actualInstallation = new Date();
    }
    
    return await this.save();
  } catch (error) {
    console.error('Error adding tracking event:', error);
    throw error;
  }
};

// Method to update estimated dates
orderTrackingSchema.methods.updateEstimates = function(estimates) {
  if (estimates.delivery) this.estimatedDelivery = estimates.delivery;
  if (estimates.installation) this.estimatedInstallation = estimates.installation;
  return this.save();
};

// Virtual for customer-visible events
orderTrackingSchema.virtual('customerEvents').get(function() {
  return this.events.filter(event => event.isVisible);
});

// Static method to generate tracking number
orderTrackingSchema.statics.generateTrackingNumber = async function() {
  const count = await this.countDocuments();
  return `TRK-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
};

// Static method to automatically update tracking when purchase status changes
orderTrackingSchema.statics.autoUpdateFromPurchase = async function(purchaseId, newStatus, updatedBy, additionalData = {}) {
  try {
    const statusMapping = {
      'pending_assignment': { status: 'order_processing', title: 'Order Processing', description: 'Your order is being processed by our team.' },
      'order_accepted': { status: 'order_accepted', title: 'Order Accepted', description: 'Your order has been accepted and is being prepared for production.' },
      'ready_to_dispatch': { status: 'ready_to_dispatch', title: 'Ready to Dispatch', description: 'Your order is ready and will be dispatched soon.' },
      'assigned': { status: 'engineer_assigned', title: 'Engineer Assigned', description: 'A service engineer has been assigned for installation.' },
      'in_progress': { status: 'installation_in_progress', title: 'Installation in Progress', description: 'Installation is currently underway.' },
      'completed': { status: 'installation_completed', title: 'Installation Completed', description: 'Installation has been successfully completed.' }
    };

    const trackingUpdate = statusMapping[newStatus];
    if (!trackingUpdate) {
      console.log(`No tracking mapping found for purchase status: ${newStatus}`);
      return null;
    }

    let tracking = await this.findOne({ purchaseId });
    
    // Create tracking record if it doesn't exist
    if (!tracking) {
      const trackingNumber = await this.generateTrackingNumber();
      tracking = new this({
        purchaseId,
        trackingNumber,
        currentStatus: 'order_placed'
      });

      // Add initial event
      await tracking.addEvent({
        status: 'order_placed',
        title: 'Order Placed',
        description: 'Your order has been successfully placed and is being processed.',
        isVisible: true
      }, updatedBy);
    }

    // Add the new status event
    await tracking.addEvent({
      ...trackingUpdate,
      ...additionalData,
      isVisible: true
    }, updatedBy);

    return tracking;
  } catch (error) {
    console.error('Error in autoUpdateFromPurchase:', error);
    throw error;
  }
};

module.exports = mongoose.model('OrderTracking', orderTrackingSchema);


