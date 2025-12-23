// controllers/customerController.js
const Customer = require('../models/Customer');

exports.getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      filter.status = status;
    }

    const customers = await Customer.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Customer.countDocuments(filter);

    res.status(200).json({
      customers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    console.log(`[getCustomerById] Fetching customer with ID: ${req.params.id}`);

    // --- Populate the virtual 'bills' field ---
    // You can specify which fields to populate from the Bill model
    const customer = await Customer.findById(req.params.id)
      .populate('bills', 'billNumber totalAmount billDate paymentStatus'); // Populate only necessary fields

    if (!customer) {
      console.log(`[getCustomerById] Customer not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Customer not found' });
    }

    console.log(`[getCustomerById] Successfully fetched customer: ${customer.name}`);
    res.status(200).json(customer);
  } catch (err) {
    // Enhanced error logging
    console.error("=== ERROR in getCustomerById ===");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack);
    console.error("Request ID:", req.params.id);
    console.error("================================");

    res.status(500).json({
      message: 'Server error',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};


exports.createCustomer = async (req, res) => {
  try {
    const customerData = req.body;

    const existingCustomer = await Customer.findOne({ email: customerData.email });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer with this email already exists' });
    }

    const customer = new Customer(customerData);
    await customer.save();

    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getCustomersStats = async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      active: 0,
      inactive: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Block customer (Super Admin only)
exports.blockCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      message: 'Customer blocked successfully',
      customer
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Unblock customer (Super Admin only)
exports.unblockCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      message: 'Customer unblocked successfully',
      customer
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};