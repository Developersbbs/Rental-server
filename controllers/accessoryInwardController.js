const AccessoryInward = require('../models/AccessoryInward');
const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Create new accessory inward
// @route   POST /api/accessory-inward
// @access  Private
const createAccessoryInward = async (req, res) => {
    try {
        const {
            receivedDate,
            items,
            supplierInvoiceNumber,
            totalAmount,
            notes,
            supplier
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in inward' });
        }

        // 1. Create Inward Record first (to get ID) - initially without product links
        const inward = new AccessoryInward({
            receivedDate,
            items: [], // Will populate after product creation
            supplierInvoiceNumber,
            totalAmount,
            notes,
            supplier,
            receivedBy: req.user._id,
            status: 'completed'
        });

        const processedItems = [];

        // 2. Process each item (Create or Update Product)
        for (const item of items) {
            let product;

            // Try to find existing product by Name or SKU (if provided)
            const query = { $or: [{ name: item.name }] };
            if (item.sku) query.$or.push({ sku: item.sku });

            // Filter to only look for Selling Accessories to avoid conflict with Rental Products
            // (Assuming names/SKUs might overlap, but usually shouldn't)

            let existingProduct = await Product.findOne({
                ...query,
                isSellingAccessory: true
            });

            if (existingProduct) {
                // UPDATE existing product
                existingProduct.quantity += parseInt(item.quantity);
                existingProduct.price = parseFloat(item.sellingPrice); // Update selling price to latest
                // You might optionally update purchase cost stored on product if you had a field for it
                // existingProduct.purchaseCost = parseFloat(item.purchaseCost); 

                await existingProduct.save();
                product = existingProduct;
            } else {
                // CREATE new product
                // Ensure 'Accessories' category exists
                let categoryId = item.category; // If passed from frontend

                if (!categoryId) {
                    // Fallback: Find 'Accessories' category
                    const accCategory = await Category.findOne({
                        name: { $regex: /^accessories$/i }
                    });
                    if (accCategory) {
                        categoryId = accCategory._id;
                    } else {
                        // Create if not exists (fail-safe)
                        const newCat = await Category.create({ name: 'Accessories', status: 'active' });
                        categoryId = newCat._id;
                    }
                }

                product = await Product.create({
                    name: item.name,
                    sku: item.sku,
                    category: categoryId,
                    quantity: parseInt(item.quantity),
                    price: parseFloat(item.sellingPrice),
                    minStockLevel: item.minStockLevel || 5,
                    location: item.location,
                    supplier: supplier,
                    isSellingAccessory: true,
                    isRental: false,
                    addedDate: new Date()
                });
            }

            // Add to processed items list for the Inward Record
            processedItems.push({
                productName: item.name,
                productSku: item.sku,
                product: product._id, // Link to the actual Product
                quantity: parseInt(item.quantity),
                purchaseCost: parseFloat(item.purchaseCost),
                sellingPrice: parseFloat(item.sellingPrice),
                minStockLevel: item.minStockLevel,
                location: item.location
            });
        }

        // 3. Update Inward Record with processed items
        inward.items = processedItems;
        await inward.save();

        res.status(201).json(inward);

    } catch (error) {
        console.error('Error creating accessory inward:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all accessory inwards
// @route   GET /api/accessory-inward
// @access  Private
const getAllAccessoryInwards = async (req, res) => {
    try {
        const { page = 1, limit = 10, startDate, endDate, supplier, status } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.receivedDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (supplier) {
            query.supplier = supplier;
        }

        if (status) {
            query.status = status;
        }

        const inwards = await AccessoryInward.find(query)
            .populate('supplier', 'name')
            .populate('receivedBy', 'name')
            .sort({ receivedDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await AccessoryInward.countDocuments(query);

        res.status(200).json({
            accessoryInwards: inwards,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAccessoryInward,
    getAllAccessoryInwards
};
