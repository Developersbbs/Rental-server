// routes/productRoutes.js
const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductQuantity,
  deleteProduct,
  getCategories,
  getLowStockProducts,
  bulkUpdateProducts,
  getProductReport,
  getProductStats
} = require('../controllers/productController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

const router = express.Router();

// Public routes (Internal note: these are protected by 'protect' middleware)
router.get('/categories', protect, getCategories); // Must be before /:id route
router.get('/stats', protect, getProductStats); // Must be before /:id route
router.get('/report', protect, allowRoles("superadmin", "staff"), getProductReport);
router.get('/', protect, getProducts);
router.get('/:id', protect, getProductById);

// Protected routes (Super Admin only for modification)
router.post('/', protect, allowRoles("superadmin"), createProduct);
router.put('/:id', protect, allowRoles("superadmin"), updateProduct);
router.patch('/:id/quantity', protect, allowRoles("superadmin", "staff"), updateProductQuantity); // Staff might need to update quantity on sales? "BillCounter" usually updates quantity?
// Wait, if staff makes a bill, quantity updates automatically or manually?
// Usually manual quantity update is an inventory correction -> Superadmin?
// If it's sales, it goes through 'billRoutes'. This route seems to be manual adjustment.
// I will restrict manual adjustment to superadmin.
router.delete('/:id', protect, allowRoles("superadmin"), deleteProduct);

// Additional protected routes
router.get('/stock/low-stock', protect, allowRoles("superadmin", "staff"), getLowStockProducts);
router.patch('/bulk-update', protect, allowRoles("superadmin"), bulkUpdateProducts);

module.exports = router;