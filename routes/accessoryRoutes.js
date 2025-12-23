const express = require('express');
const router = express.Router();
const accessoryController = require('../controllers/accessoryController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

// All routes are protected
router.use(protect);

// Get accessory stats
router.get('/stats', allowRoles('superadmin', 'staff'), accessoryController.getAccessoryStats);

// Get accessories for a rental product
router.get('/product/:rentalProductId', accessoryController.getAccessoriesByProduct);

// Add a new accessory
router.post('/product/:rentalProductId', allowRoles('superadmin'), accessoryController.addAccessory);

// Update accessory
router.put('/:id', allowRoles('superadmin'), accessoryController.updateAccessory);

// Delete accessory
router.delete('/:id', allowRoles('superadmin'), accessoryController.deleteAccessory);

module.exports = router;
