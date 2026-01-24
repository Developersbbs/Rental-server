const ServiceRecord = require('../models/ServiceRecord');
const RentalInventoryItem = require('../models/RentalInventoryItem');
const RentalProduct = require('../models/RentalProduct');
const { updateProductServiceDates } = require('../utils/serviceAlertUtils');

// Helper function to calculate health score
const calculateHealthScore = (item, condition) => {
    let score = 100;

    // Deduct based on service count (more services = lower score)
    score -= Math.min(item.serviceCount * 2, 30);

    // Deduct based on condition
    const conditionPenalty = {
        'new': 0,
        'good': 5,
        'fair': 20,
        'poor': 40,
        'damaged': 60
    };
    score -= conditionPenalty[condition] || 0;

    // Bonus if recently serviced (within 30 days)
    if (item.lastServiceDate) {
        const daysSinceService = (Date.now() - new Date(item.lastServiceDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceService < 30) {
            score += 10;
        }
    }

    return Math.max(0, Math.min(100, score));
};

// Create service record
exports.createServiceRecord = async (req, res) => {
    try {
        const {
            inventoryItemId,
            serviceType,
            serviceDate,
            description,
            issuesFound,
            partsReplaced,
            laborCost,
            technician,
            technicianName,
            nextServiceDue,
            severity,
            serviceStatus,
            beforeCondition,
            afterCondition,
            downtimeHours,
            attachments,
            notes
        } = req.body;

        // Validate inventory item exists
        const item = await RentalInventoryItem.findById(inventoryItemId);
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        // Create service record
        const serviceRecord = new ServiceRecord({
            inventoryItemId,
            serviceType,
            serviceDate: serviceDate || Date.now(),
            description,
            issuesFound: issuesFound || [],
            partsReplaced: partsReplaced || [],
            laborCost: laborCost || 0,
            technician,
            technicianName,
            nextServiceDue,
            severity: severity || 'low',
            serviceStatus: serviceStatus || 'completed',
            beforeCondition,
            afterCondition,
            downtimeHours: downtimeHours || 0,
            attachments: attachments || [],
            notes,
            createdBy: req.user._id
        });

        await serviceRecord.save();

        // Update inventory item
        item.lastServiceDate = serviceDate || Date.now();
        if (nextServiceDue) {
            item.nextServiceDue = nextServiceDue;
        }
        item.totalServiceCost += serviceRecord.totalCost;
        item.serviceCount += 1;
        item.condition = afterCondition;
        item.healthScore = calculateHealthScore(item, afterCondition);

        // Update status based on service status
        if (serviceStatus === 'in_progress' || serviceStatus === 'scheduled') {
            item.status = 'maintenance';
        } else if (serviceStatus === 'completed') {
            item.status = 'available'; // Assume available if maintenance done. 
            // Ideally we check if other maintenance is pending, but for now this is the requirement.
        }

        // Add to history
        item.history.push({
            action: serviceType === 'preventive' ? 'maintenance_start' : 'maintenance_start',
            date: serviceDate || Date.now(),
            details: `${serviceType} service ${serviceStatus}: ${description}`,
            performedBy: req.user._id
        });

        await item.save();

        // Update product-level service dates if service is completed
        if (serviceStatus === 'completed' && item.rentalProductId) {
            try {
                await updateProductServiceDates(
                    item.rentalProductId,
                    serviceDate || Date.now()
                );
            } catch (productUpdateErr) {
                console.error('Error updating product service dates:', productUpdateErr);
                // Don't fail the whole operation if product update fails
            }
        }

        // Populate and return
        await serviceRecord.populate('inventoryItemId technician createdBy');

        res.status(201).json({
            message: 'Service record created successfully',
            serviceRecord
        });

    } catch (err) {
        console.error('Error creating service record:', err);
        res.status(500).json({
            message: 'Failed to create service record',
            error: err.message
        });
    }
};

// Get all service records with filters
exports.getServiceRecords = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            serviceType,
            serviceStatus,
            severity,
            startDate,
            endDate,
            inventoryItemId,
            technician
        } = req.query;

        const query = {};

        // Apply filters
        if (serviceType) query.serviceType = serviceType;
        if (serviceStatus) query.serviceStatus = serviceStatus;
        if (severity) query.severity = severity;
        if (inventoryItemId) query.inventoryItemId = inventoryItemId;
        if (technician) query.technician = technician;

        // Date range filter
        if (startDate || endDate) {
            query.serviceDate = {};
            if (startDate) query.serviceDate.$gte = new Date(startDate);
            if (endDate) query.serviceDate.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
            ServiceRecord.find(query)
                .populate('inventoryItemId', 'uniqueIdentifier rentalProductId status condition')
                .populate({
                    path: 'inventoryItemId',
                    populate: { path: 'rentalProductId', select: 'name' }
                })
                .populate('technician', 'name email')
                .populate('createdBy', 'name email')
                .sort({ serviceDate: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            ServiceRecord.countDocuments(query)
        ]);

        res.status(200).json({
            records,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });

    } catch (err) {
        console.error('Error fetching service records:', err);
        res.status(500).json({
            message: 'Failed to fetch service records',
            error: err.message
        });
    }
};

// Get service record by ID
exports.getServiceRecordById = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await ServiceRecord.findById(id)
            .populate('inventoryItemId')
            .populate({
                path: 'inventoryItemId',
                populate: { path: 'rentalProductId' }
            })
            .populate('technician', 'name email phone')
            .populate('createdBy', 'name email');

        if (!record) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        res.status(200).json({ record });

    } catch (err) {
        console.error('Error fetching service record:', err);
        res.status(500).json({
            message: 'Failed to fetch service record',
            error: err.message
        });
    }
};

// Update service record
exports.updateServiceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const record = await ServiceRecord.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('inventoryItemId technician createdBy');

        // Sync item status on update
        if (updateData.serviceStatus && record.inventoryItemId) {
            const item = await RentalInventoryItem.findById(record.inventoryItemId._id || record.inventoryItemId);
            if (item) {
                if (updateData.serviceStatus === 'in_progress' || updateData.serviceStatus === 'scheduled') {
                    item.status = 'maintenance';
                } else if (updateData.serviceStatus === 'completed') {
                    item.status = 'available';
                }
                await item.save();
            }
        }

        if (!record) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        res.status(200).json({
            message: 'Service record updated successfully',
            record
        });

    } catch (err) {
        console.error('Error updating service record:', err);
        res.status(500).json({
            message: 'Failed to update service record',
            error: err.message
        });
    }
};

// Delete service record
exports.deleteServiceRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await ServiceRecord.findByIdAndDelete(id);

        if (!record) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        res.status(200).json({
            message: 'Service record deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting service record:', err);
        res.status(500).json({
            message: 'Failed to delete service record',
            error: err.message
        });
    }
};

// Get service history for specific item
exports.getItemServiceHistory = async (req, res) => {
    try {
        const { itemId } = req.params;

        const records = await ServiceRecord.find({ inventoryItemId: itemId })
            .populate('technician', 'name email')
            .populate('createdBy', 'name email')
            .sort({ serviceDate: -1 });

        const item = await RentalInventoryItem.findById(itemId)
            .populate('rentalProductId');

        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        res.status(200).json({
            item: {
                _id: item._id,
                uniqueIdentifier: item.uniqueIdentifier,
                product: item.rentalProductId,
                condition: item.condition,
                healthScore: item.healthScore,
                totalServiceCost: item.totalServiceCost,
                serviceCount: item.serviceCount,
                lastServiceDate: item.lastServiceDate,
                nextServiceDue: item.nextServiceDue
            },
            serviceHistory: records
        });

    } catch (err) {
        console.error('Error fetching service history:', err);
        res.status(500).json({
            message: 'Failed to fetch service history',
            error: err.message
        });
    }
};

// Get service analytics
exports.getServiceAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.serviceDate = {};
            if (startDate) dateFilter.serviceDate.$gte = new Date(startDate);
            if (endDate) dateFilter.serviceDate.$lte = new Date(endDate);
        }

        // Total statistics
        const [totalRecords, totalCost, serviceTypeBreakdown, severityBreakdown] = await Promise.all([
            ServiceRecord.countDocuments(dateFilter),
            ServiceRecord.aggregate([
                { $match: dateFilter },
                { $group: { _id: null, total: { $sum: '$totalCost' } } }
            ]),
            ServiceRecord.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$serviceType', count: { $sum: 1 }, totalCost: { $sum: '$totalCost' } } }
            ]),
            ServiceRecord.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ])
        ]);

        // Most serviced items
        const mostServicedItems = await ServiceRecord.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$inventoryItemId', count: { $sum: 1 }, totalCost: { $sum: '$totalCost' } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Populate item details
        for (let item of mostServicedItems) {
            const inventoryItem = await RentalInventoryItem.findById(item._id)
                .populate('rentalProductId', 'name');
            item.item = inventoryItem;
        }

        // Average cost per service type
        const avgCostByType = await ServiceRecord.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$serviceType', avgCost: { $avg: '$totalCost' }, count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            totalRecords,
            totalCost: totalCost[0]?.total || 0,
            averageCost: totalRecords > 0 ? (totalCost[0]?.total || 0) / totalRecords : 0,
            serviceTypeBreakdown,
            severityBreakdown,
            mostServicedItems,
            avgCostByType
        });

    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({
            message: 'Failed to fetch analytics',
            error: err.message
        });
    }
};

// Get upcoming maintenance
exports.getUpcomingMaintenance = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(days));

        const items = await RentalInventoryItem.find({
            nextServiceDue: {
                $gte: new Date(),
                $lte: futureDate
            }
        })
            .populate('rentalProductId', 'name category')
            .sort({ nextServiceDue: 1 });

        // Also get overdue items
        const overdueItems = await RentalInventoryItem.find({
            nextServiceDue: {
                $lt: new Date()
            }
        })
            .populate('rentalProductId', 'name category')
            .sort({ nextServiceDue: 1 });

        res.status(200).json({
            upcoming: items,
            overdue: overdueItems
        });

    } catch (err) {
        console.error('Error fetching upcoming maintenance:', err);
        res.status(500).json({
            message: 'Failed to fetch upcoming maintenance',
            error: err.message
        });
    }
};

// Get cost analysis
exports.getCostAnalysis = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'month' } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.serviceDate = {};
            if (startDate) dateFilter.serviceDate.$gte = new Date(startDate);
            if (endDate) dateFilter.serviceDate.$lte = new Date(endDate);
        }

        // Group by time period
        let groupByFormat;
        if (groupBy === 'day') {
            groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$serviceDate' } };
        } else if (groupBy === 'week') {
            groupByFormat = { $dateToString: { format: '%Y-W%V', date: '$serviceDate' } };
        } else {
            groupByFormat = { $dateToString: { format: '%Y-%m', date: '$serviceDate' } };
        }

        const costOverTime = await ServiceRecord.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: groupByFormat,
                    totalCost: { $sum: '$totalCost' },
                    laborCost: { $sum: '$laborCost' },
                    partsCost: { $sum: { $sum: { $map: { input: '$partsReplaced', as: 'part', in: { $multiply: ['$$part.partCost', '$$part.quantity'] } } } } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Labor vs Parts breakdown
        const costBreakdown = await ServiceRecord.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalLabor: { $sum: '$laborCost' },
                    totalParts: { $sum: { $sum: { $map: { input: '$partsReplaced', as: 'part', in: { $multiply: ['$$part.partCost', '$$part.quantity'] } } } } }
                }
            }
        ]);

        res.status(200).json({
            costOverTime,
            costBreakdown: costBreakdown[0] || { totalLabor: 0, totalParts: 0 }
        });

    } catch (err) {
        console.error('Error fetching cost analysis:', err);
        res.status(500).json({
            message: 'Failed to fetch cost analysis',
            error: err.message
        });
    }
};
