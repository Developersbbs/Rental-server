const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: false },
  type: { type: String, enum: ['low-stock', 'out-of-stock', 'rental-due', 'rental-overdue', 'rental-due-tomorrow', 'service-due'], required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
