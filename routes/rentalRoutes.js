const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const rentalNotificationController = require('../controllers/rentalNotificationController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

// All routes are protected
router.use(protect);

// Create new rental
router.post('/', allowRoles('superadmin', 'staff'), rentalController.createRental);

// Get all rentals
router.get('/', rentalController.getAllRentals);

// Notifications
router.get('/notifications', rentalNotificationController.getRentalNotifications);

// Reports & Stats
router.get('/stats', rentalController.getRentalStats);
router.get('/reports/revenue', rentalController.getRevenueReport);
router.get('/reports/popular', rentalController.getMostRentedProducts);

// Get rental by ID
router.get('/:id', rentalController.getRentalById);

// Return items and calculate bill
router.post('/:id/return', allowRoles('superadmin', 'staff'), rentalController.returnRental);

module.exports = router;
