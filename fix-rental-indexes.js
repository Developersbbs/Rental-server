// Script to fix the invoiceNumber duplicate key error in rentals collection
const mongoose = require('mongoose');
require('dotenv').config();

const fixRentalIndexes = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get the rentals collection
        const db = mongoose.connection.db;
        const rentalsCollection = db.collection('rentals');

        // List all indexes
        console.log('\n📋 Current indexes on rentals collection:');
        const indexes = await rentalsCollection.indexes();
        indexes.forEach(index => {
            console.log(`  - ${JSON.stringify(index.key)}: ${index.name}`);
        });

        // Drop the invoiceNumber index if it exists
        try {
            await rentalsCollection.dropIndex('invoiceNumber_1');
            console.log('\n✅ Successfully dropped invoiceNumber_1 index');
        } catch (err) {
            if (err.code === 27) {
                console.log('\n⚠️  invoiceNumber_1 index does not exist (already removed)');
            } else {
                throw err;
            }
        }

        // List indexes after cleanup
        console.log('\n📋 Indexes after cleanup:');
        const updatedIndexes = await rentalsCollection.indexes();
        updatedIndexes.forEach(index => {
            console.log(`  - ${JSON.stringify(index.key)}: ${index.name}`);
        });

        console.log('\n✅ Index cleanup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error fixing rental indexes:', error);
        process.exit(1);
    }
};

fixRentalIndexes();
