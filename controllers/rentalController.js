const Rental = require('../models/Rental');
const RentalInventoryItem = require('../models/RentalInventoryItem');
const RentalProduct = require('../models/RentalProduct');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Accessory = require('../models/Accessory');
const Product = require('../models/Product');
const { handleRentalReturn } = require('../utils/rentalNotifications');

const mongoose = require('mongoose');

// Create new rental
exports.createRental = async (req, res) => {
    try {

        const { customerId, items, expectedReturnTime, advancePayment, accessoriesPayment, notes, outTime, soldItems } = req.body;

        if (!customerId) {
            console.error('❌ Missing customerId in request body');
            return res.status(400).json({ message: 'Customer is required' });
        }

        // Check if customer is blocked
        const RentalCustomer = require('../models/RentalCustomer');
        const customer = await RentalCustomer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        if (customer.status === 'blocked') {
            return res.status(403).json({ message: 'This customer is blocked and cannot create new rentals' });
        }

        // Validate outTime if provided
        if (outTime) {
            const startTime = new Date(outTime);
            const now = new Date();
            if (startTime > now) {
                return res.status(400).json({ message: 'Rental start time cannot be in the future' });
            }
        }

        // Process Sold Items (Selling Accessories)
        const processedSoldItems = [];
        let soldItemsTotal = 0;

        if (soldItems && soldItems.length > 0) {
            for (const soldItem of soldItems) {
                const product = await Product.findById(soldItem.productId);
                if (!product) {
                    return res.status(404).json({ message: `Selling product not found: ${soldItem.productId}` });
                }

                if (product.quantity < soldItem.quantity) {
                    return res.status(400).json({ message: `Insufficient stock for selling item: ${product.name}` });
                }

                // Deduct stock
                product.quantity -= soldItem.quantity;
                await product.save();

                processedSoldItems.push({
                    product: product._id,
                    quantity: soldItem.quantity,
                    price: soldItem.price,
                    total: soldItem.price * soldItem.quantity
                });
                soldItemsTotal += (soldItem.price * soldItem.quantity);
            }
        }

        // Validate items availability and resolve Product IDs to RentalInventoryItem IDs
        const resolvedItems = [];
        const assignedItemIds = []; // Track assigned IDs to prevent duplicates in the same request

        for (const item of items) {


            // Try to find specific RentalInventoryItem first
            let rentalItem = null;
            try {
                // Use $and to properly combine _id conditions
                rentalItem = await RentalInventoryItem.findOne({
                    $and: [
                        { _id: item.item },
                        { _id: { $nin: assignedItemIds } }
                    ],
                    status: 'available'
                });

            } catch (e) {

            }

            // If not found, try to find ANY available RentalInventoryItem for this RentalProduct ID
            if (!rentalItem) {


                // Explicitly convert to ObjectId for proper comparison
                const productObjectId = mongoose.Types.ObjectId.isValid(item.item)
                    ? new mongoose.Types.ObjectId(item.item)
                    : item.item;



                rentalItem = await RentalInventoryItem.findOne({
                    rentalProductId: productObjectId,
                    status: 'available',
                    _id: { $nin: assignedItemIds }
                });

            }

            if (!rentalItem) {
                // Fetch product name for better error message if possible
                const product = await RentalProduct.findById(item.item);
                const itemName = product ? product.name : 'Unknown Item';

                return res.status(400).json({ message: `No available stock for item: ${itemName}` });
            }

            assignedItemIds.push(rentalItem._id); // Add to assigned list

            resolvedItems.push({
                item: rentalItem._id, // Use the resolved RentalInventoryItem ID
                rentType: item.rentType,
                rentAtTime: item.rentAtTime,
                accessories: item.accessories || []
            });
        }

        const rentalData = {
            customer: customerId,
            items: resolvedItems,
            soldItems: processedSoldItems,
            expectedReturnTime,
            advancePayment,
            accessoriesPayment: accessoriesPayment || 0,
            notes,
            createdBy: req.user ? req.user._id : null
        };



        // Add outTime if provided, otherwise it will use the default (Date.now)
        if (outTime) {
            rentalData.outTime = outTime;
        }

        const rental = new Rental(rentalData);

        await rental.save();


        // Update item statuses to 'rented'
        for (const item of resolvedItems) {
            await RentalInventoryItem.findByIdAndUpdate(item.item, {
                status: 'rented',
                $push: {
                    history: {
                        action: 'rented',
                        details: `Rented in Rental ID: ${rental.rentalId}`,
                        performedBy: req.user ? req.user._id : null
                    }
                }
            });
        }

        res.status(201).json(rental);
    } catch (err) {
        console.error('Rental creation error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all rentals
exports.getAllRentals = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (req.query.customerId) filter.customer = req.query.customerId;

        // Add search logic if needed (e.g., by customer name or rental ID)

        // Add search logic if needed (e.g., by customer name or rental ID)

        const rentals = await Rental.find(filter)
            .populate({
                path: 'customer',
                model: 'RentalCustomer',
                select: 'name email phone'
            })
            .populate({
                path: 'items.item',
                model: 'RentalInventoryItem',
                select: 'uniqueIdentifier condition rentalProductId',
                populate: {
                    path: 'rentalProductId',
                    model: 'RentalProduct',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 });

        res.status(200).json(rentals);
    } catch (err) {
        console.error('Error in getAllRentals:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get rental by ID
exports.getRentalById = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id)
            .populate('customer')
            .populate('items.item')
            .populate({
                path: 'items.accessories.accessoryId',
                model: 'Accessory'
            })
            .populate({
                path: 'soldItems.product',
                model: 'Product'
            })
            .populate('finalBill');

        if (!rental) return res.status(404).json({ message: 'Rental not found' });

        res.status(200).json(rental);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Return items and calculate bill
exports.returnRental = async (req, res) => {
    try {
        const { id } = req.params;
        const { returnItems, paymentMethod, paymentAccountId, discountPercent = 0, taxPercent = 18, paidDueAmount = 0, customizedTotalAmount } = req.body;

        const rental = await Rental.findById(id).populate('customer').populate('items.item').populate('soldItems.product');
        if (!rental) {
            return res.status(404).json({ message: 'Rental not found' });
        }

        if (rental.status === 'completed') {
            return res.status(400).json({ message: 'Rental already completed' });
        }

        const now = new Date();
        let totalRentalCost = 0;
        let totalDamageCost = 0;
        const billItems = [];

        // Add Sold Items to Bill
        if (rental.soldItems && rental.soldItems.length > 0) {
            for (const soldItem of rental.soldItems) {
                if (soldItem.product) {
                    const itemTotal = (soldItem.quantity || 0) * (soldItem.price || 0);
                    totalRentalCost += itemTotal;

                    billItems.push({
                        productId: soldItem.product._id,
                        name: `${soldItem.product.name} (Sold)`,
                        quantity: soldItem.quantity || 0,
                        price: soldItem.price || 0,
                        total: itemTotal
                    });
                }
            }
        }

        // Process returned items
        for (const rItem of returnItems) {
            const rentalItemIndex = rental.items.findIndex(i => i.item && i.item._id.toString() === rItem.itemId);
            if (rentalItemIndex === -1) {
                continue;
            }

            const rentalItem = rental.items[rentalItemIndex];
            const inventoryItem = rentalItem.item;

            // Calculate duration
            const durationMs = Math.max(0, now - rental.outTime);
            const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)) || 1; // Default to 1 hour if too small
            const durationDays = Math.ceil(durationHours / 24) || 1;

            let itemCost = 0;
            const rentAtTime = parseFloat(rentalItem.rentAtTime) || 0;

            if (rentalItem.rentType === 'hourly') {
                itemCost = durationHours * rentAtTime;
            } else {
                itemCost = durationDays * rentAtTime;
            }

            if (isNaN(itemCost)) itemCost = 0;

            totalRentalCost += itemCost;
            const itemDamageCost = parseFloat(rItem.damageCost) || 0;
            totalDamageCost += itemDamageCost;

            // Update Rental Item details
            rental.items[rentalItemIndex].returnCondition = rItem.returnCondition || 'good';
            rental.items[rentalItemIndex].damageCost = itemDamageCost;

            // Process Accessories
            if (rItem.accessories && rItem.accessories.length > 0 && rental.items[rentalItemIndex].accessories) {
                for (const accReturn of rItem.accessories) {
                    if (!accReturn.accessoryId) continue;
                    const accIndex = rental.items[rentalItemIndex].accessories.findIndex(a => a.accessoryId && a.accessoryId.toString() === accReturn.accessoryId.toString());
                    if (accIndex !== -1) {
                        rental.items[rentalItemIndex].accessories[accIndex].status = accReturn.status;
                        const accDamage = parseFloat(accReturn.damageCost) || 0;

                        if (accDamage > 0 || (accReturn.status !== 'with_item' && accReturn.status !== 'returned')) {
                            const accessory = await Accessory.findById(accReturn.accessoryId);
                            const price = accDamage > 0 ? accDamage : (accessory ? accessory.replacementCost : 0);

                            const finalAccPrice = parseFloat(price) || 0;
                            totalDamageCost += finalAccPrice;

                            billItems.push({
                                productId: accReturn.accessoryId,
                                name: `${accessory ? accessory.name : 'Accessory'} (Accessory)`,
                                quantity: 1,
                                price: finalAccPrice,
                                total: finalAccPrice
                            });
                        }
                    }
                }
            }

            // Update Rental Inventory Item status
            await RentalInventoryItem.findByIdAndUpdate(rItem.itemId, {
                status: 'available',
                condition: rItem.returnCondition || 'good',
                $push: {
                    history: {
                        action: 'returned',
                        details: `Returned from Rental ID: ${rental.rentalId}. Condition: ${rItem.returnCondition || 'good'}`,
                        performedBy: req.user ? req.user._id : null
                    }
                }
            });

            // Add to Bill Items
            let rentalProductId = inventoryItem.rentalProductId;
            if (!rentalProductId) {
                const fullInventoryItem = await RentalInventoryItem.findById(rItem.itemId);
                rentalProductId = fullInventoryItem ? fullInventoryItem.rentalProductId : null;
            }

            if (rentalProductId) {
                const product = await RentalProduct.findById(rentalProductId);
                const productName = product ? product.name : 'Unknown Product';

                billItems.push({
                    productId: rentalProductId,
                    name: `${productName} - ${inventoryItem.uniqueIdentifier} (Rental)`,
                    quantity: 1,
                    price: itemCost,
                    total: itemCost
                });
            }
        }

        // Calculate totals with percentage-based discount and tax
        const subtotal = (parseFloat(totalRentalCost) || 0) + (parseFloat(totalDamageCost) || 0);

        // Calculate discount amount from percentage
        const discPercent = parseFloat(discountPercent) || 0;
        const discountAmount = (subtotal * discPercent) / 100;

        // Calculate tax on amount after discount
        const taxPerc = parseFloat(taxPercent) || 0;
        const amountAfterDiscount = subtotal - discountAmount;
        const taxAmount = (amountAfterDiscount * taxPerc) / 100;

        const totalAmountBeforeOverride = amountAfterDiscount + taxAmount;

        const parsedCustomized = parseFloat(customizedTotalAmount);
        const hasOverride = (customizedTotalAmount !== undefined && customizedTotalAmount !== null && !isNaN(parsedCustomized));

        // Final calculations
        let finalTaxAmount = taxAmount;
        let finalTotalAmount = totalAmountBeforeOverride;

        if (hasOverride) {
            // Treatment: customizedTotalAmount is now treated as the BASE amount (Excl. Tax)
            const customBase = parsedCustomized;
            const taxRate = taxPerc / 100;
            finalTaxAmount = customBase * taxRate;
            finalTotalAmount = customBase + finalTaxAmount;
        }

        // Calculate payment amounts
        const paidDue = parseFloat(paidDueAmount) || 0;
        const currentAccessoriesPayment = parseFloat(rental.accessoriesPayment) || 0;
        const advancePayment = parseFloat(rental.advancePayment) || 0;

        const totalPaid = advancePayment + currentAccessoriesPayment + paidDue;
        const dueAmount = Math.max(0, finalTotalAmount - totalPaid);

        // Determine payment status
        let paymentStatus;
        if (dueAmount <= 0.01) { // Floating point tolerance
            paymentStatus = 'paid';
        } else if (paidDue > 0) {
            paymentStatus = 'partial';
        } else {
            paymentStatus = 'pending';
        }

        // Create Bill with robust fallbacks for required fields
        const bill = new Bill({
            type: 'rental',
            rentalDetails: {
                rentalId: rental._id,
                damageCost: totalDamageCost,
                rentalDuration: Math.ceil((now - rental.outTime) / (1000 * 60 * 60)) // Hours
            },
            customerId: rental.customer._id,
            customerName: rental.customer.name || 'Unknown Customer',
            customerEmail: rental.customer.email || 'no-email@provided.com', // Fallback for required field
            customerPhone: rental.customer.phone || '0000000000', // Fallback for required field
            items: billItems,
            subtotal: subtotal || 0,
            systemCalculatedAmount: totalAmountBeforeOverride,
            customizedAmount: finalTotalAmount,
            discountPercent: discPercent,
            discount: discountAmount || 0,
            taxPercent: taxPerc,
            taxAmount: finalTaxAmount || 0,
            totalAmount: finalTotalAmount || 0,
            paidAmount: totalPaid || 0,
            dueAmount: dueAmount || 0,
            paymentStatus,
            paymentMethod: paymentMethod || 'cash',
            createdBy: req.user ? req.user._id : rental.createdBy // Fallback to rental creator if req.user missing
        });

        await bill.save();

        // Update payment account balance
        if (paidDue > 0 && paymentAccountId) {
            const PaymentAccount = require('../models/PaymentAccount');
            const paymentAccount = await PaymentAccount.findById(paymentAccountId);

            if (paymentAccount && paymentAccount.status === 'active') {
                paymentAccount.currentBalance = (parseFloat(paymentAccount.currentBalance) || 0) + paidDue;
                await paymentAccount.save();

                bill.paymentHistory.push({
                    amount: paidDue,
                    paymentMethod: paymentMethod || 'cash',
                    paymentAccount: paymentAccountId,
                    paymentDate: new Date(),
                    notes: `Payment during rental return - ${rental.rentalId}`,
                    recordedBy: req.user ? req.user._id : rental.createdBy
                });
                await bill.save();
            }
        }

        // Update Rental
        rental.returnTime = now;
        rental.status = 'completed';
        rental.totalAmount = finalTotalAmount;
        rental.finalBill = bill._id;
        await rental.save();

        // Clear any pending notifications
        await handleRentalReturn(rental._id);

        res.status(200).json({ rental, bill });

    } catch (err) {
        console.error('ERROR IN returnRental:', err);
        res.status(500).json({
            message: 'Server error during return processing',
            error: err.message,
            details: err.name === 'ValidationError' ? err.errors : undefined
        });
    }
};

// Get Rental Stats (Dashboard)
exports.getRentalStats = async (req, res) => {
    try {
        const Bill = require('../models/Bill'); // Import Bill model
        const activeRentals = await Rental.countDocuments({ status: { $in: ['active', 'overdue'] } });
        const completedRentals = await Rental.countDocuments({ status: 'completed' });

        // Calculate total revenue from completed rentals
        const revenueResult = await Rental.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Calculate total missing profit from Bills of type rental
        const missingProfitResult = await Bill.aggregate([
            { $match: { type: 'rental' } },
            {
                $group: {
                    _id: null,
                    totalMissingProfit: {
                        $sum: { $subtract: ["$systemCalculatedAmount", "$customizedAmount"] }
                    }
                }
            }
        ]);
        const totalMissingProfit = missingProfitResult.length > 0 ? missingProfitResult[0].totalMissingProfit : 0;

        res.status(200).json({
            activeRentals,
            completedRentals,
            totalRevenue,
            totalMissingProfit
        });
    } catch (err) {
        console.error('Error in getRentalStats:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get Revenue Report (Monthly)
exports.getRevenueReport = async (req, res) => {
    try {
        const { year } = req.query;
        const currentYear = year ? parseInt(year) : new Date().getFullYear();

        const revenueData = await Rental.aggregate([
            {
                $match: {
                    status: 'completed',
                    returnTime: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lte: new Date(`${currentYear}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$returnTime" },
                    totalRevenue: { $sum: "$totalAmount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.status(200).json(revenueData);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get Most Rented Products
exports.getMostRentedProducts = async (req, res) => {
    try {
        const popularProducts = await Rental.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "rentalinventoryitems", // Changed from productitems
                    localField: "items.item",
                    foreignField: "_id",
                    as: "rentalItem"
                }
            },
            { $unwind: "$rentalItem" },
            {
                $group: {
                    _id: "$rentalItem.rentalProductId", // Group by the parent Rental Product ID
                    rentCount: { $sum: 1 },
                    totalRevenue: { $sum: "$items.rentAtTime" } // Approximation
                }
            },
            {
                $lookup: {
                    from: "rentalproducts", // Changed from products
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            { $sort: { rentCount: -1 } },
            { $limit: 10 },
            {
                $project: {
                    name: "$productDetails.name",
                    rentCount: 1,
                    totalRevenue: 1
                }
            }
        ]);

        res.status(200).json(popularProducts);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
