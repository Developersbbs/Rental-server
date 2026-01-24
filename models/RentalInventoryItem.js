const mongoose = require('mongoose');

const rentalInventoryItemSchema = new mongoose.Schema({
    rentalProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalProduct',
        required: true
    },
    uniqueIdentifier: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    isArchived: {
        type: Boolean,
        default: false,
        index: true
    },
    status: {
        type: String,
        enum: ['available', 'rented', 'maintenance', 'scrap', 'missing', 'damaged'],
        default: 'available'
    },
    damageReason: {
        type: String,
        trim: true
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
    purchaseCost: {
        type: Number,
        min: 0
    },
    inwardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalInward'
    },
    batchNumber: {
        type: String,
        trim: true
    },
    notes: {
        type: String
    },
    serialNumber: {
        type: String,
        trim: true,
        sparse: true // Allows null/undefined values while maintaining uniqueness for non-null values
    },
    // Rental Rates
    hourlyRent: {
        type: Number,
        min: 0,
        default: 0
    },
    dailyRent: {
        type: Number,
        min: 0,
        default: 0
    },
    monthlyRent: {
        type: Number,
        min: 0,
        default: 0
    },
    // Service & Maintenance Tracking
    lastServiceDate: {
        type: Date
    },
    nextServiceDue: {
        type: Date
    },
    totalServiceCost: {
        type: Number,
        default: 0,
        min: 0
    },
    serviceCount: {
        type: Number,
        default: 0,
        min: 0
    },
    healthScore: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    warrantyExpiry: {
        type: Date
    },
    accessories: [{
        accessoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Accessory',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        serialNumber: {
            type: String,
            trim: true
        },
        condition: {
            type: String,
            enum: ['new', 'good', 'fair', 'poor', 'damaged'],
            default: 'good'
        },
        isIncluded: {
            type: Boolean,
            default: true
        },
        status: {
            type: String,
            enum: ['with_item', 'missing', 'damaged'],
            default: 'with_item'
        }
    }],
    history: [{
        action: {
            type: String,
            enum: ['added', 'received', 'rented', 'returned', 'maintenance_start', 'maintenance_end', 'scrapped', 'marked_missing', 'marked_damaged'],
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

// Indexes for quick lookup
rentalInventoryItemSchema.index({ rentalProductId: 1, status: 1 });
// uniqueIdentifier index is already created by unique: true in schema
rentalInventoryItemSchema.index({ inwardId: 1 });


// Auto-generate unique identifier before saving if not provided
rentalInventoryItemSchema.pre('save', async function (next) {
    if (!this.uniqueIdentifier) {
        const RentalProduct = mongoose.model('RentalProduct');
        const product = await RentalProduct.findById(this.rentalProductId);
        const count = await mongoose.model('RentalInventoryItem').countDocuments({ rentalProductId: this.rentalProductId });

        const productName = product ? product.name.replace(/\s+/g, '-').substring(0, 20) : 'RENTAL';
        this.uniqueIdentifier = `RI-${productName}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('RentalInventoryItem', rentalInventoryItemSchema);
