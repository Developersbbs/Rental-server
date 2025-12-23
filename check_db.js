const mongoose = require('mongoose');
const RentalCategory = require('./models/RentalCategory');
const RentalProduct = require('./models/RentalProduct');
require('dotenv').config();

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const categories = await RentalCategory.find({});
        console.log('Categories:', JSON.stringify(categories, null, 2));

        const products = await RentalProduct.find({});
        console.log('Products:', JSON.stringify(products, null, 2));

        const RentalInventoryItem = require('./models/RentalInventoryItem');
        const items = await RentalInventoryItem.find({});
        console.log('Rental Items:', JSON.stringify(items, null, 2));

        const RentalInward = require('./models/RentalInward');
        const inwards = await RentalInward.find({});
        console.log('Inwards:', JSON.stringify(inwards, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDB();
