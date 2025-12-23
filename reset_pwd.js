const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const resetPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to DB');

        const user = await User.findOne({ email: 'admin@test.com' });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        user.password = 'admin123';
        user.role = 'superadmin';
        await user.save();
        console.log('✅ Password and role reset for admin@test.com');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetPassword();
