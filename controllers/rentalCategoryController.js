const RentalCategory = require('../models/RentalCategory');

// Create rental category
exports.createRentalCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        const rentalCategory = new RentalCategory({
            name,
            description
        });

        await rentalCategory.save();

        res.status(201).json({
            message: 'Rental category created successfully',
            rentalCategory
        });
    } catch (err) {
        console.error('Error creating rental category:', err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Rental category with this name already exists' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all rental categories
exports.getAllRentalCategories = async (req, res) => {
    try {
        const { page = 1, limit = 50, status, search } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const rentalCategories = await RentalCategory.find(filter)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ name: 1 });

        const total = await RentalCategory.countDocuments(filter);

        res.status(200).json({
            rentalCategories,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        console.error('Error fetching rental categories:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get rental category by ID
exports.getRentalCategoryById = async (req, res) => {
    try {
        const rentalCategory = await RentalCategory.findById(req.params.id);

        if (!rentalCategory) {
            return res.status(404).json({ message: 'Rental category not found' });
        }

        res.status(200).json(rentalCategory);
    } catch (err) {
        console.error('Error fetching rental category:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update rental category
exports.updateRentalCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;

        const rentalCategory = await RentalCategory.findById(req.params.id);
        if (!rentalCategory) {
            return res.status(404).json({ message: 'Rental category not found' });
        }

        if (name) rentalCategory.name = name;
        if (description !== undefined) rentalCategory.description = description;
        if (status) rentalCategory.status = status;

        await rentalCategory.save();

        res.status(200).json({
            message: 'Rental category updated successfully',
            rentalCategory
        });
    } catch (err) {
        console.error('Error updating rental category:', err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Rental category with this name already exists' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete rental category
exports.deleteRentalCategory = async (req, res) => {
    try {
        const rentalCategory = await RentalCategory.findByIdAndDelete(req.params.id);

        if (!rentalCategory) {
            return res.status(404).json({ message: 'Rental category not found' });
        }

        res.status(200).json({ message: 'Rental category deleted successfully' });
    } catch (err) {
        console.error('Error deleting rental category:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
