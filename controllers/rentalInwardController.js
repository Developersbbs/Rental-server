const RentalInward = require('../models/RentalInward');
const RentalProduct = require('../models/RentalProduct');
const RentalInventoryItem = require('../models/RentalInventoryItem');

// Create rental inward
exports.createRentalInward = async (req, res) => {
    try {
        console.log('🔍 Creating rental inward - User:', req.user);

        // Validate that user is authenticated
        if (!req.user || !req.user._id) {
            console.error('❌ No authenticated user found');
            return res.status(401).json({
                message: 'Authentication required. Please log in again.',
                code: 'NO_USER'
            });
        }

        const { receivedDate, items, notes } = req.body;

        // Validate items and calculate total
        let totalAmount = 0;
        const validatedItems = [];
        const inwardHistory = [];

        for (const item of items) {
            const product = await RentalProduct.findById(item.product);
            if (!product) {
                return res.status(404).json({ message: `Rental product not found: ${item.product}` });
            }

            const itemTotal = item.quantity * item.purchaseCost;
            totalAmount += itemTotal;

            validatedItems.push({
                product: item.product,
                quantity: item.quantity,
                purchaseCost: item.purchaseCost,
                batchNumber: item.batchNumber,
                purchaseDate: item.purchaseDate,
                condition: item.condition || 'new',
                notes: item.notes
            });
        }

        // Generate inward number
        const count = await RentalInward.countDocuments();
        const inwardNumber = `RI-${String(count + 1).padStart(6, '0')}`;

        // Create rental inward record first
        const rentalInward = new RentalInward({
            inwardNumber,
            receivedDate: Date.now(), // Use current timestamp instead of form date
            items: validatedItems,
            totalAmount,
            notes,
            receivedBy: req.user._id,
            status: 'completed',
            inwardHistory: [] // Will be populated after creating items
        });

        await rentalInward.save();

        // Create rental inventory items for each quantity
        for (const item of validatedItems) {
            for (let i = 0; i < item.quantity; i++) {
                // Generate unique identifier with duplicate checking
                const product = await RentalProduct.findById(item.product);
                const productName = product ? product.name.replace(/\s+/g, '-').substring(0, 20) : 'RENTAL';

                // Find a unique identifier by checking existing ones
                let uniqueIdentifier;
                let counter = await RentalInventoryItem.countDocuments({ rentalProductId: item.product }) + 1;
                let isUnique = false;

                while (!isUnique) {
                    uniqueIdentifier = `RI-${productName}-${String(counter).padStart(4, '0')}`;
                    const existing = await RentalInventoryItem.findOne({ uniqueIdentifier });
                    if (!existing) {
                        isUnique = true;
                    } else {
                        counter++;
                    }
                }

                const rentalInventoryItem = new RentalInventoryItem({
                    rentalProductId: item.product,
                    uniqueIdentifier,
                    status: 'available',
                    condition: item.condition || 'new',
                    purchaseDate: item.purchaseDate || Date.now(),
                    purchaseCost: item.purchaseCost,
                    inwardId: rentalInward._id,
                    batchNumber: item.batchNumber,
                    notes: item.notes,
                    history: [{
                        action: 'received',
                        details: `Received via Rental Inward ${rentalInward.inwardNumber}. Batch: ${item.batchNumber}`,
                        performedBy: req.user._id
                    }]
                });

                await rentalInventoryItem.save();

                // Add to inward history
                inwardHistory.push({
                    inventoryItemId: rentalInventoryItem._id,
                    uniqueIdentifier: rentalInventoryItem.uniqueIdentifier,
                    productId: item.product,
                    createdAt: Date.now()
                });

                // Update product quantities
                await updateProductQuantities(item.product);
            }
        }

        // Update inward with history
        rentalInward.inwardHistory = inwardHistory;
        await rentalInward.save();

        // Populate references
        await rentalInward.populate('items.product');
        await rentalInward.populate('receivedBy', 'username');
        await rentalInward.populate('inwardHistory.inventoryItemId');

        res.status(201).json({
            message: 'Rental inward created successfully',
            rentalInward
        });
    } catch (err) {
        console.error('❌ Error creating rental inward:', err);
        console.error('Error stack:', err.stack);
        console.error('Request body:', req.body);
        console.error('Request user:', req.user);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all rental inwards
exports.getAllRentalInwards = async (req, res) => {
    try {
        const { page = 1, limit = 10, startDate, endDate, status } = req.query;

        const filter = {};
        if (startDate && endDate) {
            filter.receivedDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        if (status) filter.status = status;

        const rentalInwards = await RentalInward.find(filter)
            .populate('items.product', 'name')
            .populate('receivedBy', 'username')
            .populate('inwardHistory.inventoryItemId', 'uniqueIdentifier status')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await RentalInward.countDocuments(filter);

        res.status(200).json({
            rentalInwards,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        console.error('Error fetching rental inwards:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get rental inward by ID
exports.getRentalInwardById = async (req, res) => {
    try {
        const rentalInward = await RentalInward.findById(req.params.id)
            .populate('items.product')
            .populate('receivedBy', 'username')
            .populate('inwardHistory.inventoryItemId')
            .populate('inwardHistory.productId', 'name');

        if (!rentalInward) {
            return res.status(404).json({ message: 'Rental inward not found' });
        }

        res.status(200).json(rentalInward);
    } catch (err) {
        console.error('Error fetching rental inward:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update rental inward
exports.updateRentalInward = async (req, res) => {
    try {
        const { receivedDate, notes, status } = req.body;

        const rentalInward = await RentalInward.findById(req.params.id);
        if (!rentalInward) {
            return res.status(404).json({ message: 'Rental inward not found' });
        }

        if (receivedDate) rentalInward.receivedDate = receivedDate;
        if (notes) rentalInward.notes = notes;
        if (status) rentalInward.status = status;

        await rentalInward.save();
        await rentalInward.populate('items.product');
        await rentalInward.populate('receivedBy', 'username');

        res.status(200).json({
            message: 'Rental inward updated successfully',
            rentalInward
        });
    } catch (err) {
        console.error('Error updating rental inward:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete rental inward
exports.deleteRentalInward = async (req, res) => {
    try {
        const rentalInward = await RentalInward.findByIdAndDelete(req.params.id);

        if (!rentalInward) {
            return res.status(404).json({ message: 'Rental inward not found' });
        }

        res.status(200).json({ message: 'Rental inward deleted successfully' });
    } catch (err) {
        console.error('Error deleting rental inward:', err);
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
