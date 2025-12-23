const express = require('express');
const router = express.Router();
const {
    getServiceAlerts,
    getDashboardAlerts,
    acknowledgeAlert,
    dismissAlert,
    getProductAlerts
} = require('../controllers/serviceAlertController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

// Protect all routes
router.use(protect);

// GET /api/service-alerts - Get all service alerts
router.get('/', allowRoles('superadmin', 'staff'), getServiceAlerts);

// GET /api/service-alerts/dashboard - Get dashboard alerts
router.get('/dashboard', getDashboardAlerts);

// GET /api/service-alerts/product/:productId - Get alerts for specific product
router.get('/product/:productId', getProductAlerts);

// PUT /api/service-alerts/:id/acknowledge - Acknowledge an alert
router.put('/:id/acknowledge', acknowledgeAlert);

// PUT /api/service-alerts/:id/dismiss - Dismiss an alert
router.put('/:id/dismiss', allowRoles('superadmin', 'staff'), dismissAlert);

module.exports = router;
