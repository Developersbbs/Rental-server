const mongoose = require('mongoose');
require('dotenv').config();

const rentalCustomerSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    address: String,
    idProof: {
        type: { type: String },
        number: String
    },
    deposit: Number,
    status: { type: String, default: 'active' }
}, { strict: false });

const RentalCustomer = mongoose.model('RentalCustomer', rentalCustomerSchema);

async function createRentalCustomer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'rental_test@example.com';

        let customer = await RentalCustomer.findOne({ email });

        if (customer) {
            console.log('Rental Customer already exists:', customer.name);
        } else {
            customer = new RentalCustomer({
                name: 'Rental Test Customer',
                email,
                phone: '9876543210',
                address: '123 Rental St',
                idProof: {
                    type: 'aadhaar',
                    number: '1234-5678-9012'
                },
                deposit: 5000,
                status: 'active'
            });
            await customer.save();
            console.log('Rental Customer created:', customer.name);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

createRentalCustomer();
