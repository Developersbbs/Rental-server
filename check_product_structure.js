const mongoose = require('mongoose');
require('dotenv').config();
const RentalProduct = require('./models/RentalProduct');
const RentalCategory = require('./models/RentalCategory');

async function checkRentalProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await RentalProduct.find({})
            .populate('category', 'name');

        console.log(`Found ${products.length} rental products.`);
        if (products.length > 0) {
            console.log('Sample product category structure:');
            console.log(JSON.stringify(products[0].category, null, 2));
            console.log('Category ID type:', typeof products[0].category?._id);
            console.log('Category ID toString:', products[0].category?._id?.toString());
        } else {
            console.log('No rental products found.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRentalProducts();
