const Customer = require('../models/Customer');
const errorHandler = require('../utils/errorHandler');

// @desc    Export customers
// @route   GET /api/customers/export
// @access  Private (Admin)
exports.exportCustomers = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      query.createdAt = { $gte: start, $lte: end };
    }

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 });

    const formattedData = customers.map(customer => ({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      businessName: customer.businessName,
      address_street: customer.address.street,
      address_city: customer.address.city,
      address_state: customer.address.state,
      address_zip: customer.address.zip,
      address_country: customer.address.country,
      createdAt: customer.createdAt.toISOString().split('T')[0],
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

