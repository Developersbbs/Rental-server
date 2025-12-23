const express = require('express');
const router = express.Router();
const {
    getAllPaymentAccounts,
    getPaymentAccountById,
    createPaymentAccount,
    updatePaymentAccount,
    deletePaymentAccount,
    getAccountTransactions
} = require('../controllers/paymentAccountController');
const { protect, allowRoles } = require('../middlewares/authMiddlewares');

// Protect all routes
router.use(protect);

// GET /api/payment-accounts - Get all payment accounts
router.get('/', getAllPaymentAccounts);

// GET /api/payment-accounts/:id - Get payment account by ID
router.get('/:id', getPaymentAccountById);

// GET /api/payment-accounts/:id/transactions - Get account transactions
router.get('/:id/transactions', getAccountTransactions);

// POST /api/payment-accounts - Create new payment account (SuperAdmin only)
router.post('/', allowRoles('superadmin'), createPaymentAccount);

// PUT /api/payment-accounts/:id - Update payment account (SuperAdmin only)
router.put('/:id', allowRoles('superadmin'), updatePaymentAccount);

// DELETE /api/payment-accounts/:id - Deactivate payment account (SuperAdmin only)
router.delete('/:id', allowRoles('superadmin'), deletePaymentAccount);

module.exports = router;
