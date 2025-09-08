const { expect } = require('chai');
const sinon = require('sinon');
const httpMocks = require('node-mocks-http');
const OrderTracking = require('../models/OrderTracking');
const CustomerPurchase = require('../models/CustomerPurchase');
const User = require('../models/User');
const NotificationService = require('../utils/notificationService');
const {
  createTrackingRecord,
  getCustomerTracking,
  updateTrackingStatus,
  updateShippingDetails,
  updateInstallationDetails,
  getMyOrderTracking
} = require('../controllers/orderTrackingController');

describe('OrderTrackingController', () => {
  let sandbox, req, res;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    res.status = sandbox.stub().returns(res);
    res.json = sandbox.stub().returns(res);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createTrackingRecord', () => {
    beforeEach(() => {
      req.body = { purchaseId: 'purchase123' };
      req.user = { _id: 'user123' };
    });

    it('should create new tracking record successfully', async () => {
      const mockTracking = {
        _id: 'track123',
        addEvent: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(null);
      sandbox.stub(OrderTracking, 'generateTrackingNumber').resolves('TRK-123');
      sandbox.stub(OrderTracking.prototype, 'constructor').returns(mockTracking);

      await createTrackingRecord(req, res);

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith({
        success: true,
        data: mockTracking
      })).to.be.true;
    });

    it('should return error if tracking already exists', async () => {
      const existingTracking = { _id: 'existing123' };
      sandbox.stub(OrderTracking, 'findOne').resolves(existingTracking);

      await createTrackingRecord(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({
        success: false,
        error: 'Tracking record already exists for this purchase'
      })).to.be.true;
    });

    it('should handle database errors', async () => {
      sandbox.stub(OrderTracking, 'findOne').throws(new Error('Database error'));

      await createTrackingRecord(req, res);

      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('getCustomerTracking', () => {
    beforeEach(() => {
      req.params = { purchaseId: 'purchase123' };
      req.user = { _id: 'user123', role: 'customer' };
    });

    it('should return customer tracking data successfully', async () => {
      const mockPurchase = {
        _id: 'purchase123',
        customerId: 'customer123'
      };

      const mockCustomer = {
        _id: 'customer123',
        user: 'user123'
      };

      const mockTracking = {
        _id: 'track123',
        toObject: () => ({
          _id: 'track123',
          events: [{ status: 'order_placed', isVisible: true }]
        }),
        customerEvents: [{ status: 'order_placed', isVisible: true }],
        customerNotes: [{ note: 'Test note', isInternal: false }]
      };

      sandbox.stub(CustomerPurchase, 'findById').resolves(mockPurchase);
      sandbox.stub(require('../models/Customer'), 'findOne').resolves(mockCustomer);
      sandbox.stub(OrderTracking, 'findOne').returns({
        populate: sandbox.stub().returnsThis().resolves(mockTracking)
      });

      await getCustomerTracking(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        success: true,
        data: sinon.match.object
      })).to.be.true;
    });

    it('should return 404 if purchase not found', async () => {
      sandbox.stub(CustomerPurchase, 'findById').resolves(null);

      await getCustomerTracking(req, res);

      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 403 if customer does not own purchase', async () => {
      const mockPurchase = {
        _id: 'purchase123',
        customerId: 'different_customer'
      };

      const mockCustomer = {
        _id: 'customer123',
        user: 'user123'
      };

      sandbox.stub(CustomerPurchase, 'findById').resolves(mockPurchase);
      sandbox.stub(require('../models/Customer'), 'findOne').resolves(mockCustomer);

      await getCustomerTracking(req, res);

      expect(res.status.calledWith(403)).to.be.true;
    });

    it('should return 404 if tracking not found', async () => {
      const mockPurchase = {
        _id: 'purchase123',
        customerId: 'customer123'
      };

      const mockCustomer = {
        _id: 'customer123',
        user: 'user123'
      };

      sandbox.stub(CustomerPurchase, 'findById').resolves(mockPurchase);
      sandbox.stub(require('../models/Customer'), 'findOne').resolves(mockCustomer);
      sandbox.stub(OrderTracking, 'findOne').returns({
        populate: sandbox.stub().returnsThis().resolves(null)
      });

      await getCustomerTracking(req, res);

      expect(res.status.calledWith(404)).to.be.true;
    });
  });

  describe('updateTrackingStatus', () => {
    beforeEach(() => {
      req.params = { purchaseId: 'purchase123' };
      req.body = {
        status: 'dispatched',
        title: 'Order Dispatched',
        description: 'Your order has been dispatched',
        isVisible: true
      };
      req.user = { _id: 'user123' };
    });

    it('should update tracking status successfully', async () => {
      const mockTracking = {
        _id: 'track123',
        trackingNumber: 'TRK-123',
        addEvent: sandbox.stub().resolves()
      };

      const mockPurchase = {
        _id: 'purchase123',
        customerId: { _id: 'customer123' }
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);
      sandbox.stub(CustomerPurchase, 'findById').returns({
        populate: sandbox.stub().resolves(mockPurchase)
      });
      sandbox.stub(NotificationService, 'createNotification').resolves();

      await updateTrackingStatus(req, res);

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(NotificationService.createNotification.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should return 404 if tracking not found', async () => {
      sandbox.stub(OrderTracking, 'findOne').resolves(null);

      await updateTrackingStatus(req, res);

      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should skip notification if event is not visible', async () => {
      req.body.isVisible = false;

      const mockTracking = {
        _id: 'track123',
        addEvent: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);
      sandbox.stub(NotificationService, 'createNotification');

      await updateTrackingStatus(req, res);

      expect(NotificationService.createNotification.called).to.be.false;
    });

    it('should handle notification errors gracefully', async () => {
      const mockTracking = {
        _id: 'track123',
        trackingNumber: 'TRK-123',
        addEvent: sandbox.stub().resolves()
      };

      const mockPurchase = {
        _id: 'purchase123',
        customerId: { _id: 'customer123' }
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);
      sandbox.stub(CustomerPurchase, 'findById').returns({
        populate: sandbox.stub().resolves(mockPurchase)
      });
      sandbox.stub(NotificationService, 'createNotification').throws(new Error('Notification failed'));

      await updateTrackingStatus(req, res);

      expect(res.status.calledWith(200)).to.be.true; // Should still succeed
    });
  });

  describe('updateShippingDetails', () => {
    beforeEach(() => {
      req.params = { purchaseId: 'purchase123' };
      req.body = {
        carrier: 'FedEx',
        trackingId: 'FX123456789',
        shippedDate: '2024-01-15'
      };
      req.user = { _id: 'user123' };
    });

    it('should update shipping details successfully', async () => {
      const mockTracking = {
        _id: 'track123',
        shippingDetails: {},
        addEvent: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);

      await updateShippingDetails(req, res);

      expect(mockTracking.shippingDetails).to.deep.include({
        carrier: 'FedEx',
        trackingId: 'FX123456789'
      });
      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should return 404 if tracking not found', async () => {
      sandbox.stub(OrderTracking, 'findOne').resolves(null);

      await updateShippingDetails(req, res);

      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should use current date if shippedDate not provided', async () => {
      delete req.body.shippedDate;

      const mockTracking = {
        _id: 'track123',
        shippingDetails: {},
        addEvent: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);

      await updateShippingDetails(req, res);

      expect(mockTracking.shippingDetails.shippedDate).to.be.instanceOf(Date);
    });
  });

  describe('updateInstallationDetails', () => {
    beforeEach(() => {
      req.params = { purchaseId: 'purchase123' };
      req.body = {
        assignedEngineerId: 'engineer123',
        scheduledDate: '2024-01-20',
        notes: 'Installation notes'
      };
      req.user = { _id: 'user123' };
    });

    it('should update installation details successfully', async () => {
      const mockTracking = {
        _id: 'track123',
        installationDetails: {},
        addEvent: sandbox.stub().resolves()
      };

      const mockEngineer = {
        _id: 'engineer123',
        name: 'John Engineer'
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);
      sandbox.stub(User, 'findById').resolves(mockEngineer);

      await updateInstallationDetails(req, res);

      expect(mockTracking.installationDetails).to.deep.include({
        assignedEngineerId: 'engineer123',
        notes: 'Installation notes'
      });
      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should return 404 if tracking not found', async () => {
      sandbox.stub(OrderTracking, 'findOne').resolves(null);

      await updateInstallationDetails(req, res);

      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should handle missing engineer gracefully', async () => {
      const mockTracking = {
        _id: 'track123',
        installationDetails: {},
        addEvent: sandbox.stub().resolves()
      };

      sandbox.stub(OrderTracking, 'findOne').resolves(mockTracking);
      sandbox.stub(User, 'findById').resolves(null);

      await updateInstallationDetails(req, res);

      expect(mockTracking.addEvent.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });
  });

  describe('getMyOrderTracking', () => {
    beforeEach(() => {
      req.user = { _id: 'user123', role: 'customer' };
    });

    it('should return customer order tracking list', async () => {
      const mockCustomer = {
        _id: 'customer123'
      };

      const mockPurchases = [
        { _id: 'purchase1', purchaseID: 'PO-001', totalAmount: 50000 },
        { _id: 'purchase2', purchaseID: 'PO-002', totalAmount: 75000 }
      ];

      const mockTrackings = [
        { _id: 'track1', purchaseId: mockPurchases[0] },
        { _id: 'track2', purchaseId: mockPurchases[1] }
      ];

      sandbox.stub(require('../models/Customer'), 'findOne').resolves(mockCustomer);
      sandbox.stub(CustomerPurchase, 'find').resolves(mockPurchases);
      sandbox.stub(OrderTracking, 'find').resolves([]);
      sandbox.stub(OrderTracking, 'generateTrackingNumber').resolves('TRK-123');
      sandbox.stub(OrderTracking.prototype, 'addEvent').resolves();
      
      // Mock the populate chain
      const mockQuery = {
        populate: sandbox.stub().returnsThis(),
        select: sandbox.stub().returnsThis(),
        sort: sandbox.stub().resolves(mockTrackings)
      };
      sandbox.stub(OrderTracking, 'find').onSecondCall().returns(mockQuery);

      await getMyOrderTracking(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        success: true,
        data: mockTrackings
      })).to.be.true;
    });

    it('should return 404 if customer record not found', async () => {
      sandbox.stub(require('../models/Customer'), 'findOne').resolves(null);

      await getMyOrderTracking(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({
        success: false,
        error: 'Customer record not found'
      })).to.be.true;
    });

    it('should auto-create missing tracking records', async () => {
      const mockCustomer = {
        _id: 'customer123'
      };

      const mockPurchases = [
        { _id: 'purchase1', purchaseID: 'PO-001', totalAmount: 50000 },
        { _id: 'purchase2', purchaseID: 'PO-002', totalAmount: 75000 }
      ];

      const existingTrackings = [
        { purchaseId: 'purchase1' }
      ];

      const mockFinalTrackings = [
        { _id: 'track1', purchaseId: mockPurchases[0] },
        { _id: 'track2', purchaseId: mockPurchases[1] }
      ];

      sandbox.stub(require('../models/Customer'), 'findOne').resolves(mockCustomer);
      sandbox.stub(CustomerPurchase, 'find').resolves(mockPurchases);
      sandbox.stub(OrderTracking, 'find').onFirstCall().resolves(existingTrackings);
      sandbox.stub(OrderTracking, 'generateTrackingNumber').resolves('TRK-123');
      
      // Mock the populate chain for final query
      const mockQuery = {
        populate: sandbox.stub().returnsThis(),
        select: sandbox.stub().returnsThis(),
        sort: sandbox.stub().resolves(mockFinalTrackings)
      };
      sandbox.stub(OrderTracking, 'find').onSecondCall().returns(mockQuery);

      // Mock tracking creation
      const mockNewTracking = {
        purchaseId: 'purchase2',
        addEvent: sandbox.stub().resolves()
      };
      sandbox.stub(OrderTracking.prototype, 'constructor').returns(mockNewTracking);

      await getMyOrderTracking(req, res);

      expect(OrderTracking.generateTrackingNumber.called).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should handle database errors', async () => {
      sandbox.stub(require('../models/Customer'), 'findOne').throws(new Error('Database error'));

      await getMyOrderTracking(req, res);

      expect(res.status.calledWith(500)).to.be.true;
    });
  });
});
