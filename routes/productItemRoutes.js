const express = require('express');
const router = express.Router();
const productItemController = require('../controllers/productItemController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

// All routes are protected
router.use(protect);

// Get items for a product
router.get('/product/:productId', productItemController.getItemsByProduct);

// Add a new item
router.post('/product/:productId', allowRoles('superadmin'), productItemController.addItem);

// Update item status/condition
router.put('/:id', allowRoles('superadmin'), productItemController.updateItem);

// Delete item
router.delete('/:id', allowRoles('superadmin'), productItemController.deleteItem);

module.exports = router;
