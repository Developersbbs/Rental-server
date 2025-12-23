const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true
  },
  unit: {
    type: String,
    enum: ['liter', 'kilogram', 'none'],
    default: 'none',
    required: true
  },
  hsnNumber: {
    type: String,
    trim: true,
    required: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: false
  },
  batchNumber: {
    type: String,
    trim: true
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  manufacturingDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: 1
  },
  isRental: {
    type: Boolean,
    default: false
  },
  isSellingAccessory: {
    type: Boolean,
    default: false
  },
  rentalPrice: {
    hourly: {
      type: Number,
      min: 0,
      default: 0
    },
    daily: {
      type: Number,
      min: 0,
      default: 0
    },
    monthly: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  minRentalHours: {
    type: Number,
    default: 1,
    min: 1
  },
  serviceAlertSettings: {
    intervalType: {
      type: String,
      enum: ['hours', 'days', 'months'],
      default: 'months'
    },
    intervalValue: {
      type: Number,
      min: 0
    },
    alertMessage: {
      type: String,
      default: 'Service Due'
    }
  }
}, { timestamps: true });

// Add indexes for better query performance
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ quantity: 1 });

// Add a virtual for stock status
productSchema.virtual('stockStatus').get(function () {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= 10) return 'low_stock';
  return 'in_stock';
});

// Ensure virtual fields are included in JSON output
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema, 'products');
