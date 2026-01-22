const express = require('express');
const router = express.Router();
const rentalInventoryItemController = require('../controllers/rentalInventoryItemController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

// All routes are protected
router.use(protect);

// Get all items
router.get('/', rentalInventoryItemController.getAllItems);

// Get archived items
router.get('/archived/:rentalProductId', rentalInventoryItemController.getArchivedItems);

// Get items for a rental product
router.get('/rental-product/:rentalProductId', rentalInventoryItemController.getItemsByRentalProduct);

// Add a new item
router.post('/rental-product/:rentalProductId', allowRoles('superadmin'), rentalInventoryItemController.addItem);

// Get item history
router.get('/:id/history', rentalInventoryItemController.getItemHistory);

// Update item status/condition
router.put('/:id', allowRoles('superadmin'), rentalInventoryItemController.updateItem);



// Toggle archive status
router.patch('/:id/archive', allowRoles('superadmin'), rentalInventoryItemController.toggleArchiveStatus);

// Delete item
router.delete('/:id', allowRoles('superadmin'), rentalInventoryItemController.deleteItem);

module.exports = router;
