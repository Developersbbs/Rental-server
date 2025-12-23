const express = require('express');
const router = express.Router();
const {
    createRentalSupplier,
    getAllRentalSuppliers,
    getRentalSupplierById,
    updateRentalSupplier,
    deleteRentalSupplier
} = require('../controllers/rentalSupplierController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

router.use(protect);

// GET /api/rental-suppliers - Get all rental suppliers
router.get('/', getAllRentalSuppliers);

// GET /api/rental-suppliers/:id - Get rental supplier by ID
router.get('/:id', getRentalSupplierById);

// POST /api/rental-suppliers - Create rental supplier
router.post('/', allowRoles('superadmin', 'stockmanager'), createRentalSupplier);

// PUT /api/rental-suppliers/:id - Update rental supplier
router.put('/:id', allowRoles('superadmin', 'stockmanager'), updateRentalSupplier);

// DELETE /api/rental-suppliers/:id - Delete rental supplier
router.delete('/:id', allowRoles('superadmin'), deleteRentalSupplier);

module.exports = router;
