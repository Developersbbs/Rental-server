const mongoose = require('mongoose');

const serviceAlertSchema = new mongoose.Schema({
    rentalProduct: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalProduct',
        required: true
    },
    alertDate: {
        type: Date,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'acknowledged', 'completed', 'dismissed'],
        default: 'pending'
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'], // info: upcoming, warning: due soon, critical: overdue
        default: 'info'
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acknowledgedAt: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
serviceAlertSchema.index({ rentalProduct: 1, status: 1 });
serviceAlertSchema.index({ alertDate: 1 });
serviceAlertSchema.index({ status: 1, severity: 1 });

module.exports = mongoose.model('ServiceAlert', serviceAlertSchema);
