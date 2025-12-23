const mongoose = require('mongoose');

const paymentAccountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    accountType: {
        type: String,
        enum: ['bank', 'upi', 'cash', 'card_terminal'],
        required: true
    },
    // Bank account details
    accountNumber: {
        type: String,
        trim: true
    },
    bankName: {
        type: String,
        trim: true
    },
    ifscCode: {
        type: String,
        trim: true
    },
    // UPI details
    upiId: {
        type: String,
        trim: true
    },
    // Balance tracking
    openingBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    description: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for quick lookup
paymentAccountSchema.index({ status: 1, accountType: 1 });

module.exports = mongoose.model('PaymentAccount', paymentAccountSchema);
