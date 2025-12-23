// routes/billRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  getBillsStats,
  generateInvoice,
  downloadInvoicePDF,
  getSellingReport,
  getProductSellingDetails,
  getMonthlySellingReport,
  recordPayment
} = require('../controllers/billController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

router.use(protect);

// GET /api/bills/stats - Get bill statistics
router.get('/stats', allowRoles('superadmin', 'staff'), getBillsStats);

// GET /api/bills/selling-report - Get selling report
router.get('/selling-report', allowRoles('superadmin', 'staff'), getSellingReport);

// GET /api/bills/monthly-selling-report - Get monthly selling report
router.get('/monthly-selling-report', allowRoles('superadmin', 'staff'), getMonthlySellingReport);

// GET /api/bills/product-selling/:productId - Get detailed selling data for a specific product
router.get('/product-selling/:productId', allowRoles('superadmin', 'staff'), getProductSellingDetails);

// GET /api/bills - Get all bills
router.get('/', allowRoles('superadmin', 'staff'), getAllBills);

// GET /api/bills/:id - Get bill by ID
router.get('/:id', allowRoles('superadmin', 'staff'), getBillById);

// GET /api/bills/:id/invoice - Generate invoice PDF
router.get('/:id/invoice', allowRoles('superadmin', 'staff'), generateInvoice);

// GET /api/bills/:id/pdf - Download invoice as PDF
router.get('/:id/pdf', allowRoles('superadmin', 'staff'), downloadInvoicePDF);

// POST /api/bills - Create new bill
router.post('/', allowRoles('superadmin', 'staff'), createBill);

// PUT /api/bills/:id - Update bill (superadmin only)
router.put('/:id', allowRoles('superadmin'), updateBill);

// DELETE /api/bills/:id - Delete bill
router.delete('/:id', allowRoles('superadmin',), deleteBill);

// POST /api/bills/:id/record-payment - Record payment for a bill
router.post('/:id/record-payment', allowRoles('superadmin', 'staff'), recordPayment);

module.exports = router;