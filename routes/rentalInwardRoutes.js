const express = require('express');
const router = express.Router();
const {
    createRentalInward,
    getAllRentalInwards,
    getRentalInwardById,
    updateRentalInward,
    deleteRentalInward
} = require('../controllers/rentalInwardController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

router.use(protect);

// GET /api/rental-inwards - Get all rental inwards
router.get('/', allowRoles('superadmin', 'staff'), getAllRentalInwards);

// GET /api/rental-inwards/:id - Get rental inward by ID
router.get('/:id', allowRoles('superadmin', 'staff'), getRentalInwardById);

// POST /api/rental-inwards - Create rental inward
router.post('/', allowRoles('superadmin', 'staff'), createRentalInward);

// PUT /api/rental-inwards/:id - Update rental inward
router.put('/:id', allowRoles('superadmin'), updateRentalInward);

// DELETE /api/rental-inwards/:id - Delete rental inward
router.delete('/:id', allowRoles('superadmin'), deleteRentalInward);

module.exports = router;
