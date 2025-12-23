const Rental = require('../models/Rental');

/**
 * Get detailed rental notifications for dashboard
 * Returns rentals that are due for return or overdue with full details
 */
exports.getRentalNotifications = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        // Find active rentals that are due within 3 days or overdue
        const rentals = await Rental.find({
            status: { $in: ['active', 'overdue'] },
            expectedReturnTime: { $exists: true, $ne: null }
        })
            .populate('customer', 'name phone email')
            .populate({
                path: 'items.item',
                populate: {
                    path: 'rentalProductId',
                    select: 'name'
                }
            })
            .lean();

        // Filter and enhance rentals with time calculations
        const notifications = rentals
            .map(rental => {
                const expectedReturn = new Date(rental.expectedReturnTime);
                const expectedReturnDate = new Date(
                    expectedReturn.getFullYear(),
                    expectedReturn.getMonth(),
                    expectedReturn.getDate()
                );

                const timeDiff = expectedReturnDate.getTime() - today.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                // Only include if overdue or due within 3 days
                if (daysDiff > 3) return null;

                // Calculate urgency level
                let urgency = 'normal';
                let urgencyScore = 0;
                if (daysDiff < 0) {
                    urgency = 'overdue';
                    urgencyScore = Math.abs(daysDiff) + 1000; // Higher score for overdue
                } else if (daysDiff === 0) {
                    urgency = 'due-today';
                    urgencyScore = 100;
                } else if (daysDiff <= 3) {
                    urgency = 'due-soon';
                    urgencyScore = 10 - daysDiff;
                }

                // Format rental items
                const rentalItems = rental.items.map(item => ({
                    productName: item.item?.rentalProductId?.name || 'Unknown Product',
                    rentType: item.rentType,
                    condition: item.returnCondition || 'good'
                }));

                return {
                    _id: rental._id,
                    rentalId: rental.rentalId,
                    customer: {
                        _id: rental.customer?._id,
                        name: rental.customer?.name || 'Unknown Customer',
                        phone: rental.customer?.phone,
                        email: rental.customer?.email
                    },
                    items: rentalItems,
                    itemCount: rental.items.length,
                    outTime: rental.outTime,
                    expectedReturnTime: rental.expectedReturnTime,
                    status: rental.status,
                    urgency,
                    urgencyScore,
                    daysUntilDue: daysDiff,
                    isOverdue: daysDiff < 0,
                    overdueDays: daysDiff < 0 ? Math.abs(daysDiff) : 0
                };
            })
            .filter(notification => notification !== null)
            .sort((a, b) => b.urgencyScore - a.urgencyScore); // Sort by urgency

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (err) {
        console.error('Error fetching rental notifications:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};
