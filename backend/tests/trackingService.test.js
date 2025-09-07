const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const TrackingService = require('../utils/trackingService');
const OrderTracking = require('../models/OrderTracking');
const CustomerPurchase = require('../models/CustomerPurchase');
const NotificationService = require('../utils/notificationService');

describe('TrackingService', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('ensureTrackingExists', () => {
    it('should return existing tracking record if found', async () => {
      const mockTracking = {
        _id: 'track123',
        purchaseId: 'purchase123',
        trackingNumber: 'TRK-123',
        currentStatus: 'order_placed'
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);

      const result = await TrackingService.ensureTrackingExists('purchase123', 'user123');

      expect(result).to.equal(mockTracking);
      expect(OrderTracking.findOne.calledWith({ purchaseId: 'purchase123' })).to.be.true;
    });

    it('should create new tracking record if not found', async () => {
      const mockTrackingNumber = 'TRK-12345-0001';
      const mockTracking = {
        purchaseId: 'purchase123',
        trackingNumber: mockTrackingNumber,
        currentStatus: 'order_placed',
        addEvent: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(null);
      sandbox.stub(OrderTracking, 'generateTrackingNumber').resolves(mockTrackingNumber);
      sandbox.stub(OrderTracking.prototype, 'constructor').returns(mockTracking);

      const result = await TrackingService.ensureTrackingExists('purchase123', 'user123');

      expect(OrderTracking.generateTrackingNumber.called).to.be.true;
      expect(mockTracking.addEvent.calledOnce).to.be.true;
    });

    it('should handle errors gracefully', async () => {
      sandbox.stub(OrderTracking, 'findOne').throws(new Error('Database error'));

      try {
        await TrackingService.ensureTrackingExists('purchase123', 'user123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Database error');
      }
    });
  });

  describe('updateFromPurchaseStatus', () => {
    let mockTracking;

    beforeEach(() => {
      mockTracking = {
        _id: 'track123',
        purchaseId: 'purchase123',
        trackingNumber: 'TRK-123',
        currentStatus: 'order_placed',
        addEvent: sandbox.stub().resolves()
      };
    });

    it('should update tracking for order_accepted status', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      const result = await TrackingService.updateFromPurchaseStatus(
        'purchase123', 
        'order_accepted', 
        'user123',
        { estimatedDate: new Date() }
      );

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(mockTracking.addEvent.firstCall.args[0]).to.include({
        status: 'order_accepted',
        title: 'Order Accepted',
        isVisible: true
      });
      expect(TrackingService.notifyCustomer.calledOnce).to.be.true;
    });

    it('should update tracking for ready_to_dispatch status', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      await TrackingService.updateFromPurchaseStatus(
        'purchase123', 
        'ready_to_dispatch', 
        'user123'
      );

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(mockTracking.addEvent.firstCall.args[0]).to.include({
        status: 'ready_to_dispatch',
        title: 'Ready to Dispatch'
      });
    });

    it('should handle engineer assignment status', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      await TrackingService.updateFromPurchaseStatus(
        'purchase123', 
        'assigned', 
        'user123',
        { metadata: { engineerId: 'eng123', engineerName: 'John Doe' } }
      );

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(mockTracking.addEvent.firstCall.args[0]).to.include({
        status: 'engineer_assigned',
        title: 'Engineer Assigned'
      });
    });

    it('should skip unknown status mappings', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      const result = await TrackingService.updateFromPurchaseStatus(
        'purchase123', 
        'unknown_status', 
        'user123'
      );

      expect(mockTracking.addEvent.called).to.be.false;
      expect(result).to.equal(mockTracking);
    });

    it('should handle errors in tracking update', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').throws(new Error('Tracking error'));

      try {
        await TrackingService.updateFromPurchaseStatus('purchase123', 'order_accepted', 'user123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Tracking error');
      }
    });
  });

  describe('updateInstallationStatus', () => {
    let mockTracking;

    beforeEach(() => {
      mockTracking = {
        _id: 'track123',
        addEvent: sandbox.stub().resolves()
      };
    });

    it('should update tracking for installation scheduled', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      await TrackingService.updateInstallationStatus(
        'purchase123', 
        'scheduled', 
        'user123',
        { scheduledDate: '2024-01-15' }
      );

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(mockTracking.addEvent.firstCall.args[0]).to.include({
        status: 'installation_scheduled',
        title: 'Installation Scheduled'
      });
    });

    it('should update tracking for installation started', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      await TrackingService.updateInstallationStatus(
        'purchase123', 
        'started', 
        'user123'
      );

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(mockTracking.addEvent.firstCall.args[0]).to.include({
        status: 'installation_in_progress',
        title: 'Installation Started'
      });
    });

    it('should update tracking for installation completed', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      await TrackingService.updateInstallationStatus(
        'purchase123', 
        'completed', 
        'user123'
      );

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(mockTracking.addEvent.firstCall.args[0]).to.include({
        status: 'installation_completed',
        title: 'Installation Completed'
      });
    });

    it('should skip unknown installation events', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);

      const result = await TrackingService.updateInstallationStatus(
        'purchase123', 
        'unknown_event', 
        'user123'
      );

      expect(mockTracking.addEvent.called).to.be.false;
    });
  });

  describe('updateShippingStatus', () => {
    let mockTracking;

    beforeEach(() => {
      mockTracking = {
        _id: 'track123',
        shippingDetails: {},
        addEvent: sandbox.stub().resolves()
      };
    });

    it('should update shipping details and tracking', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      const shippingData = {
        carrier: 'FedEx',
        trackingId: 'FX123456789',
        shippedDate: '2024-01-15'
      };

      await TrackingService.updateShippingStatus('purchase123', shippingData, 'user123');

      expect(mockTracking.shippingDetails).to.deep.include({
        carrier: 'FedEx',
        trackingId: 'FX123456789'
      });
      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(mockTracking.addEvent.firstCall.args[0]).to.include({
        status: 'dispatched',
        title: 'Order Dispatched'
      });
    });

    it('should handle shipping without tracking ID', async () => {
      sandbox.stub(TrackingService, 'ensureTrackingExists').resolves(mockTracking);
      sandbox.stub(TrackingService, 'notifyCustomer').resolves();

      const shippingData = {
        carrier: 'Local Delivery'
      };

      await TrackingService.updateShippingStatus('purchase123', shippingData, 'user123');

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(mockTracking.addEvent.firstCall.args[0].description).to.not.include('Tracking ID');
    });
  });

  describe('notifyCustomer', () => {
    it('should send notification to customer', async () => {
      const mockPurchase = {
        _id: 'purchase123',
        customerId: { _id: 'customer123' }
      };

      sandbox.stub(CustomerPurchase, 'findById').returns({
        populate: sandbox.stub().resolves(mockPurchase)
      });
      sandbox.stub(NotificationService, 'createNotification').resolves();

      const eventData = {
        title: 'Order Dispatched',
        description: 'Your order is on the way'
      };

      await TrackingService.notifyCustomer('purchase123', eventData, 'TRK-123');

      expect(NotificationService.createNotification.calledOnce).to.be.true;
      expect(NotificationService.createNotification.firstCall.args[0]).to.include({
        recipient: 'customer123',
        title: 'Order Update: Order Dispatched',
        message: 'Your order is on the way',
        type: 'order_update'
      });
    });

    it('should handle missing customer gracefully', async () => {
      sandbox.stub(CustomerPurchase, 'findById').returns({
        populate: sandbox.stub().resolves(null)
      });
      sandbox.stub(NotificationService, 'createNotification');

      await TrackingService.notifyCustomer('purchase123', {}, 'TRK-123');

      expect(NotificationService.createNotification.called).to.be.false;
    });

    it('should handle notification errors gracefully', async () => {
      const mockPurchase = {
        _id: 'purchase123',
        customerId: { _id: 'customer123' }
      };

      sandbox.stub(CustomerPurchase, 'findById').returns({
        populate: sandbox.stub().resolves(mockPurchase)
      });
      sandbox.stub(NotificationService, 'createNotification').throws(new Error('Notification error'));

      // Should not throw error
      await TrackingService.notifyCustomer('purchase123', {}, 'TRK-123');
    });
  });

  describe('getTrackingData', () => {
    it('should return existing tracking data', async () => {
      const mockTracking = {
        _id: 'track123',
        purchaseId: 'purchase123'
      };

      sandbox.stub(OrderTracking, 'findOne').returns({
        populate: sandbox.stub().returnsThis(),
        populate: sandbox.stub().returnsThis(),
        populate: sandbox.stub().resolves(mockTracking)
      });

      const result = await TrackingService.getTrackingData('purchase123');

      expect(result).to.equal(mockTracking);
    });

    it('should auto-create tracking if not exists', async () => {
      const mockTrackingNumber = 'TRK-12345-0001';
      const mockTracking = {
        purchaseId: 'purchase123',
        trackingNumber: mockTrackingNumber,
        currentStatus: 'order_placed',
        save: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').returns({
        populate: sandbox.stub().returnsThis(),
        populate: sandbox.stub().returnsThis(),
        populate: sandbox.stub().resolves(null)
      });
      sandbox.stub(OrderTracking, 'generateTrackingNumber').resolves(mockTrackingNumber);
      sandbox.stub(OrderTracking.prototype, 'constructor').returns(mockTracking);

      const result = await TrackingService.getTrackingData('purchase123');

      expect(OrderTracking.generateTrackingNumber.called).to.be.true;
      expect(mockTracking.save.called).to.be.true;
    });
  });

  describe('bulkCreateMissingTracking', () => {
    it('should create tracking for missing purchases', async () => {
      const purchaseIds = ['purchase1', 'purchase2', 'purchase3'];
      const existingTracking = [{ purchaseId: 'purchase1' }];

      sandbox.stub(OrderTracking, 'find').resolves(existingTracking);
      sandbox.stub(TrackingService, 'ensureTrackingExists')
        .onFirstCall().resolves({ _id: 'track2' })
        .onSecondCall().resolves({ _id: 'track3' });

      const result = await TrackingService.bulkCreateMissingTracking(purchaseIds, 'user123');

      expect(result).to.have.length(2);
      expect(TrackingService.ensureTrackingExists.calledTwice).to.be.true;
      expect(TrackingService.ensureTrackingExists.firstCall.args[0]).to.equal('purchase2');
      expect(TrackingService.ensureTrackingExists.secondCall.args[0]).to.equal('purchase3');
    });

    it('should handle empty purchase list', async () => {
      sandbox.stub(OrderTracking, 'find').resolves([]);

      const result = await TrackingService.bulkCreateMissingTracking([], 'user123');

      expect(result).to.have.length(0);
    });

    it('should continue on individual failures', async () => {
      const purchaseIds = ['purchase1', 'purchase2'];

      sandbox.stub(OrderTracking, 'find').resolves([]);
      sandbox.stub(TrackingService, 'ensureTrackingExists')
        .onFirstCall().throws(new Error('Failed'))
        .onSecondCall().resolves({ _id: 'track2' });

      const result = await TrackingService.bulkCreateMissingTracking(purchaseIds, 'user123');

      expect(result).to.have.length(1);
      expect(result[0]._id).to.equal('track2');
    });
  });
});
