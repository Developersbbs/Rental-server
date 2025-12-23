const RentalSupplier = require('../models/RentalSupplier');

// Create rental supplier
exports.createRentalSupplier = async (req, res) => {
    try {
        const { name, contactPerson, email, phone, address, gst, notes } = req.body;

        const rentalSupplier = new RentalSupplier({
            name,
            contactPerson,
            email,
            phone,
            address,
            gst,
            notes
        });

        await rentalSupplier.save();

        res.status(201).json({
            message: 'Rental supplier created successfully',
            rentalSupplier
        });
    } catch (err) {
        console.error('Error creating rental supplier:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all rental suppliers
exports.getAllRentalSuppliers = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contactPerson: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const rentalSuppliers = await RentalSupplier.find(filter)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await RentalSupplier.countDocuments(filter);

        res.status(200).json({
            rentalSuppliers,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        console.error('Error fetching rental suppliers:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get rental supplier by ID
exports.getRentalSupplierById = async (req, res) => {
    try {
        const rentalSupplier = await RentalSupplier.findById(req.params.id);

        if (!rentalSupplier) {
            return res.status(404).json({ message: 'Rental supplier not found' });
        }

        res.status(200).json(rentalSupplier);
    } catch (err) {
        console.error('Error fetching rental supplier:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update rental supplier
exports.updateRentalSupplier = async (req, res) => {
    try {
        const { name, contactPerson, email, phone, address, gst, notes, status } = req.body;

        const rentalSupplier = await RentalSupplier.findById(req.params.id);
        if (!rentalSupplier) {
            return res.status(404).json({ message: 'Rental supplier not found' });
        }

        if (name) rentalSupplier.name = name;
        if (contactPerson !== undefined) rentalSupplier.contactPerson = contactPerson;
        if (email !== undefined) rentalSupplier.email = email;
        if (phone) rentalSupplier.phone = phone;
        if (address !== undefined) rentalSupplier.address = address;
        if (gst !== undefined) rentalSupplier.gst = gst;
        if (notes !== undefined) rentalSupplier.notes = notes;
        if (status) rentalSupplier.status = status;

        await rentalSupplier.save();

        res.status(200).json({
            message: 'Rental supplier updated successfully',
            rentalSupplier
        });
    } catch (err) {
        console.error('Error updating rental supplier:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete rental supplier
exports.deleteRentalSupplier = async (req, res) => {
    try {
        const rentalSupplier = await RentalSupplier.findByIdAndDelete(req.params.id);

        if (!rentalSupplier) {
            return res.status(404).json({ message: 'Rental supplier not found' });
        }

        res.status(200).json({ message: 'Rental supplier deleted successfully' });
    } catch (err) {
        console.error('Error deleting rental supplier:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
