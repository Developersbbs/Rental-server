const { checkRentalReturns } = require('./rentalNotifications');

/**
 * Initialize the rental return check scheduler
 * Runs every hour to check for due/overdue rentals
 */
function initializeRentalScheduler() {
    // Run immediately on startup
    checkRentalReturns();

    // Run every hour (3600000 milliseconds)
    const intervalId = setInterval(() => {
        checkRentalReturns();
    }, 3600000); // 1 hour

    console.log('[Rental Scheduler] Rental return check scheduler initialized (runs every hour)');

    return intervalId;
}

module.exports = {
    initializeRentalScheduler
};
