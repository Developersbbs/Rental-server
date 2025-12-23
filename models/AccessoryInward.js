const mongoose = require('mongoose');

const accessoryInwardSchema = new mongoose.Schema({
    inwardNumber: {
        type: String,
        unique: true,
        required: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: false
    },
    receivedDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    items: [{
        productName: {
            type: String,
            required: true,
            trim: true
        },
        productSku: {
            type: String,
            trim: true
        },
        product: { // Link to the Product if it exists/created
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        purchaseCost: {
            type: Number,
            required: true,
            min: 0
        },
        sellingPrice: {
            type: Number,
            required: true,
            min: 0
        },
        minStockLevel: {
            type: Number,
            default: 5
        },
        location: {
            type: String,
            trim: true
        }
    }],
    supplierInvoiceNumber: {
        type: String,
        trim: true
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    notes: {
        type: String
    },
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed'
    }
}, {
    timestamps: true
});

// Auto-generate inward number
accessoryInwardSchema.pre('validate', async function (next) {
    if (!this.inwardNumber) {
        const count = await mongoose.model('AccessoryInward').countDocuments();
        this.inwardNumber = `AI-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

module.exports = mongoose.model('AccessoryInward', accessoryInwardSchema);
