const RentalProduct = require('../models/RentalProduct');
const ServiceAlert = require('../models/ServiceAlert');

/**
 * Calculate next service due date based on last service date and interval
 * @param {Date} lastServiceDate - Date of last service
 * @param {Number} intervalDays - Number of days between services
 * @returns {Date} Next service due date
 */
const calculateNextServiceDate = (lastServiceDate, intervalDays) => {
    if (!lastServiceDate || !intervalDays) return null;

    const nextDate = new Date(lastServiceDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);
    return nextDate;
};

/**
 * Determine alert severity based on due date
 * @param {Date} dueDate - Service due date
 * @param {Number} alertDays - Days before due to show alert
 * @returns {String} Severity level: 'info', 'warning', or 'critical'
 */
const getAlertSeverity = (dueDate, alertDays = 7) => {
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
        return 'critical'; // Overdue
    } else if (daysUntilDue <= 3) {
        return 'critical'; // Due very soon
    } else if (daysUntilDue <= alertDays) {
        return 'warning'; // Due soon
    } else {
        return 'info'; // Upcoming
    }
};

/**
 * Check if a product needs service alert
 * @param {Object} product - RentalProduct document
 * @returns {Boolean} True if alert should be created
 */
const needsServiceAlert = (product) => {
    if (!product.serviceInterval || !product.nextServiceDue) {
        return false;
    }

    const now = new Date();
    const alertDate = new Date(product.nextServiceDue);
    alertDate.setDate(alertDate.getDate() - (product.serviceAlertDays || 7));

    return now >= alertDate;
};

/**
 * Generate service alerts for products due for service
 * This should be run periodically (e.g., daily via cron job)
 */
const generateServiceAlerts = async () => {
    try {
        const now = new Date();

        // Find all active rental products with service intervals
        const products = await RentalProduct.find({
            status: 'active',
            serviceInterval: { $ne: null, $gt: 0 },
            nextServiceDue: { $ne: null }
        });

        for (const product of products) {
            // Check if alert already exists for this product
            const existingAlert = await ServiceAlert.findOne({
                rentalProduct: product._id,
                status: { $in: ['pending', 'acknowledged'] }
            });

            if (!existingAlert && needsServiceAlert(product)) {
                const severity = getAlertSeverity(product.nextServiceDue, product.serviceAlertDays);

                await ServiceAlert.create({
                    rentalProduct: product._id,
                    alertDate: now,
                    dueDate: product.nextServiceDue,
                    severity,
                    status: 'pending'
                });

                console.log(`Created service alert for product: ${product.name}`);
            }
        }

        console.log('Service alert generation completed');
    } catch (error) {
        console.error('Error generating service alerts:', error);
        throw error;
    }
};

/**
 * Update product service dates after service completion
 * @param {String} productId - RentalProduct ID
 * @param {Date} serviceDate - Date service was completed
 */
const updateProductServiceDates = async (productId, serviceDate) => {
    try {
        const product = await RentalProduct.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        product.lastServiceDate = serviceDate;

        if (product.serviceInterval) {
            product.nextServiceDue = calculateNextServiceDate(serviceDate, product.serviceInterval);
        }

        await product.save();

        // Mark any pending alerts for this product as completed
        await ServiceAlert.updateMany(
            {
                rentalProduct: productId,
                status: { $in: ['pending', 'acknowledged'] }
            },
            {
                status: 'completed'
            }
        );

        return product;
    } catch (error) {
        console.error('Error updating product service dates:', error);
        throw error;
    }
};

module.exports = {
    calculateNextServiceDate,
    getAlertSeverity,
    needsServiceAlert,
    generateServiceAlerts,
    updateProductServiceDates
};
