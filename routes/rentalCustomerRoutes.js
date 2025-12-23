const express = require('express');
const router = express.Router();
const {
    createRentalCustomer,
    getAllRentalCustomers,
    getRentalCustomerById,
    updateRentalCustomer,
    deleteRentalCustomer,
    blockRentalCustomer,
    unblockRentalCustomer
} = require('../controllers/rentalCustomerController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

router.use(protect);

// GET /api/rental-customers - Get all rental customers
router.get('/', getAllRentalCustomers);

// GET /api/rental-customers/:id - Get rental customer by ID
router.get('/:id', getRentalCustomerById);

// POST /api/rental-customers - Create rental customer
router.post('/', allowRoles('superadmin', 'staff'), createRentalCustomer);

// PUT /api/rental-customers/:id - Update rental customer
router.put('/:id', allowRoles('superadmin'), updateRentalCustomer);

// PATCH /api/rental-customers/:id/block - Block rental customer (Super Admin only)
router.patch('/:id/block', allowRoles('superadmin'), blockRentalCustomer);

// PATCH /api/rental-customers/:id/unblock - Unblock rental customer (Super Admin only)
router.patch('/:id/unblock', allowRoles('superadmin'), unblockRentalCustomer);

// DELETE /api/rental-customers/:id - Delete rental customer
router.delete('/:id', allowRoles('superadmin'), deleteRentalCustomer);

module.exports = router;
