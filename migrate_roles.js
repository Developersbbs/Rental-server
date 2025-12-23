const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function migrateRoles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update Stock Managers to Staff
        const stockManagerResult = await User.updateMany(
            { role: 'stockmanager' },
            { $set: { role: 'staff' } }
        );
        console.log(`Updated ${stockManagerResult.modifiedCount} "stockmanager" users to "staff".`);

        // Update Bill Counters to Staff
        const billCounterResult = await User.updateMany(
            { role: 'billcounter' },
            { $set: { role: 'staff' } }
        );
        console.log(`Updated ${billCounterResult.modifiedCount} "billcounter" users to "staff".`);

        // Verify remaining
        const users = await User.find({});
        console.log('\n--- Current User Roles ---');
        users.forEach(u => {
            console.log(`- ${u.email}: ${u.role}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

migrateRoles();
