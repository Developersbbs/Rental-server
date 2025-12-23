const mongoose = require('mongoose');

const rentalCustomerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    alternativePhone: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    customerType: {
        type: String,
        enum: ['individual', 'business'],
        default: 'individual'
    },
    companyName: {
        type: String,
        trim: true
    },
    gstNumber: {
        type: String,
        trim: true
    },
    idProof: {
        type: {
            type: String,
            enum: ['aadhar', 'pan', 'driving_license', 'passport', 'voter_id'],
            trim: true
        },
        number: {
            type: String,
            trim: true
        },
        document: {
            type: String  // URL to uploaded document
        }
    },
    deposit: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'blocked'],
        default: 'active'
    },
    notes: {
        type: String
    },
    referral: {
        isGuest: {
            type: Boolean,
            default: false
        },
        source: {
            type: String,
            trim: true,
            validate: {
                validator: function (v) {
                    if (!this.referral.isGuest) {
                        return v && v.length > 0;
                    }
                    return true;
                },
                message: 'Referral source is required unless the customer is a guest.'
            }
        },
        details: {
            type: String,
            trim: true
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('RentalCustomer', rentalCustomerSchema);
