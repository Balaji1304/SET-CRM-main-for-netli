const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const OrderTracking = require('../models/OrderTracking');

describe('OrderTracking Model', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });



  describe('Schema Validation', () => {
    it('should validate required fields', () => {
      const tracking = new OrderTracking();
      const validationError = tracking.validateSync();

      expect(validationError.errors.purchaseId).to.exist;
      expect(validationError.errors.trackingNumber).to.exist;
      expect(validationError.errors.currentStatus).to.not.exist; // has default
    });

    it('should validate status enum values', () => {
      const tracking = new OrderTracking({
        purchaseId: new mongoose.Types.ObjectId(),
        trackingNumber: 'TRK-123',
        currentStatus: 'invalid_status'
      });

      const validationError = tracking.validateSync();
      expect(validationError.errors.currentStatus).to.exist;
    });
    

    it('should accept valid status values', () => {
      const validStatuses = [
        'order_placed', 'payment_confirmed', 'order_approved', 'order_accepted',
        'order_processing', 'items_reserved', 'packaging_started', 'package_ready',
        'ready_to_dispatch', 'dispatched', 'in_transit', 'out_for_delivery',
        'delivered', 'installation_scheduled', 'engineer_assigned',
        'installation_in_progress', 'installation_completed', 'service_activated',
        'order_completed', 'warranty_active', 'on_hold', 'delayed',
        'cancelled', 'returned'
      ];

      validStatuses.forEach(status => {
        const tracking = new OrderTracking({
          purchaseId: new mongoose.Types.ObjectId(),
          trackingNumber: 'TRK-123',
          currentStatus: status
        });

        const validationError = tracking.validateSync();
        expect(validationError).to.be.undefined;
      });
    });

    it('should validate phase enum values', () => {
      const tracking = new OrderTracking({
        purchaseId: new mongoose.Types.ObjectId(),
        trackingNumber: 'TRK-123',
        currentPhase: 'invalid_phase'
      });

      const validationError = tracking.validateSync();
      expect(validationError.errors.currentPhase).to.exist;
    });

    it('should validate progress percentage range', () => {
      const tracking1 = new OrderTracking({
        purchaseId: new mongoose.Types.ObjectId(),
        trackingNumber: 'TRK-123',
        progressPercentage: -10
      });

      const tracking2 = new OrderTracking({
        purchaseId: new mongoose.Types.ObjectId(),
        trackingNumber: 'TRK-123',
        progressPercentage: 150
      });

      const error1 = tracking1.validateSync();
      const error2 = tracking2.validateSync();

      expect(error1.errors.progressPercentage).to.exist;
      expect(error2.errors.progressPercentage).to.exist;
    });
  });

  describe('addEvent method', () => {
    let tracking;

    beforeEach(() => {
      tracking = new OrderTracking({
        purchaseId: new mongoose.Types.ObjectId(),
        trackingNumber: 'TRK-123',
        currentStatus: 'order_placed'
      });
      tracking.save = sandbox.stub().resolves(tracking);
    });

    it('should add event with valid data', async () => {
      const eventData = {
        status: 'payment_confirmed',
        title: 'Payment Confirmed',
        description: 'Payment has been processed successfully'
      };

      await tracking.addEvent(eventData, new mongoose.Types.ObjectId());

      expect(tracking.events).to.have.length(1);
      expect(tracking.events[0]).to.include(eventData);
      expect(tracking.currentStatus).to.equal('payment_confirmed');
    });

    it('should throw error for missing required fields', async () => {
      const eventData = {
        status: 'payment_confirmed'
        // missing title and description
      };

      try {
        await tracking.addEvent(eventData, new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Missing required fields');
      }
    });

    it('should throw error for invalid status', async () => {
      const eventData = {
        status: 'invalid_status',
        title: 'Invalid Event',
        description: 'This should fail'
      };

      try {
        await tracking.addEvent(eventData, new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid status');
      }
    });

    it('should prevent duplicate events within 1 minute', async () => {
      const eventData = {
        status: 'payment_confirmed',
        title: 'Payment Confirmed',
        description: 'Payment has been processed successfully'
      };

      // Add first event
      await tracking.addEvent(eventData, new mongoose.Types.ObjectId());
      expect(tracking.events).to.have.length(1);

      // Try to add duplicate event immediately
      await tracking.addEvent(eventData, new mongoose.Types.ObjectId());
      expect(tracking.events).to.have.length(1); // Should not add duplicate
    });

    it('should update phase based on status', async () => {
      const testCases = [
        { status: 'order_placed', expectedPhase: 'processing' },
        { status: 'order_accepted', expectedPhase: 'processing' },
        { status: 'packaging_started', expectedPhase: 'packaging' },
        { status: 'dispatched', expectedPhase: 'shipping' },
        { status: 'engineer_assigned', expectedPhase: 'installation' },
        { status: 'order_completed', expectedPhase: 'completed' },
        { status: 'on_hold', expectedPhase: 'issues' }
      ];

      for (const testCase of testCases) {
        const eventData = {
          status: testCase.status,
          title: 'Test Event',
          description: 'Test description'
        };

        await tracking.addEvent(eventData, new mongoose.Types.ObjectId());
        expect(tracking.currentPhase).to.equal(testCase.expectedPhase);
      }
    });

    it('should update progress percentage based on status', async () => {
      const testCases = [
        { status: 'order_placed', expectedProgress: 5 },
        { status: 'payment_confirmed', expectedProgress: 15 },
        { status: 'order_accepted', expectedProgress: 25 },
        { status: 'ready_to_dispatch', expectedProgress: 70 },
        { status: 'dispatched', expectedProgress: 75 },
        { status: 'delivered', expectedProgress: 90 },
        { status: 'installation_completed', expectedProgress: 98 },
        { status: 'order_completed', expectedProgress: 100 }
      ];

      for (const testCase of testCases) {
        const eventData = {
          status: testCase.status,
          title: 'Test Event',
          description: 'Test description'
        };

        await tracking.addEvent(eventData, new mongoose.Types.ObjectId());
        expect(tracking.progressPercentage).to.equal(testCase.expectedProgress);
      }
    });

    it('should update milestones correctly', async () => {
      const testCases = [
        { status: 'order_placed', milestone: 'orderPlaced' },
        { status: 'payment_confirmed', milestone: 'paymentConfirmed' },
        { status: 'order_approved', milestone: 'orderApproved' },
        { status: 'order_accepted', milestone: 'orderApproved' }, // uses same milestone
        { status: 'dispatched', milestone: 'dispatched' },
        { status: 'delivered', milestone: 'delivered' },
        { status: 'installation_completed', milestone: 'installationCompleted' },
        { status: 'order_completed', milestone: 'orderCompleted' }
      ];

      for (const testCase of testCases) {
        const eventData = {
          status: testCase.status,
          title: 'Test Event',
          description: 'Test description'
        };

        await tracking.addEvent(eventData, new mongoose.Types.ObjectId());
        expect(tracking.milestones[testCase.milestone]).to.be.instanceOf(Date);
      }
    });

    it('should update actual dates for delivery and installation', async () => {
      // Test delivery
      const deliveryEvent = {
        status: 'delivered',
        title: 'Delivered',
        description: 'Package delivered'
      };

      await tracking.addEvent(deliveryEvent, new mongoose.Types.ObjectId());
      expect(tracking.actualDelivery).to.be.instanceOf(Date);

      // Test installation completion
      const installationEvent = {
        status: 'installation_completed',
        title: 'Installation Completed',
        description: 'Installation finished'
      };

      await tracking.addEvent(installationEvent, new mongoose.Types.ObjectId());
      expect(tracking.actualInstallation).to.be.instanceOf(Date);
    });

    it('should set actualDate for completed events', async () => {
      const eventData = {
        status: 'installation_completed',
        title: 'Installation Completed',
        description: 'Installation finished successfully'
      };

      await tracking.addEvent(eventData, new mongoose.Types.ObjectId());

      expect(tracking.events[0].actualDate).to.be.instanceOf(Date);
    });
  });

  describe('updateEstimates method', () => {
    let tracking;

    beforeEach(() => {
      tracking = new OrderTracking({
        purchaseId: new mongoose.Types.ObjectId(),
        trackingNumber: 'TRK-123'
      });
      tracking.save = sandbox.stub().resolves(tracking);
    });

    it('should update delivery estimate', async () => {
      const deliveryDate = new Date('2024-01-15');
      await tracking.updateEstimates({ delivery: deliveryDate });

      expect(tracking.estimatedDelivery).to.equal(deliveryDate);
    });

    it('should update installation estimate', async () => {
      const installationDate = new Date('2024-01-20');
      await tracking.updateEstimates({ installation: installationDate });

      expect(tracking.estimatedInstallation).to.equal(installationDate);
    });

    it('should update both estimates', async () => {
      const deliveryDate = new Date('2024-01-15');
      const installationDate = new Date('2024-01-20');

      await tracking.updateEstimates({
        delivery: deliveryDate,
        installation: installationDate
      });

      expect(tracking.estimatedDelivery).to.equal(deliveryDate);
      expect(tracking.estimatedInstallation).to.equal(installationDate);
    });
  });

  describe('customerEvents virtual', () => {
    let tracking;

    beforeEach(() => {
      tracking = new OrderTracking({
        purchaseId: new mongoose.Types.ObjectId(),
        trackingNumber: 'TRK-123'
      });
    });

    it('should return only visible events', () => {
      tracking.events = [
        { status: 'order_placed', title: 'Order Placed', description: 'Order placed', isVisible: true },
        { status: 'internal_note', title: 'Internal Note', description: 'Internal note', isVisible: false },
        { status: 'dispatched', title: 'Dispatched', description: 'Order dispatched', isVisible: true }
      ];

      const customerEvents = tracking.customerEvents;

      expect(customerEvents).to.have.length(2);
      expect(customerEvents.every(event => event.isVisible)).to.be.true;
    });

    it('should return empty array when no visible events', () => {
      tracking.events = [
        { status: 'internal_note', title: 'Internal Note', description: 'Internal note', isVisible: false }
      ];

      const customerEvents = tracking.customerEvents;
      expect(customerEvents).to.have.length(0);
    });
  });

  describe('generateTrackingNumber static method', () => {
    it('should generate unique tracking number', async () => {
      sandbox.stub(OrderTracking, 'countDocuments').resolves(5);

      const trackingNumber = await OrderTracking.generateTrackingNumber();

      expect(trackingNumber).to.match(/^TRK-\d+-0006$/);
    });

    it('should pad count with zeros', async () => {
      sandbox.stub(OrderTracking, 'countDocuments').resolves(0);

      const trackingNumber = await OrderTracking.generateTrackingNumber();

      expect(trackingNumber).to.match(/^TRK-\d+-0001$/);
    });
  });

  describe('autoUpdateFromPurchase static method', () => {
    beforeEach(() => {
      sandbox.stub(OrderTracking, 'generateTrackingNumber').resolves('TRK-123');
    });

    it('should create tracking and update for valid status', async () => {
      const mockTracking = {
        _id: 'track123',
        addEvent: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(null);
      sandbox.stub(OrderTracking.prototype, 'constructor').returns(mockTracking);

      const result = await OrderTracking.autoUpdateFromPurchase(
        'purchase123',
        'order_accepted',
        'user123',
        { estimatedDate: new Date() }
      );

      expect(mockTracking.addEvent.calledTwice).to.be.true; // initial + status event
    });

    it('should use existing tracking if found', async () => {
      const mockTracking = {
        _id: 'track123',
        addEvent: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);

      await OrderTracking.autoUpdateFromPurchase(
        'purchase123',
        'ready_to_dispatch',
        'user123'
      );

      expect(mockTracking.addEvent.calledOnce).to.be.true; // only status event
    });

    it('should return null for unknown status', async () => {
      const result = await OrderTracking.autoUpdateFromPurchase(
        'purchase123',
        'unknown_status',
        'user123'
      );

      expect(result).to.be.null;
    });

    it('should handle errors gracefully', async () => {
      sandbox.stub(OrderTracking, 'findOne').throws(new Error('Database error'));

      try {
        await OrderTracking.autoUpdateFromPurchase('purchase123', 'order_accepted', 'user123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Database error');
      }
    });
  });
});
