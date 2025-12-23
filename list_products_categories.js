const mongoose = require('mongoose');
require('dotenv').config();
const RentalProduct = require('./models/RentalProduct');
const RentalCategory = require('./models/RentalCategory');

async function listAllProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await RentalProduct.find({}).populate('category', 'name');
        console.log(`Total Rental Products: ${products.length}`);

        products.forEach(p => {
            console.log(`Product: ${p.name}`);
            console.log(`  ID: ${p._id}`);
            console.log(`  Category Field:`, p.category);
            if (p.category) {
                console.log(`  Category ID: ${p.category._id}`);
                console.log(`  Category Name: ${p.category.name}`);
            } else {
                console.log(`  Category: NULL/UNDEFINED`);
            }
            console.log('---');
        });

        const categories = await RentalCategory.find({});
        console.log(`\nTotal Categories: ${categories.length}`);
        categories.forEach(c => {
            console.log(`Category: ${c.name} (${c._id})`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listAllProducts();
