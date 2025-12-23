const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
    rentalId: {
        type: String,
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalCustomer',
        required: true
    },
    items: [{
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RentalInventoryItem',
            required: true
        },
        rentAtTime: {
            type: Number, // Price at the time of renting (hourly/daily rate)
            required: true
        },
        rentType: {
            type: String,
            enum: ['hourly', 'daily', 'monthly'],
            required: true
        },
        returnCondition: {
            type: String,
            enum: ['good', 'damaged', 'missing'],
            default: 'good'
        },
        damageCost: {
            type: Number,
            default: 0
        },
        accessories: [{
            accessoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Accessory' },
            name: String,
            serialNumber: String,
            checkedOutCondition: String,
            status: { type: String, enum: ['with_item', 'missing', 'returned', 'damaged'], default: 'with_item' }
        }]
    }],
    soldItems: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    outTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    expectedReturnTime: {
        type: Date,
        required: false
    },
    returnTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'overdue', 'cancelled'],
        default: 'active'
    },
    advancePayment: {
        type: Number,
        default: 0,
        min: 0
    },
    accessoriesPayment: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    finalBill: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill'
    },
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Generate Rental ID
rentalSchema.pre('save', async function (next) {
    if (this.isNew && !this.rentalId) {
        try {
            const lastRental = await this.constructor.findOne({}, { rentalId: 1 }).sort({ createdAt: -1 });
            let nextNumber = 1;
            if (lastRental && lastRental.rentalId) {
                const lastNumberString = lastRental.rentalId.split('-')[1];
                const lastNumber = parseInt(lastNumberString, 10);
                if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
            }
            this.rentalId = `RENT-${String(nextNumber).padStart(6, '0')}`;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model('Rental', rentalSchema);
