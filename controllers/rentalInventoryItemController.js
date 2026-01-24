const RentalInventoryItem = require('../models/RentalInventoryItem');
const RentalProduct = require('../models/RentalProduct');

// Get all items for a rental product
exports.getAllItems = async (req, res) => {
    try {
        const items = await RentalInventoryItem.find()
            .populate({
                path: 'rentalProductId',
                select: 'name category',
                populate: {
                    path: 'category',
                    select: 'name'
                }
            })
            .populate('inwardId', 'inwardNumber')
            .sort({ createdAt: -1 });

        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all items for a rental product
exports.getItemsByRentalProduct = async (req, res) => {
    try {
        const { rentalProductId } = req.params;
        const items = await RentalInventoryItem.find({ rentalProductId, isArchived: { $ne: true } })
            .populate('rentalProductId', 'name')
            .populate('inwardId', 'inwardNumber')
            .sort({ createdAt: -1 });

        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get single item by ID
exports.getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await RentalInventoryItem.findById(id)
            .populate('rentalProductId', 'name')
            .populate('inwardId', 'inwardNumber');

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.status(200).json(item);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Add a new rental inventory item
exports.addItem = async (req, res) => {
    try {
        const { rentalProductId } = req.params;
        const { uniqueIdentifier, condition, purchaseCost, purchaseDate, batchNumber, notes, accessories, serialNumber } = req.body;

        // Check if product exists
        const product = await RentalProduct.findById(rentalProductId);
        if (!product) {
            return res.status(404).json({ message: 'Rental product not found' });
        }

        // Check if unique identifier already exists (if provided)
        if (uniqueIdentifier) {
            const existingItem = await RentalInventoryItem.findOne({ uniqueIdentifier });
            if (existingItem) {
                return res.status(400).json({ message: 'Item with this identifier already exists' });
            }
        }

        const newItem = new RentalInventoryItem({
            rentalProductId,
            uniqueIdentifier,
            condition: condition || 'good',
            purchaseCost,
            purchaseDate: purchaseDate || Date.now(),
            batchNumber,
            notes,
            serialNumber,
            accessories: accessories || [],
            history: [{
                action: 'added',
                details: 'Manually added to inventory',
                performedBy: req.user ? req.user._id : null
            }]
        });

        await newItem.save();

        // Update product quantities
        await updateProductQuantities(rentalProductId);

        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update item status/condition
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, condition, notes, accessories, damageReason, serialNumber } = req.body;

        const item = await RentalInventoryItem.findById(id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const oldStatus = item.status;

        if (status && status !== item.status) {
            item.history.push({
                action: status === 'missing' ? 'marked_missing' :
                    status === 'scrap' ? 'scrapped' :
                        status === 'damaged' ? 'marked_damaged' :
                            status === 'maintenance' ? 'maintenance_start' :
                                status === 'available' ? 'maintenance_end' : 'rented',
                details: notes || damageReason || `Status changed from ${oldStatus} to ${status}`,
                performedBy: req.user ? req.user._id : null
            });
            item.status = status;
        }

        if (condition) item.condition = condition;
        if (accessories) item.accessories = accessories;
        if (damageReason) item.damageReason = damageReason;
        if (serialNumber !== undefined) item.serialNumber = serialNumber;

        // Clear damageReason if status is changing from damaged to something else
        if (oldStatus === 'damaged' && status && status !== 'damaged') {
            item.damageReason = undefined;
        }

        if (notes && !status) {
            item.history.push({
                action: 'maintenance_start',
                details: notes,
                performedBy: req.user ? req.user._id : null
            });
        }

        await item.save();

        // Update product quantities if status changed
        if (status && status !== oldStatus) {
            await updateProductQuantities(item.rentalProductId);
        }

        res.status(200).json(item);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get archived items for a rental product
exports.getArchivedItems = async (req, res) => {
    try {
        const { rentalProductId } = req.params;
        const items = await RentalInventoryItem.find({ rentalProductId, isArchived: true })
            .populate('rentalProductId', 'name')
            .populate('inwardId', 'inwardNumber')
            .sort({ updatedAt: -1 });

        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Toggle archive status
exports.toggleArchiveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await RentalInventoryItem.findById(id);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Cannot archive rented items
        if (!item.isArchived && item.status === 'rented') {
            return res.status(400).json({ message: 'Cannot archive item that is currently rented' });
        }

        const newArchiveStatus = !item.isArchived;
        item.isArchived = newArchiveStatus;

        item.history.push({
            action: newArchiveStatus ? 'maintenance_start' : 'maintenance_end', // Using maintenance actions as fallback or defining new ones if enum allows
            details: newArchiveStatus ? 'Item Archived' : 'Item Restored from Archive',
            performedBy: req.user ? req.user._id : null
        });

        await item.save();

        // Update product quantities
        await updateProductQuantities(item.rentalProductId);

        res.status(200).json({
            message: `Item ${newArchiveStatus ? 'archived' : 'restored'} successfully`,
            item
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await RentalInventoryItem.findById(id);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Don't allow deletion if item is currently rented
        if (item.status === 'rented') {
            return res.status(400).json({ message: 'Cannot delete item that is currently rented' });
        }

        const rentalProductId = item.rentalProductId;
        await RentalInventoryItem.findByIdAndDelete(id);

        // Update product quantities
        await updateProductQuantities(rentalProductId);

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get item history
exports.getItemHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await RentalInventoryItem.findById(id)
            .populate('history.performedBy', 'username')
            .populate('rentalProductId', 'name');

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.status(200).json({
            item: {
                uniqueIdentifier: item.uniqueIdentifier,
                product: item.rentalProductId,
                status: item.status,
                condition: item.condition
            },
            history: item.history
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Helper function to update product quantities
async function updateProductQuantities(rentalProductId) {
    const totalItems = await RentalInventoryItem.countDocuments({ rentalProductId });
    const availableItems = await RentalInventoryItem.countDocuments({
        rentalProductId,
        status: 'available'
    });

    await RentalProduct.findByIdAndUpdate(rentalProductId, {
        totalQuantity: totalItems,
        availableQuantity: availableItems
    });
}
