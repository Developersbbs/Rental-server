const express = require('express');
const router = express.Router();
const {
  createInward,
  getInwards,
  getInward,
  updateInward,
  deleteInward,
  approveInward,
  rejectInward,
  completeInward,
  getInwardStats,
  addInwardToInventory
} = require('../controllers/inwardController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

router.route('/')
  .post(protect, createInward)
  .get(protect, getInwards);

router.route('/:id')
  .get(protect, getInward)
  .put(protect, updateInward)
  .delete(protect, allowRoles('superadmin'), deleteInward);

router.route('/:id/approve')
  .put(protect, allowRoles('superadmin'), approveInward);

router.route('/:id/reject')
  .put(protect, allowRoles('superadmin'), rejectInward);

router.route('/:id/complete')
  .put(protect, allowRoles('superadmin'), completeInward);

router.route('/:id/add-to-inventory')
  .put(protect, allowRoles('superadmin'), addInwardToInventory);

router.route('/stats/overview')
  .get(protect, getInwardStats);

module.exports = router;
