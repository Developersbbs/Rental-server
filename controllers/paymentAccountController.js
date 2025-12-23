const PaymentAccount = require('../models/PaymentAccount');

// @desc    Get all payment accounts
// @route   GET /api/payment-accounts
// @access  Private
exports.getAllPaymentAccounts = async (req, res) => {
    try {
        const { status, accountType } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (accountType) filter.accountType = accountType;

        const accounts = await PaymentAccount.find(filter)
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: accounts.length,
            accounts
        });
    } catch (error) {
        console.error('Error fetching payment accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get payment account by ID
// @route   GET /api/payment-accounts/:id
// @access  Private
exports.getPaymentAccountById = async (req, res) => {
    try {
        const account = await PaymentAccount.findById(req.params.id)
            .populate('createdBy', 'username email');

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Payment account not found'
            });
        }

        res.status(200).json({
            success: true,
            account
        });
    } catch (error) {
        console.error('Error fetching payment account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create new payment account
// @route   POST /api/payment-accounts
// @access  Private/SuperAdmin
exports.createPaymentAccount = async (req, res) => {
    try {
        const {
            name,
            accountType,
            accountNumber,
            bankName,
            ifscCode,
            upiId,
            openingBalance,
            description
        } = req.body;

        // Check if account with same name exists
        const existingAccount = await PaymentAccount.findOne({ name });
        if (existingAccount) {
            return res.status(400).json({
                success: false,
                message: 'Payment account with this name already exists'
            });
        }

        const account = await PaymentAccount.create({
            name,
            accountType,
            accountNumber,
            bankName,
            ifscCode,
            upiId,
            openingBalance: openingBalance || 0,
            currentBalance: openingBalance || 0,
            description,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Payment account created successfully',
            account
        });
    } catch (error) {
        console.error('Error creating payment account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update payment account
// @route   PUT /api/payment-accounts/:id
// @access  Private/SuperAdmin
exports.updatePaymentAccount = async (req, res) => {
    try {
        const {
            name,
            accountNumber,
            bankName,
            ifscCode,
            upiId,
            description,
            status
        } = req.body;

        const account = await PaymentAccount.findById(req.params.id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Payment account not found'
            });
        }

        // Check if new name conflicts with existing account
        if (name && name !== account.name) {
            const existingAccount = await PaymentAccount.findOne({ name });
            if (existingAccount) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment account with this name already exists'
                });
            }
        }

        // Update fields
        if (name) account.name = name;
        if (accountNumber !== undefined) account.accountNumber = accountNumber;
        if (bankName !== undefined) account.bankName = bankName;
        if (ifscCode !== undefined) account.ifscCode = ifscCode;
        if (upiId !== undefined) account.upiId = upiId;
        if (description !== undefined) account.description = description;
        if (status) account.status = status;

        await account.save();

        res.status(200).json({
            success: true,
            message: 'Payment account updated successfully',
            account
        });
    } catch (error) {
        console.error('Error updating payment account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Delete (deactivate) payment account
// @route   DELETE /api/payment-accounts/:id
// @access  Private/SuperAdmin
exports.deletePaymentAccount = async (req, res) => {
    try {
        const account = await PaymentAccount.findById(req.params.id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Payment account not found'
            });
        }

        // Soft delete - set status to inactive
        account.status = 'inactive';
        await account.save();

        res.status(200).json({
            success: true,
            message: 'Payment account deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting payment account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get account transactions (from bills)
// @route   GET /api/payment-accounts/:id/transactions
// @access  Private
exports.getAccountTransactions = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, limit = 50 } = req.query;

        const Bill = require('../models/Bill');

        // Build query to find bills with payments to this account
        const query = {
            'paymentHistory.paymentAccount': id
        };

        if (startDate && endDate) {
            query['paymentHistory.paymentDate'] = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const bills = await Bill.find(query)
            .populate('customerId', 'name email phone')
            .populate('rentalDetails.rentalId', 'rentalId')
            .populate('paymentHistory.paymentAccount', 'name accountType')
            .sort({ 'paymentHistory.paymentDate': -1 })
            .limit(parseInt(limit));

        // Extract relevant payment transactions with full bill details
        const transactions = [];
        bills.forEach(bill => {
            bill.paymentHistory.forEach(payment => {
                if (payment.paymentAccount && payment.paymentAccount._id.toString() === id) {
                    transactions.push({
                        billId: bill._id,
                        billNumber: bill.billNumber,
                        amount: payment.amount,
                        paymentMethod: payment.paymentMethod,
                        paymentDate: payment.paymentDate,
                        notes: payment.notes,
                        // Include full bill details for frontend display
                        bill: {
                            _id: bill._id,
                            billNumber: bill.billNumber,
                            customerName: bill.customerName,
                            customerPhone: bill.customerPhone,
                            customerEmail: bill.customerEmail,
                            type: bill.type,
                            items: bill.items,
                            rentalDetails: bill.rentalDetails
                        }
                    });
                }
            });
        });

        // Sort transactions by date (most recent first)
        transactions.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

        res.status(200).json({
            success: true,
            count: transactions.length,
            transactions
        });
    } catch (error) {
        console.error('Error fetching account transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
