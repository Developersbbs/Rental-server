const express = require('express');
const router = express.Router();
const {
    createRentalProduct,
    getAllRentalProducts,
    getRentalProductById,
    updateRentalProduct,
    deleteRentalProduct
} = require('../controllers/rentalProductController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

router.use(protect);

// GET /api/rental-products - Get all rental products
router.get('/', getAllRentalProducts);

// GET /api/rental-products/:id - Get rental product by ID
router.get('/:id', getRentalProductById);

// POST /api/rental-products - Create rental product
router.post('/', allowRoles('superadmin'), createRentalProduct);

// PUT /api/rental-products/:id - Update rental product
router.put('/:id', allowRoles('superadmin'), updateRentalProduct);

// DELETE /api/rental-products/:id - Delete rental product
router.delete('/:id', allowRoles('superadmin'), deleteRentalProduct);

module.exports = router;
