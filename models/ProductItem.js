const mongoose = require('mongoose');

const productItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    uniqueIdentifier: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['available', 'rented', 'maintenance', 'scrap', 'missing'],
        default: 'available'
    },
    condition: {
        type: String,
        enum: ['new', 'good', 'fair', 'poor', 'damaged'],
        default: 'good'
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    costPrice: {
        type: Number,
        min: 0
    },
    history: [{
        action: {
            type: String,
            enum: ['added', 'rented', 'returned', 'maintenance_start', 'maintenance_end', 'scrapped', 'marked_missing'],
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        details: String,
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }]
}, { timestamps: true });

// Index for quick lookup
productItemSchema.index({ productId: 1, status: 1 });
// uniqueIdentifier index is already created by unique: true in schema

module.exports = mongoose.model('ProductItem', productItemSchema);

