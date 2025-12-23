const mongoose = require('mongoose');
require('dotenv').config();

const rentalCustomerSchema = new mongoose.Schema({}, { strict: false });
const RentalCustomer = mongoose.model('RentalCustomer', rentalCustomerSchema);

async function checkRentalCustomers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const customers = await RentalCustomer.find({});
        console.log(`Found ${customers.length} rental customers.`);
        customers.forEach(c => {
            console.log(`- ${c.name} (${c._id})`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRentalCustomers();
