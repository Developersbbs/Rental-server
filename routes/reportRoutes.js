const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

// All routes are protected
router.use(protect);

// =============================================
// FINANCIAL REPORTS
// =============================================
router.get('/financial/revenue', reportController.getRevenueReport);
router.get('/financial/transactions', reportController.getTransactionReport);
router.get('/financial/outstanding-dues', reportController.getOutstandingDuesReport);
router.get('/financial/payment-methods', reportController.getPaymentMethodAnalysis);

// =============================================
// RENTAL REPORTS
// =============================================
router.get('/rentals/active', reportController.getActiveRentalsReport);
router.get('/rentals/history', reportController.getRentalHistoryReport);
router.get('/rentals/overdue', reportController.getOverdueRentalsReport);
router.get('/rentals/calendar', reportController.getBookingCalendarReport);

// =============================================
// INVENTORY REPORTS
// =============================================
router.get('/inventory/status', reportController.getInventoryStatusReport);
router.get('/inventory/utilization', reportController.getItemUtilizationReport);
router.get('/inventory/maintenance', reportController.getMaintenanceReport);
router.get('/inventory/damage-loss', reportController.getDamageLossReport);

// =============================================
// CUSTOMER REPORTS
// =============================================
router.get('/customers/list', reportController.getCustomerListReport);
router.get('/customers/activity', reportController.getCustomerActivityReport);
router.get('/customers/top', reportController.getTopCustomersReport);

// =============================================
// ANALYTICS REPORTS
// =============================================
router.get('/analytics/dashboard', reportController.getPerformanceDashboard);
router.get('/analytics/trends', reportController.getSeasonalTrendsReport);
router.get('/analytics/categories', reportController.getCategoryPerformanceReport);
router.get('/analytics/accessories', reportController.getAccessoryPerformanceReport);

module.exports = router;
