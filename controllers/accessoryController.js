const Accessory = require('../models/Accessory');
const RentalProduct = require('../models/RentalProduct');
const RentalInventoryItem = require('../models/RentalInventoryItem');

// Get all accessories for a rental product
exports.getAccessoriesByProduct = async (req, res) => {
    try {
        const { rentalProductId } = req.params;
        const accessories = await Accessory.find({ rentalProductId })
            .populate('rentalProductId', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(accessories);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Add a new accessory
exports.addAccessory = async (req, res) => {
    try {
        const { rentalProductId } = req.params;
        const { name, description, isRequired, replacementCost } = req.body;

        // Check if product exists
        const product = await RentalProduct.findById(rentalProductId);
        if (!product) {
            return res.status(404).json({ message: 'Rental product not found' });
        }

        const newAccessory = new Accessory({
            rentalProductId,
            name,
            description,
            isRequired: isRequired || false,
            replacementCost: replacementCost || 0
        });

        await newAccessory.save();

        res.status(201).json(newAccessory);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update accessory
exports.updateAccessory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isRequired, replacementCost } = req.body;

        const accessory = await Accessory.findById(id);
        if (!accessory) {
            return res.status(404).json({ message: 'Accessory not found' });
        }

        if (name) accessory.name = name;
        if (description !== undefined) accessory.description = description;
        if (isRequired !== undefined) accessory.isRequired = isRequired;
        if (replacementCost !== undefined) accessory.replacementCost = replacementCost;

        await accessory.save();

        res.status(200).json(accessory);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete accessory
exports.deleteAccessory = async (req, res) => {
    try {
        const { id } = req.params;
        const accessory = await Accessory.findById(id);

        if (!accessory) {
            return res.status(404).json({ message: 'Accessory not found' });
        }

        await Accessory.findByIdAndDelete(id);

        res.status(200).json({ message: 'Accessory deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get accessory statistics
exports.getAccessoryStats = async (req, res) => {
    try {
        const stats = await Accessory.aggregate([
            {
                $lookup: {
                    from: 'rentalproducts',
                    localField: 'rentalProductId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'rentalinventoryitems',
                    let: { accessoryId: '$_id' },
                    pipeline: [
                        { $unwind: '$accessories' },
                        { $match: { $expr: { $eq: ['$accessories.accessoryId', '$$accessoryId'] } } },
                        {
                            $project: {
                                _id: 1,
                                status: 1, // Item status
                                accessoryStatus: '$accessories.status',
                                accessoryCondition: '$accessories.condition'
                            }
                        }
                    ],
                    as: 'inventoryItems'
                }
            },
            {
                $project: {
                    name: 1,
                    productName: '$product.name',
                    totalCount: { $size: '$inventoryItems' },
                    availableCount: {
                        $size: {
                            $filter: {
                                input: '$inventoryItems',
                                as: 'item',
                                cond: { $eq: ['$$item.status', 'available'] } // Assuming accessory is available if item is available
                            }
                        }
                    },
                    rentedCount: {
                        $size: {
                            $filter: {
                                input: '$inventoryItems',
                                as: 'item',
                                cond: { $eq: ['$$item.status', 'rented'] }
                            }
                        }
                    },
                    maintenanceCount: {
                        $size: {
                            $filter: {
                                input: '$inventoryItems',
                                as: 'item',
                                cond: {
                                    $or: [
                                        { $eq: ['$$item.status', 'maintenance'] },
                                        { $eq: ['$$item.accessoryStatus', 'maintenance'] },
                                        { $eq: ['$$item.accessoryCondition', 'damaged'] }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            { $sort: { productName: 1, name: 1 } }
        ]);

        res.status(200).json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
