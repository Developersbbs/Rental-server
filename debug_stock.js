const mongoose = require('mongoose');
const Product = require('./models/Product');
const ProductItem = require('./models/ProductItem');
require('dotenv').config();

const checkStock = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const productName = 'Bike'; // As reported by user
        const product = await Product.findOne({ name: new RegExp(productName, 'i') });

        if (!product) {
            console.log(`Product '${productName}' not found.`);
            return;
        }

        console.log('--- Product Details ---');
        console.log(`ID: ${product._id}`);
        console.log(`Name: ${product.name}`);
        console.log(`Quantity (in Product model): ${product.quantity}`);
        console.log(`Is Rental: ${product.isRental}`);

        const items = await ProductItem.find({ productId: product._id });
        console.log('\n--- ProductItem Details ---');
        console.log(`Total Items found: ${items.length}`);

        if (items.length === 0) {
            console.log('WARNING: No individual ProductItems found for this product!');
            console.log('The system requires individual items to be created in "Manage Rental Items" to track availability.');
        } else {
            items.forEach(item => {
                console.log(`- ID: ${item._id}, UniqueID: ${item.uniqueIdentifier}, Status: ${item.status}`);
            });
        }

        const availableItems = await ProductItem.countDocuments({ productId: product._id, status: 'available' });
        console.log(`\nAvailable Items Count: ${availableItems}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

checkStock();
