const Rental = require('../models/Rental');
const Bill = require('../models/Bill');
const RentalInventoryItem = require('../models/RentalInventoryItem');
const RentalCustomer = require('../models/RentalCustomer');
const RentalProduct = require('../models/RentalProduct');
const RentalCategory = require('../models/RentalCategory');
const Accessory = require('../models/Accessory');
const mongoose = require('mongoose');

// Helper function to parse date filters
const parseDateFilter = (startDate, endDate) => {
    const filter = {};
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    return filter;
};

// =============================================
// FINANCIAL REPORTS
// =============================================

// Revenue Report
exports.getRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day', category, customer } = req.query;

        const matchStage = {
            paymentStatus: { $in: ['paid', 'partial'] }
        };

        if (startDate || endDate) {
            matchStage.billDate = {};
            if (startDate) matchStage.billDate.$gte = new Date(startDate);
            if (endDate) matchStage.billDate.$lte = new Date(endDate);
        }

        if (customer) matchStage.customerId = mongoose.Types.ObjectId(customer);

        // Total revenue
        const totalRevenue = await Bill.aggregate([
            { $match: matchStage },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } }
        ]);

        // Revenue by period
        let dateGrouping;
        switch (groupBy) {
            case 'month':
                dateGrouping = { year: { $year: '$billDate' }, month: { $month: '$billDate' } };
                break;
            case 'week':
                dateGrouping = { year: { $year: '$billDate' }, week: { $week: '$billDate' } };
                break;
            default: // day
                dateGrouping = {
                    year: { $year: '$billDate' },
                    month: { $month: '$billDate' },
                    day: { $dayOfMonth: '$billDate' }
                };
        }

        const revenueByPeriod = await Bill.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: dateGrouping,
                    revenue: { $sum: '$paidAmount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        // Revenue by type (sale vs rental)
        const revenueByType = await Bill.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$type',
                    revenue: { $sum: '$paidAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Revenue by payment method
        const revenueByPaymentMethod = await Bill.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$paymentMethod',
                    revenue: { $sum: '$paidAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalRevenue: totalRevenue[0]?.total || 0,
                revenueByPeriod,
                revenueByType,
                revenueByPaymentMethod
            }
        });
    } catch (error) {
        console.error('Error generating revenue report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Transaction Report
exports.getTransactionReport = async (req, res) => {
    try {
        const { startDate, endDate, paymentStatus, paymentMethod, customer, page = 1, limit = 50 } = req.query;

        const filter = {};

        if (startDate || endDate) {
            filter.billDate = {};
            if (startDate) filter.billDate.$gte = new Date(startDate);
            if (endDate) filter.billDate.$lte = new Date(endDate);
        }

        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (paymentMethod) filter.paymentMethod = paymentMethod;
        if (customer) filter.customerId = mongoose.Types.ObjectId(customer);

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transactions = await Bill.find(filter)
            .populate('customerId', 'name email phone')
            .populate('rentalDetails.rentalId')
            .sort({ billDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Bill.countDocuments(filter);

        // Summary statistics
        const summary = await Bill.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$totalAmount' },
                    paidAmount: { $sum: '$paidAmount' },
                    dueAmount: { $sum: '$dueAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                summary: summary[0] || { totalAmount: 0, paidAmount: 0, dueAmount: 0, count: 0 }
            }
        });
    } catch (error) {
        console.error('Error generating transaction report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Outstanding Dues Report
exports.getOutstandingDuesReport = async (req, res) => {
    try {
        const { sortBy = 'dueAmount' } = req.query;

        const outstandingBills = await Bill.find({
            paymentStatus: { $in: ['pending', 'partial'] },
            dueAmount: { $gt: 0 }
        })
            .populate('customerId', 'name email phone address')
            .sort({ [sortBy]: -1 });

        // Group by customer
        const customerDues = await Bill.aggregate([
            {
                $match: {
                    paymentStatus: { $in: ['pending', 'partial'] },
                    dueAmount: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: '$customerId',
                    totalDue: { $sum: '$dueAmount' },
                    billCount: { $sum: 1 },
                    oldestBill: { $min: '$billDate' }
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            { $sort: { totalDue: -1 } }
        ]);

        // Aging analysis
        const now = new Date();
        const aging = {
            current: 0,      // 0-30 days
            days30: 0,       // 31-60 days
            days60: 0,       // 61-90 days
            days90Plus: 0    // 90+ days
        };

        outstandingBills.forEach(bill => {
            const daysDue = Math.floor((now - bill.billDate) / (1000 * 60 * 60 * 24));
            if (daysDue <= 30) aging.current += bill.dueAmount;
            else if (daysDue <= 60) aging.days30 += bill.dueAmount;
            else if (daysDue <= 90) aging.days60 += bill.dueAmount;
            else aging.days90Plus += bill.dueAmount;
        });

        const totalOutstanding = outstandingBills.reduce((sum, bill) => sum + bill.dueAmount, 0);

        res.json({
            success: true,
            data: {
                outstandingBills,
                customerDues,
                aging,
                summary: {
                    totalOutstanding,
                    billCount: outstandingBills.length,
                    customerCount: customerDues.length
                }
            }
        });
    } catch (error) {
        console.error('Error generating outstanding dues report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Payment Method Analysis
exports.getPaymentMethodAnalysis = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filter = { paymentStatus: { $in: ['paid', 'partial'] } };

        if (startDate || endDate) {
            filter.billDate = {};
            if (startDate) filter.billDate.$gte = new Date(startDate);
            if (endDate) filter.billDate.$lte = new Date(endDate);
        }

        const analysis = await Bill.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$paymentMethod',
                    totalAmount: { $sum: '$paidAmount' },
                    count: { $sum: 1 },
                    averageTransaction: { $avg: '$paidAmount' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error generating payment method analysis:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// RENTAL REPORTS
// =============================================

// Active Rentals Report
exports.getActiveRentalsReport = async (req, res) => {
    try {
        const activeRentals = await Rental.find({ status: 'active' })
            .populate('customer', 'name email phone')
            .populate('items.item')
            .populate('createdBy', 'name')
            .sort({ outTime: -1 });

        // Calculate expected revenue from active rentals
        let expectedRevenue = 0;
        activeRentals.forEach(rental => {
            expectedRevenue += rental.totalAmount;
        });

        res.json({
            success: true,
            data: {
                rentals: activeRentals,
                summary: {
                    totalActive: activeRentals.length,
                    totalItems: activeRentals.reduce((sum, r) => sum + r.items.length, 0),
                    expectedRevenue,
                    advanceCollected: activeRentals.reduce((sum, r) => sum + (r.advancePayment || 0), 0)
                }
            }
        });
    } catch (error) {
        console.error('Error generating active rentals report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Rental History Report
exports.getRentalHistoryReport = async (req, res) => {
    try {
        const { startDate, endDate, customer, status, page = 1, limit = 50 } = req.query;

        const filter = {};

        if (startDate || endDate) {
            filter.outTime = {};
            if (startDate) filter.outTime.$gte = new Date(startDate);
            if (endDate) filter.outTime.$lte = new Date(endDate);
        }

        if (customer) filter.customer = mongoose.Types.ObjectId(customer);
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const rentals = await Rental.find(filter)
            .populate('customer', 'name email phone')
            .populate('items.item')
            .populate('finalBill')
            .sort({ outTime: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Rental.countDocuments(filter);

        // Statistics
        const stats = await Rental.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalRentals: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    averageRental: { $avg: '$totalAmount' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                rentals,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                stats: stats[0] || { totalRentals: 0, totalRevenue: 0, averageRental: 0 }
            }
        });
    } catch (error) {
        console.error('Error generating rental history report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Overdue Rentals Report
exports.getOverdueRentalsReport = async (req, res) => {
    try {
        const now = new Date();

        const overdueRentals = await Rental.find({
            status: 'active',
            expectedReturnTime: { $lt: now }
        })
            .populate('customer', 'name email phone')
            .populate('items.item')
            .sort({ expectedReturnTime: 1 });

        // Calculate potential late fees
        let totalLateFees = 0;
        const rentalsWithFees = overdueRentals.map(rental => {
            const hoursOverdue = Math.floor((now - rental.expectedReturnTime) / (1000 * 60 * 60));
            const lateFee = hoursOverdue * 10; // Example: $10 per hour overdue
            totalLateFees += lateFee;

            return {
                ...rental.toObject(),
                hoursOverdue,
                estimatedLateFee: lateFee
            };
        });

        res.json({
            success: true,
            data: {
                overdueRentals: rentalsWithFees,
                summary: {
                    totalOverdue: overdueRentals.length,
                    estimatedLateFees: totalLateFees
                }
            }
        });
    } catch (error) {
        console.error('Error generating overdue rentals report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Booking Calendar Report
exports.getBookingCalendarReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default

        const bookings = await Rental.find({
            status: { $in: ['active'] },
            $or: [
                { outTime: { $gte: start, $lte: end } },
                { expectedReturnTime: { $gte: start, $lte: end } }
            ]
        })
            .populate('customer', 'name email phone')
            .populate('items.item')
            .sort({ outTime: 1 });

        res.json({
            success: true,
            data: {
                bookings,
                dateRange: { start, end }
            }
        });
    } catch (error) {
        console.error('Error generating booking calendar report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// INVENTORY REPORTS
// =============================================

// Inventory Status Report
exports.getInventoryStatusReport = async (req, res) => {
    try {
        const { category, status } = req.query;

        const filter = {};
        if (status) filter.status = status;

        const items = await RentalInventoryItem.find(filter)
            .populate('rentalProductId')
            .populate('inwardId')
            .sort({ status: 1, uniqueIdentifier: 1 });

        // Status distribution
        const statusDistribution = await RentalInventoryItem.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Condition distribution
        const conditionDistribution = await RentalInventoryItem.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$condition',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                items,
                statusDistribution,
                conditionDistribution,
                summary: {
                    total: items.length,
                    available: items.filter(i => i.status === 'available').length,
                    rented: items.filter(i => i.status === 'rented').length,
                    maintenance: items.filter(i => i.status === 'maintenance').length
                }
            }
        });
    } catch (error) {
        console.error('Error generating inventory status report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Item Utilization Report
exports.getItemUtilizationReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.outTime = {};
            if (startDate) dateFilter.outTime.$gte = new Date(startDate);
            if (endDate) dateFilter.outTime.$lte = new Date(endDate);
        }

        // Most rented items
        const mostRented = await Rental.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.item',
                    rentalCount: { $sum: 1 },
                    totalRevenue: { $sum: '$items.rentAtTime' }
                }
            },
            {
                $lookup: {
                    from: 'rentalinventoryitems',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'itemDetails'
                }
            },
            { $unwind: '$itemDetails' },
            {
                $lookup: {
                    from: 'rentalproducts',
                    localField: 'itemDetails.rentalProductId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $sort: { rentalCount: -1 } },
            { $limit: 20 }
        ]);

        // Utilization by product type
        const utilizationByProduct = await Rental.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'rentalinventoryitems',
                    localField: 'items.item',
                    foreignField: '_id',
                    as: 'itemDetails'
                }
            },
            { $unwind: '$itemDetails' },
            {
                $group: {
                    _id: '$itemDetails.rentalProductId',
                    rentalCount: { $sum: 1 },
                    totalRevenue: { $sum: '$items.rentAtTime' }
                }
            },
            {
                $lookup: {
                    from: 'rentalproducts',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $sort: { rentalCount: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                mostRented,
                utilizationByProduct
            }
        });
    } catch (error) {
        console.error('Error generating item utilization report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Maintenance Report
exports.getMaintenanceReport = async (req, res) => {
    try {
        const itemsInMaintenance = await RentalInventoryItem.find({
            status: 'maintenance'
        })
            .populate('rentalProductId')
            .sort({ updatedAt: -1 });

        // Maintenance history from item history
        const maintenanceHistory = await RentalInventoryItem.aggregate([
            { $unwind: '$history' },
            {
                $match: {
                    'history.action': { $in: ['maintenance_start', 'maintenance_end'] }
                }
            },
            { $sort: { 'history.date': -1 } },
            { $limit: 100 }
        ]);

        res.json({
            success: true,
            data: {
                currentMaintenance: itemsInMaintenance,
                history: maintenanceHistory,
                summary: {
                    inMaintenance: itemsInMaintenance.length
                }
            }
        });
    } catch (error) {
        console.error('Error generating maintenance report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Damage & Loss Report
exports.getDamageLossReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filter = {};
        if (startDate || endDate) {
            filter.returnTime = {};
            if (startDate) filter.returnTime.$gte = new Date(startDate);
            if (endDate) filter.returnTime.$lte = new Date(endDate);
        }

        // Find rentals with damaged or missing items
        const damagedRentals = await Rental.find({
            ...filter,
            'items.returnCondition': { $in: ['damaged', 'missing'] }
        })
            .populate('customer', 'name email phone')
            .populate('items.item')
            .sort({ returnTime: -1 });

        // Calculate total damage costs
        let totalDamageCost = 0;
        const damageDetails = [];

        damagedRentals.forEach(rental => {
            rental.items.forEach(item => {
                if (item.returnCondition === 'damaged' || item.returnCondition === 'missing') {
                    totalDamageCost += item.damageCost || 0;
                    damageDetails.push({
                        rentalId: rental.rentalId,
                        customer: rental.customer,
                        item: item.item,
                        condition: item.returnCondition,
                        cost: item.damageCost || 0,
                        returnTime: rental.returnTime
                    });
                }
            });
        });

        // Items currently marked as missing or damaged
        const damagedItems = await RentalInventoryItem.find({
            $or: [
                { status: 'missing' },
                { condition: 'damaged' }
            ]
        }).populate('rentalProductId');

        res.json({
            success: true,
            data: {
                damagedRentals,
                damageDetails,
                damagedItems,
                summary: {
                    totalIncidents: damageDetails.length,
                    totalCost: totalDamageCost,
                    currentDamaged: damagedItems.filter(i => i.condition === 'damaged').length,
                    currentMissing: damagedItems.filter(i => i.status === 'missing').length
                }
            }
        });
    } catch (error) {
        console.error('Error generating damage/loss report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// CUSTOMER REPORTS
// =============================================

// Customer List Report
exports.getCustomerListReport = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;

        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const customers = await RentalCustomer.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await RentalCustomer.countDocuments(filter);

        res.json({
            success: true,
            data: {
                customers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error generating customer list report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Customer Activity Report
exports.getCustomerActivityReport = async (req, res) => {
    try {
        const { customerId, startDate, endDate } = req.query;

        const filter = {};
        if (customerId) filter.customer = mongoose.Types.ObjectId(customerId);
        if (startDate || endDate) {
            filter.outTime = {};
            if (startDate) filter.outTime.$gte = new Date(startDate);
            if (endDate) filter.outTime.$lte = new Date(endDate);
        }

        const customerActivity = await Rental.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'bills',
                    localField: 'finalBill',
                    foreignField: '_id',
                    as: 'bill'
                }
            },
            { $unwind: { path: '$bill', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$customer',
                    rentalCount: { $sum: 1 },
                    totalSpent: { $sum: '$totalAmount' },
                    averageRental: { $avg: '$totalAmount' },
                    missingProfit: {
                        $sum: {
                            $subtract: [
                                { $ifNull: ["$bill.systemCalculatedAmount", "$totalAmount"] },
                                { $ifNull: ["$bill.customizedAmount", "$totalAmount"] }
                            ]
                        }
                    },
                    lastRental: { $max: '$outTime' }
                }
            },
            {
                $lookup: {
                    from: 'rentalcustomers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            { $sort: { totalSpent: -1 } }
        ]);

        res.json({
            success: true,
            data: customerActivity
        });
    } catch (error) {
        console.error('Error generating customer activity report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Top Customers Report
exports.getTopCustomersReport = async (req, res) => {
    try {
        const { limit = 20, metric = 'revenue' } = req.query;

        let sortField;
        switch (metric) {
            case 'frequency':
                sortField = 'rentalCount';
                break;
            case 'revenue':
            default:
                sortField = 'totalSpent';
        }

        const topCustomers = await Rental.aggregate([
            {
                $group: {
                    _id: '$customer',
                    rentalCount: { $sum: 1 },
                    totalSpent: { $sum: '$totalAmount' },
                    averageSpent: { $avg: '$totalAmount' },
                    lastRental: { $max: '$outTime' }
                }
            },
            {
                $lookup: {
                    from: 'rentalcustomers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            { $sort: { [sortField]: -1 } },
            { $limit: parseInt(limit) }
        ]);

        res.json({
            success: true,
            data: topCustomers
        });
    } catch (error) {
        console.error('Error generating top customers report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// ANALYTICS REPORTS
// =============================================

// Performance Dashboard
exports.getPerformanceDashboard = async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Total revenue
        const revenue = await Bill.aggregate([
            {
                $match: {
                    billDate: { $gte: startDate },
                    paymentStatus: { $in: ['paid', 'partial'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$paidAmount' }
                }
            }
        ]);

        // Active rentals
        const activeRentals = await Rental.countDocuments({ status: 'active' });

        // Total customers
        const totalCustomers = await RentalCustomer.countDocuments();

        // Items available
        const availableItems = await RentalInventoryItem.countDocuments({ status: 'available' });

        // Items rented
        const rentedItems = await RentalInventoryItem.countDocuments({ status: 'rented' });

        // Total rentals this period
        const totalRentals = await Rental.countDocuments({
            outTime: { $gte: startDate }
        });

        // Outstanding dues
        const outstandingDues = await Bill.aggregate([
            {
                $match: {
                    paymentStatus: { $in: ['pending', 'partial'] },
                    dueAmount: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$dueAmount' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                kpis: {
                    totalRevenue: revenue[0]?.total || 0,
                    activeRentals,
                    totalCustomers,
                    availableItems,
                    rentedItems,
                    totalRentals,
                    outstandingDues: outstandingDues[0]?.total || 0
                },
                period
            }
        });
    } catch (error) {
        console.error('Error generating performance dashboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Seasonal Trends Report
exports.getSeasonalTrendsReport = async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const trends = await Rental.aggregate([
            {
                $match: {
                    outTime: {
                        $gte: new Date(targetYear, 0, 1),
                        $lt: new Date(targetYear + 1, 0, 1)
                    }
                }
            },
            {
                $group: {
                    _id: { month: { $month: '$outTime' } },
                    rentalCount: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    averageRevenue: { $avg: '$totalAmount' }
                }
            },
            { $sort: { '_id.month': 1 } }
        ]);

        res.json({
            success: true,
            data: {
                year: targetYear,
                trends
            }
        });
    } catch (error) {
        console.error('Error generating seasonal trends report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Category Performance Report
exports.getCategoryPerformanceReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.outTime = {};
            if (startDate) dateFilter.outTime.$gte = new Date(startDate);
            if (endDate) dateFilter.outTime.$lte = new Date(endDate);
        }

        const categoryPerformance = await Rental.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'rentalinventoryitems',
                    localField: 'items.item',
                    foreignField: '_id',
                    as: 'itemDetails'
                }
            },
            { $unwind: '$itemDetails' },
            {
                $lookup: {
                    from: 'rentalproducts',
                    localField: 'itemDetails.rentalProductId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'rentalcategories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$category._id',
                    categoryName: { $first: '$category.name' },
                    rentalCount: { $sum: 1 },
                    totalRevenue: { $sum: '$items.rentAtTime' }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.json({
            success: true,
            data: categoryPerformance
        });
    } catch (error) {
        console.error('Error generating category performance report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Accessory Performance Report
exports.getAccessoryPerformanceReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.outTime = {};
            if (startDate) dateFilter.outTime.$gte = new Date(startDate);
            if (endDate) dateFilter.outTime.$lte = new Date(endDate);
        }

        const accessoryPerformance = await Rental.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            { $unwind: '$items.accessories' },
            {
                $group: {
                    _id: '$items.accessories.accessoryId',
                    accessoryName: { $first: '$items.accessories.name' },
                    rentalCount: { $sum: 1 },
                    missingCount: {
                        $sum: {
                            $cond: [{ $eq: ['$items.accessories.status', 'missing'] }, 1, 0]
                        }
                    },
                    damagedCount: {
                        $sum: {
                            $cond: [{ $eq: ['$items.accessories.status', 'damaged'] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { rentalCount: -1 } }
        ]);

        res.json({
            success: true,
            data: accessoryPerformance
        });
    } catch (error) {
        console.error('Error generating accessory performance report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
