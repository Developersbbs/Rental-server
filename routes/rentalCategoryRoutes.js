const express = require('express');
const router = express.Router();
const {
    createRentalCategory,
    getAllRentalCategories,
    getRentalCategoryById,
    updateRentalCategory,
    deleteRentalCategory
} = require('../controllers/rentalCategoryController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

router.use(protect);

// GET /api/rental-categories - Get all rental categories
router.get('/', getAllRentalCategories);

// GET /api/rental-categories/:id - Get rental category by ID
router.get('/:id', getRentalCategoryById);

// POST /api/rental-categories - Create rental category
router.post('/', allowRoles('superadmin', 'stockmanager'), createRentalCategory);

// PUT /api/rental-categories/:id - Update rental category
router.put('/:id', allowRoles('superadmin', 'stockmanager'), updateRentalCategory);

// DELETE /api/rental-categories/:id - Delete rental category
router.delete('/:id', allowRoles('superadmin'), deleteRentalCategory);

module.exports = router;
