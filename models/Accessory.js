const mongoose = require('mongoose');

const accessorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    rentalProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalProduct',
        required: true
    },
    isRequired: {
        type: Boolean,
        default: false
    },
    replacementCost: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Index for faster queries
accessorySchema.index({ rentalProductId: 1 });

module.exports = mongoose.model('Accessory', accessorySchema);
