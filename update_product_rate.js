const mongoose = require('mongoose');
require('dotenv').config();

const rentalProductSchema = new mongoose.Schema({
    rentalRate: {
        hourly: Number,
        daily: Number,
        weekly: Number,
        monthly: Number
    }
}, { strict: false });

const RentalProduct = mongoose.model('RentalProduct', rentalProductSchema);

async function updateProductRate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const productId = '692052ec015df9a824a8ed1f';
        const update = {
            rentalRate: {
                hourly: 50,
                daily: 500,
                weekly: 3000,
                monthly: 10000
            }
        };

        const result = await RentalProduct.findByIdAndUpdate(productId, update, { new: true });

        if (result) {
            console.log('Product updated:', JSON.stringify(result, null, 2));
        } else {
            console.log('Product not found.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

updateProductRate();
