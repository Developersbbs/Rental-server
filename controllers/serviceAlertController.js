const ServiceAlert = require('../models/ServiceAlert');
const RentalProduct = require('../models/RentalProduct');
const { getAlertSeverity } = require('../utils/serviceAlertUtils');

// @desc    Get all service alerts
// @route   GET /api/service-alerts
// @access  Private
exports.getServiceAlerts = async (req, res) => {
    try {
        const { status, severity, startDate, endDate } = req.query;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (severity) {
            filter.severity = severity;
        }

        if (startDate && endDate) {
            filter.dueDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const alerts = await ServiceAlert.find(filter)
            .populate('rentalProduct', 'name category images')
            .populate('acknowledgedBy', 'username')
            .sort({ dueDate: 1, severity: -1 });

        res.status(200).json({
            success: true,
            count: alerts.length,
            alerts
        });
    } catch (error) {
        console.error('Error fetching service alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get dashboard service alerts (active/critical only)
// @route   GET /api/service-alerts/dashboard
// @access  Private
exports.getDashboardAlerts = async (req, res) => {
    try {
        const alerts = await ServiceAlert.find({
            status: { $in: ['pending', 'acknowledged'] }
        })
            .populate('rentalProduct', 'name category images serviceInterval')
            .sort({ severity: -1, dueDate: 1 })
            .limit(10);

        // Calculate stats
        const stats = {
            total: alerts.length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            warning: alerts.filter(a => a.severity === 'warning').length,
            info: alerts.filter(a => a.severity === 'info').length
        };

        res.status(200).json({
            success: true,
            stats,
            alerts
        });
    } catch (error) {
        console.error('Error fetching dashboard alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Acknowledge a service alert
// @route   PUT /api/service-alerts/:id/acknowledge
// @access  Private
exports.acknowledgeAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const alert = await ServiceAlert.findById(id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Service alert not found'
            });
        }

        alert.status = 'acknowledged';
        alert.acknowledgedBy = req.user._id;
        alert.acknowledgedAt = new Date();

        if (notes) {
            alert.notes = notes;
        }

        await alert.save();

        await alert.populate('rentalProduct', 'name');

        res.status(200).json({
            success: true,
            message: 'Alert acknowledged successfully',
            alert
        });
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Dismiss a service alert
// @route   PUT /api/service-alerts/:id/dismiss
// @access  Private
exports.dismissAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const alert = await ServiceAlert.findById(id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Service alert not found'
            });
        }

        alert.status = 'dismissed';
        alert.acknowledgedBy = req.user._id;
        alert.acknowledgedAt = new Date();

        if (notes) {
            alert.notes = notes;
        }

        await alert.save();

        res.status(200).json({
            success: true,
            message: 'Alert dismissed successfully',
            alert
        });
    } catch (error) {
        console.error('Error dismissing alert:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get service alerts for a specific product
// @route   GET /api/service-alerts/product/:productId
// @access  Private
exports.getProductAlerts = async (req, res) => {
    try {
        const { productId } = req.params;

        const alerts = await ServiceAlert.find({
            rentalProduct: productId
        })
            .populate('acknowledgedBy', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: alerts.length,
            alerts
        });
    } catch (error) {
        console.error('Error fetching product alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
