const mongoose = require('mongoose');

const rentalInwardSchema = new mongoose.Schema({
    inwardNumber: {
        type: String,
        unique: true,
        required: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: false  // Made optional as supplier is being removed
    },
    receivedDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RentalProduct',  // Changed to RentalProduct
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        purchaseCost: {  // Renamed from unitCost
            type: Number,
            required: true,
            min: 0
        },
        batchNumber: {
            type: String,
            required: true
        },
        brand: {
            type: String,
            trim: true
        },
        modelNumber: {
            type: String,
            trim: true
        },
        purchaseDate: {  // Renamed from manufacturingDate
            type: Date
        },
        // expiryDate removed as it's not needed for rental products
        condition: {
            type: String,
            enum: ['new', 'good', 'fair'],
            default: 'new'
        },
        notes: {
            type: String
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
    // Track all inventory items created from this inward
    inwardHistory: [{
        inventoryItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RentalInventoryItem'
        },
        uniqueIdentifier: String,
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RentalProduct'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
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

// Auto-generate inward number before saving
rentalInwardSchema.pre('validate', async function (next) {
    if (!this.inwardNumber) {
        const count = await mongoose.model('RentalInward').countDocuments();
        this.inwardNumber = `RI-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

module.exports = mongoose.model('RentalInward', rentalInwardSchema);
