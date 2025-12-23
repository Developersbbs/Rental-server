const ProductItem = require('../models/ProductItem');
const Product = require('../models/Product');

// Get all items for a product
exports.getItemsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const items = await ProductItem.find({ productId }).sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Add a new item
exports.addItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { uniqueIdentifier, condition, costPrice } = req.body;

        const existingItem = await ProductItem.findOne({ uniqueIdentifier });
        if (existingItem) {
            return res.status(400).json({ message: 'Item with this identifier already exists' });
        }

        const newItem = new ProductItem({
            productId,
            uniqueIdentifier,
            condition,
            costPrice,
            history: [{
                action: 'added',
                details: 'Initial addition to inventory',
                performedBy: req.user ? req.user._id : null
            }]
        });

        await newItem.save();

        // Update product quantity
        await Product.findByIdAndUpdate(productId, { $inc: { quantity: 1 } });

        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update item status/condition
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, condition, notes } = req.body;

        const item = await ProductItem.findById(id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        if (status && status !== item.status) {
            item.history.push({
                action: status === 'missing' ? 'marked_missing' : status === 'scrap' ? 'scrapped' : 'maintenance_start',
                details: notes || `Status changed to ${status}`,
                performedBy: req.user ? req.user._id : null
            });
            item.status = status;
        }

        if (condition) item.condition = condition;

        await item.save();
        res.status(200).json(item);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await ProductItem.findById(id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        await ProductItem.findByIdAndDelete(id);
        await Product.findByIdAndUpdate(item.productId, { $inc: { quantity: -1 } });

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
