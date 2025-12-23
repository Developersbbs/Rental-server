const mongoose = require('mongoose');

const rentalProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalCategory'
    },
    rentalRate: {
        hourly: {
            type: Number,
            min: 0
        },
        daily: {
            type: Number,
            min: 0
        },
        weekly: {
            type: Number,
            min: 0
        },
        monthly: {
            type: Number,
            min: 0
        }
    },
    images: [{
        type: String
    }],
    specifications: {
        type: Map,
        of: String
    },
    // Total quantity is calculated from RentalInventoryItem count
    totalQuantity: {
        type: Number,
        default: 0
    },
    availableQuantity: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    // Service tracking fields
    serviceInterval: {
        type: Number, // Days between services (e.g., 30, 90, 180)
        min: 0,
        default: null // null means no regular service required
    },
    lastServiceDate: {
        type: Date,
        default: null
    },
    nextServiceDue: {
        type: Date,
        default: null
    },
    serviceAlertDays: {
        type: Number, // Days before service to show alert
        min: 1,
        default: 7
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('RentalProduct', rentalProductSchema);
