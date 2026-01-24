const Notification = require('../models/Notification');
const Rental = require('../models/Rental');

/**
 * Upsert a rental notification (create or update existing unread notification)
 */
async function upsertRentalNotification(filter, update) {
    return Notification.findOneAndUpdate(
        filter,
        {
            ...update,
            isRead: false,
            createdAt: new Date()
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );
}

/**
 * Clear rental notifications for a specific rental
 */
async function clearRentalNotifications(rentalId, types) {
    return Notification.deleteMany({
        rentalId,
        type: { $in: Array.isArray(types) ? types : [types] },
        isRead: false
    });
}

/**
 * Check for rentals that are due or overdue and create notifications
 */
async function checkRentalReturns() {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find all active rentals with expected return dates
        const rentals = await Rental.find({
            status: { $in: ['active', 'overdue'] },
            expectedReturnTime: { $exists: true, $ne: null }
        }).populate('customer', 'name phone');

        for (const rental of rentals) {
            const expectedReturn = new Date(rental.expectedReturnTime);
            const expectedReturnDate = new Date(
                expectedReturn.getFullYear(),
                expectedReturn.getMonth(),
                expectedReturn.getDate()
            );

            // Check if rental is overdue
            if (expectedReturnDate < today) {
                // Update rental status to overdue if not already
                if (rental.status !== 'overdue') {
                    rental.status = 'overdue';
                    await rental.save();
                }

                // Create/update overdue notification
                await upsertRentalNotification(
                    { rentalId: rental._id, type: 'rental-overdue', isRead: false },
                    {
                        message: `Rental ${rental.rentalId} is overdue! Customer: ${rental.customer.name}`,
                        rentalId: rental._id,
                        type: 'rental-overdue'
                    }
                );

                // Clear any "due" notifications
                await clearRentalNotifications(rental._id, 'rental-due');
            }
            // Check if rental is due today
            else if (expectedReturnDate.getTime() === today.getTime()) {
                // Create/update due notification
                await upsertRentalNotification(
                    { rentalId: rental._id, type: 'rental-due', isRead: false },
                    {
                        message: `Rental ${rental.rentalId} is due for return today! Customer: ${rental.customer.name}`,
                        rentalId: rental._id,
                        type: 'rental-due'
                    }
                );
            }
            // Check if rental is due tomorrow
            else if (expectedReturnDate.getTime() === tomorrow.getTime()) {
                // Create/update due tomorrow notification
                await upsertRentalNotification(
                    { rentalId: rental._id, type: 'rental-due-tomorrow', isRead: false },
                    {
                        message: `Rental ${rental.rentalId} is due for return tomorrow! Customer: ${rental.customer.name}`,
                        rentalId: rental._id,
                        type: 'rental-due-tomorrow'
                    }
                );
            }
        }

        console.log(`[Rental Check] Checked ${rentals.length} active rentals at ${now.toISOString()}`);
    } catch (error) {
        console.error('[Rental Check] Error checking rental returns:', error);
    }
}

/**
 * Handle rental return - clear all notifications for the rental
 */
async function handleRentalReturn(rentalId) {
    try {
        await clearRentalNotifications(rentalId, ['rental-due', 'rental-overdue', 'rental-due-tomorrow']);
        console.log(`[Rental Check] Cleared notifications for rental ${rentalId}`);
    } catch (error) {
        console.error('[Rental Check] Error clearing rental notifications:', error);
    }
}

module.exports = {
    checkRentalReturns,
    handleRentalReturn,
    clearRentalNotifications
};
