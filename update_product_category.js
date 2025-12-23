const mongoose = require('mongoose');
require('dotenv').config();
const RentalProduct = require('./models/RentalProduct');

async function updateProductCategory() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const productId = '692052ec015df9a824a8ed1f';
        const newCategoryId = '69204ba685910002b3eb80bb'; // Generators

        const result = await RentalProduct.findByIdAndUpdate(
            productId,
            { category: newCategoryId },
            { new: true }
        ).populate('category');

        console.log('Updated Product:', result.name);
        console.log('New Category:', result.category.name);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

updateProductCategory();
