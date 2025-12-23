const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middlewares/authMiddlewares');
const {
    createServiceRecord,
    getServiceRecords,
    getServiceRecordById,
    updateServiceRecord,
    deleteServiceRecord,
    getItemServiceHistory,
    getServiceAnalytics,
    getUpcomingMaintenance,
    getCostAnalysis
} = require('../controllers/serviceRecordController');

// All routes require authentication
router.use(protect);

// Service Record CRUD
router.post('/', allowRoles('superadmin', 'staff'), createServiceRecord);
router.get('/', allowRoles('superadmin', 'staff'), getServiceRecords);
router.get('/:id', allowRoles('superadmin', 'staff'), getServiceRecordById);
router.put('/:id', allowRoles('superadmin', 'staff'), updateServiceRecord);
router.delete('/:id', allowRoles('superadmin'), deleteServiceRecord);

// Service History & Analytics
router.get('/item/:itemId/history', allowRoles('superadmin', 'staff'), getItemServiceHistory);
router.get('/analytics/summary', allowRoles('superadmin', 'staff'), getServiceAnalytics);
router.get('/analytics/upcoming', allowRoles('superadmin', 'staff'), getUpcomingMaintenance);
router.get('/analytics/costs', allowRoles('superadmin', 'staff'), getCostAnalysis);

module.exports = router;
