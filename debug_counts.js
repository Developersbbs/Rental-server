const mongoose = require('mongoose');
const Customer = require('./models/Customer');
const RentalCustomer = require('./models/RentalCustomer');

const checkCounts = async () => {
    try {
        console.log('Connecting to DB: MongoDB Atlas (Remote)');
        await mongoose.connect('mongodb+srv://shree-sai-eng:ShreeSai%40123@shreesaicluster.o70xmcy.mongodb.net/Rental_Management_System');
        console.log('Connected.');

        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n--- Collections ---');
        collections.forEach(c => console.log(`- ${c.name}`));

        // Check Customer model 
        const allCustomers = await Customer.find({});
        console.log('\n--- All Sales Customers (Customer model) ---');
        allCustomers.forEach(c => console.log(`- ${c.name} (Phone: ${c.phone})`));

        // Check RentalCustomer model
        const rentalCustomers = await RentalCustomer.find({});
        console.log('\n--- All Rental Customers (RentalCustomer model) ---');
        rentalCustomers.forEach(c => console.log(`- ${c.name} (Phone: ${c.phone})`));
        if (rentalCustomers.length > 0) console.log(`Total Rental Customers Found: ${rentalCustomers.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

checkCounts();
