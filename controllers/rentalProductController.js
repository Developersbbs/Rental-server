const RentalProduct = require('../models/RentalProduct');
const RentalCategory = require('../models/RentalCategory');

const RentalInventoryItem = require('../models/RentalInventoryItem');

// Create rental product
exports.createRentalProduct = async (req, res) => {
    try {
        const { name, description, category, rentalRate, images, specifications } = req.body;

        // Validate category if provided
        if (category) {
            const categoryDoc = await RentalCategory.findById(category);
            if (!categoryDoc) {
                return res.status(404).json({ message: 'Rental category not found' });
            }
        }

        const rentalProduct = new RentalProduct({
            name,
            description,
            category,
            rentalRate,
            images: images || [],
            specifications: specifications || {},
            createdBy: req.user._id
        });

        await rentalProduct.save();
        await rentalProduct.populate('category');
        await rentalProduct.populate('createdBy', 'username');

        res.status(201).json({
            message: 'Rental product created successfully',
            rentalProduct
        });
    } catch (err) {
        console.error('Error creating rental product:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all rental products
exports.getAllRentalProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, status, search } = req.query;

        const filter = {};
        if (category) filter.category = category;
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const rentalProductsDocs = await RentalProduct.find(filter)
            .populate('category', 'name')
            .populate('createdBy', 'username')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .lean();

        // Calculate available quantity for each product
        const rentalProducts = await Promise.all(rentalProductsDocs.map(async (product) => {
            const availableCount = await RentalInventoryItem.countDocuments({
                rentalProductId: product._id,
                status: 'available'
            });
            return { ...product, availableQuantity: availableCount };
        }));

        const total = await RentalProduct.countDocuments(filter);

        res.status(200).json({
            rentalProducts,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        console.error('Error fetching rental products:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get rental product by ID
exports.getRentalProductById = async (req, res) => {
    try {
        const rentalProduct = await RentalProduct.findById(req.params.id)
            .populate('category')
            .populate('createdBy', 'username');

        if (!rentalProduct) {
            return res.status(404).json({ message: 'Rental product not found' });
        }

        res.status(200).json(rentalProduct);
    } catch (err) {
        console.error('Error fetching rental product:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update rental product
exports.updateRentalProduct = async (req, res) => {
    try {
        const { name, description, category, rentalRate, images, specifications, status } = req.body;

        const rentalProduct = await RentalProduct.findById(req.params.id);
        if (!rentalProduct) {
            return res.status(404).json({ message: 'Rental product not found' });
        }

        // Validate category if provided
        if (category) {
            const categoryDoc = await RentalCategory.findById(category);
            if (!categoryDoc) {
                return res.status(404).json({ message: 'Rental category not found' });
            }
        }

        if (name) rentalProduct.name = name;
        if (description !== undefined) rentalProduct.description = description;
        if (category !== undefined) rentalProduct.category = category;
        if (rentalRate) rentalProduct.rentalRate = rentalRate;
        if (images) rentalProduct.images = images;
        if (specifications) rentalProduct.specifications = specifications;
        if (status) rentalProduct.status = status;

        await rentalProduct.save();
        await rentalProduct.populate('category');
        await rentalProduct.populate('createdBy', 'username');

        res.status(200).json({
            message: 'Rental product updated successfully',
            rentalProduct
        });
    } catch (err) {
        console.error('Error updating rental product:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete rental product
exports.deleteRentalProduct = async (req, res) => {
    try {
        const rentalProduct = await RentalProduct.findByIdAndDelete(req.params.id);

        if (!rentalProduct) {
            return res.status(404).json({ message: 'Rental product not found' });
        }

        res.status(200).json({ message: 'Rental product deleted successfully' });
    } catch (err) {
        console.error('Error deleting rental product:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
