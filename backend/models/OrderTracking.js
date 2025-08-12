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
      'returned'
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
      'warranty_active', 'on_hold', 'delayed', 'cancelled', 'returned'
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
orderTrackingSchema.methods.addEvent = function(eventData, updatedBy) {
  const event = {
    ...eventData,
    updatedBy,
    timestamp: new Date()
  };
  
  this.events.push(event);
  this.currentStatus = eventData.status;
  
  // Update phase based on status
  const phaseMapping = {
    'order_placed': 'processing',
    'payment_confirmed': 'processing',
    'order_approved': 'processing',
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
    'order_approved': 25,
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
    'package_ready': 'packageReady',
    'dispatched': 'dispatched',
    'delivered': 'delivered',
    'installation_completed': 'installationCompleted',
    'order_completed': 'orderCompleted'
  };
  
  if (milestoneMapping[eventData.status]) {
    this.milestones[milestoneMapping[eventData.status]] = new Date();
  }
  
  return this.save();
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

module.exports = mongoose.model('OrderTracking', orderTrackingSchema);


