const mongoose = require('mongoose');
require('dotenv').config();

const rentalCategorySchema = new mongoose.Schema({}, { strict: false });
const RentalCategory = mongoose.model('RentalCategory', rentalCategorySchema);

async function checkRentalCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const categories = await RentalCategory.find({});
        console.log(`Found ${categories.length} rental categories.`);
        categories.forEach(c => {
            console.log(`- ${c.name} (${c._id})`);
        });

        if (categories.length === 0) {
            console.log('Creating a test category...');
            const newCategory = new RentalCategory({
                name: 'Test Category',
                description: 'Created for testing'
            });
            await newCategory.save();
            console.log('Test Category created.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRentalCategories();
