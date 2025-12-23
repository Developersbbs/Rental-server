// routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomersStats,
  blockCustomer,
  unblockCustomer
} = require('../controllers/customerController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

router.use(protect);

// GET /api/customers/stats - Get customer statistics
router.get('/stats', allowRoles('superadmin', 'staff'), getCustomersStats);

// GET /api/customers - Get all customers
router.get('/', allowRoles('superadmin', 'staff'), getAllCustomers);

// GET /api/customers/:id - Get customer by ID
router.get('/:id', allowRoles('superadmin', 'staff'), getCustomerById);

// POST /api/customers - Create new customer
router.post('/', allowRoles('superadmin', 'staff'), createCustomer);

// PUT /api/customers/:id - Update customer
router.put('/:id', allowRoles('superadmin'), updateCustomer);

// PATCH /api/customers/:id/block - Block customer (Super Admin only)
router.patch('/:id/block', allowRoles('superadmin'), blockCustomer);

// PATCH /api/customers/:id/unblock - Unblock customer (Super Admin only)
router.patch('/:id/unblock', allowRoles('superadmin'), unblockCustomer);

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', allowRoles('superadmin'), deleteCustomer);

module.exports = router;