const mongoose = require('mongoose');

const serviceRecordSchema = new mongoose.Schema({
    inventoryItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalInventoryItem',
        required: true,
        index: true
    },
    serviceType: {
        type: String,
        enum: ['preventive', 'corrective', 'inspection', 'repair', 'cleaning'],
        required: true
    },
    serviceDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    issuesFound: [{
        type: String,
        trim: true
    }],
    partsReplaced: [{
        partName: {
            type: String,
            required: true,
            trim: true
        },
        partCost: {
            type: Number,
            required: true,
            min: 0
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        }
    }],
    laborCost: {
        type: Number,
        default: 0,
        min: 0
    },
    totalCost: {
        type: Number,
        default: 0,
        min: 0
    },
    technician: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    technicianName: {
        type: String,
        trim: true
    },
    nextServiceDue: {
        type: Date
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    serviceStatus: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'completed'
    },
    beforeCondition: {
        type: String,
        enum: ['new', 'good', 'fair', 'poor', 'damaged'],
        required: true
    },
    afterCondition: {
        type: String,
        enum: ['new', 'good', 'fair', 'poor', 'damaged'],
        required: true
    },
    downtimeHours: {
        type: Number,
        default: 0,
        min: 0
    },
    attachments: [{
        type: String  // URLs to uploaded photos/documents
    }],
    notes: {
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

// Indexes for better query performance
serviceRecordSchema.index({ serviceDate: -1 });
serviceRecordSchema.index({ serviceType: 1, serviceDate: -1 });
serviceRecordSchema.index({ serviceStatus: 1 });
serviceRecordSchema.index({ nextServiceDue: 1 });

// Pre-save middleware to calculate total cost
serviceRecordSchema.pre('save', function (next) {
    // Calculate parts cost
    const partsCost = this.partsReplaced.reduce((total, part) => {
        return total + (part.partCost * part.quantity);
    }, 0);

    // Total cost = parts + labor
    this.totalCost = partsCost + (this.laborCost || 0);

    next();
});

// Virtual for parts total
serviceRecordSchema.virtual('partsTotalCost').get(function () {
    return this.partsReplaced.reduce((total, part) => {
        return total + (part.partCost * part.quantity);
    }, 0);
});

// Ensure virtuals are included in JSON
serviceRecordSchema.set('toJSON', { virtuals: true });
serviceRecordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ServiceRecord', serviceRecordSchema);
