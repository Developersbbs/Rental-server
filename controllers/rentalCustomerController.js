const RentalCustomer = require('../models/RentalCustomer');

// Create rental customer
exports.createRentalCustomer = async (req, res) => {
    try {
        const { name, email, phone, alternativePhone, address, idProof, deposit, notes, referral, customerType, companyName, gstNumber } = req.body;


        const rentalCustomer = new RentalCustomer({
            name,
            email,
            phone,
            alternativePhone,
            address,
            idProof,
            deposit: deposit || 0,
            notes,
            referral,
            customerType: customerType || 'individual',
            companyName,
            gstNumber
        });

        await rentalCustomer.save();

        res.status(201).json({
            message: 'Rental customer created successfully',
            rentalCustomer
        });
    } catch (err) {
        console.error('Error creating rental customer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all rental customers
exports.getAllRentalCustomers = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { alternativePhone: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } }
            ];
        }

        const rentalCustomers = await RentalCustomer.find(filter)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await RentalCustomer.countDocuments(filter);

        res.status(200).json({
            rentalCustomers,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        console.error('Error fetching rental customers:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get rental customer by ID
exports.getRentalCustomerById = async (req, res) => {
    try {
        const rentalCustomer = await RentalCustomer.findById(req.params.id);

        if (!rentalCustomer) {
            return res.status(404).json({ message: 'Rental customer not found' });
        }

        res.status(200).json(rentalCustomer);
    } catch (err) {
        console.error('Error fetching rental customer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update rental customer
exports.updateRentalCustomer = async (req, res) => {
    try {
        const { name, email, phone, alternativePhone, address, idProof, deposit, notes, status, referral, customerType, companyName, gstNumber } = req.body;

        const rentalCustomer = await RentalCustomer.findById(req.params.id);
        if (!rentalCustomer) {
            return res.status(404).json({ message: 'Rental customer not found' });
        }

        if (name) rentalCustomer.name = name;
        if (email !== undefined) rentalCustomer.email = email;
        if (phone) rentalCustomer.phone = phone;
        if (alternativePhone !== undefined) rentalCustomer.alternativePhone = alternativePhone;
        if (address !== undefined) rentalCustomer.address = address;
        if (idProof) rentalCustomer.idProof = idProof;
        if (deposit !== undefined) rentalCustomer.deposit = deposit;
        if (notes !== undefined) rentalCustomer.notes = notes;
        if (status) rentalCustomer.status = status;
        if (referral) rentalCustomer.referral = referral;
        if (customerType) rentalCustomer.customerType = customerType;
        if (companyName !== undefined) rentalCustomer.companyName = companyName;
        if (gstNumber !== undefined) rentalCustomer.gstNumber = gstNumber;

        await rentalCustomer.save();

        res.status(200).json({
            message: 'Rental customer updated successfully',
            rentalCustomer
        });
    } catch (err) {
        console.error('Error updating rental customer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete rental customer
exports.deleteRentalCustomer = async (req, res) => {
    try {
        const rentalCustomer = await RentalCustomer.findByIdAndDelete(req.params.id);

        if (!rentalCustomer) {
            return res.status(404).json({ message: 'Rental customer not found' });
        }

        res.status(200).json({ message: 'Rental customer deleted successfully' });
    } catch (err) {
        console.error('Error deleting rental customer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Block rental customer (Super Admin only)
exports.blockRentalCustomer = async (req, res) => {
    try {
        const rentalCustomer = await RentalCustomer.findByIdAndUpdate(
            req.params.id,
            { status: 'blocked' },
            { new: true }
        );

        if (!rentalCustomer) {
            return res.status(404).json({ message: 'Rental customer not found' });
        }

        res.status(200).json({
            message: 'Rental customer blocked successfully',
            rentalCustomer
        });
    } catch (err) {
        console.error('Error blocking rental customer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Unblock rental customer (Super Admin only)
exports.unblockRentalCustomer = async (req, res) => {
    try {
        const rentalCustomer = await RentalCustomer.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        );

        if (!rentalCustomer) {
            return res.status(404).json({ message: 'Rental customer not found' });
        }

        res.status(200).json({
            message: 'Rental customer unblocked successfully',
            rentalCustomer
        });
    } catch (err) {
        console.error('Error unblocking rental customer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
