const Purchase = require('../models/Purchase');
const PaymentAccount = require('../models/PaymentAccount');
const Product = require('../models/Product');
const asyncHandler = require('express-async-handler');

// @desc    Create a new purchase order
// @route   POST /api/purchases
// @access  Private
const createPurchase = asyncHandler(async (req, res) => {
  const { supplier, items, expectedDeliveryDate, notes } = req.body;

  // Validate items
  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('Purchase order must have at least one item');
  }

  // Validate each item
  for (const item of items) {
    if (!item.product || item.product.trim() === '') {
      res.status(400);
      throw new Error('Each item must have a product');
    }

    if (item.quantity <= 0 || item.unitCost < 0) {
      res.status(400);
      throw new Error('Quantity must be positive and unit cost cannot be negative');
    }
  }

  // Process items - handle both existing products and new product names
  const processedItems = await Promise.all(items.map(async (item) => {
    let productId = item.product;
    let productName = '';

    // Check if product is an existing product ID or new product name
    if (item.product.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId - existing product
      const existingProduct = await Product.findById(item.product);
      if (!existingProduct) {
        throw new Error(`Product with ID ${item.product} not found`);
      }
      productId = existingProduct._id;
      productName = existingProduct.name;
    } else {
      // It's a new product name - store as string
      productName = item.product.trim();
      productId = productName; // Use name as ID for new products
    }

    return {
      product: productId,
      productName: productName,
      quantity: item.quantity,
      receivedQuantity: 0,
      unitCost: item.unitCost,
      total: item.quantity * item.unitCost
    };
  }));

  // Calculate payment details
  const totalAmount = processedItems.reduce((sum, item) => sum + item.total, 0);
  let finalPaidAmount = 0;
  let finalDueAmount = totalAmount;
  let finalPaymentStatus = 'pending';
  const paymentHistory = [];

  // Handle initial payment
  if (req.body.paidAmount > 0) {
    finalPaidAmount = Number(req.body.paidAmount);
    if (finalPaidAmount >= totalAmount) {
      finalPaidAmount = totalAmount;
      finalPaymentStatus = 'paid';
      finalDueAmount = 0;
    } else {
      finalPaymentStatus = 'partial';
      finalDueAmount = totalAmount - finalPaidAmount;
    }

    // specific payment account processing
    if (req.body.paymentAccountId) {
      const paymentAccount = await PaymentAccount.findById(req.body.paymentAccountId);
      if (paymentAccount) {
        // for purchase, it's money OUT, so we DECREMENT balance
        paymentAccount.currentBalance -= finalPaidAmount;
        await paymentAccount.save();
      }
    }

    paymentHistory.push({
      amount: finalPaidAmount,
      paymentMethod: req.body.paymentMethod || 'cash',
      paymentAccount: req.body.paymentAccountId,
      paymentDate: new Date(), // or req.body.paymentDate
      notes: 'Initial payment',
      recordedBy: req.user.id
    });
  }

  // Create purchase order
  const purchase = await Purchase.create({
    supplier,
    items: processedItems,
    expectedDeliveryDate,
    notes,
    createdBy: req.user.id,
    // Payment fields
    totalAmount,
    paidAmount: finalPaidAmount,
    dueAmount: finalDueAmount,
    paymentStatus: finalPaymentStatus,
    paymentMethod: req.body.paymentMethod || 'cash',
    paymentHistory
  });

  // Populate the created purchase
  await purchase.populate([
    { path: 'supplier', select: 'name email phone' },
    { path: 'items.product', select: 'name sku' },
    { path: 'createdBy', select: 'name email' }
  ]);

  // Handle population for mixed product types (ObjectId or String)
  purchase.items = purchase.items.map(item => {
    if (typeof item.product === 'string' && item.product.match(/^[0-9a-fA-F]{24}$/)) {
      // It's an ObjectId, keep as is
      return item;
    } else {
      // It's a new product name, don't populate
      return {
        ...item,
        product: null // No actual product document for new products
      };
    }
  });

  res.status(201).json(purchase);
});

// @desc    Get all purchase orders
// @route   GET /api/purchases
// @access  Private
const getPurchases = asyncHandler(async (req, res) => {
  const {
    status,
    supplier,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = req.query;

  let query = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by supplier
  if (supplier) {
    query.supplier = supplier;
  }

  // Search by purchase order number or notes
  if (search) {
    query.$or = [
      { purchaseOrderNumber: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } }
    ];
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    populate: [
      { path: 'supplier', select: 'name email phone' },
      { path: 'items.product', select: 'name sku' },
      { path: 'createdBy', select: 'name email' },
      { path: 'approvedBy', select: 'name email' }
    ],
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
  };

  const purchases = await Purchase.paginate(query, options);

  // Handle population for mixed product types
  purchases.docs = purchases.docs.map(purchase => ({
    ...purchase,
    items: purchase.items.map(item => ({
      ...item,
      product: (typeof item.product === 'string' && item.product.match(/^[0-9a-fA-F]{24}$/)) ? item.product : null
    }))
  }));

  res.json(purchases);
});

// @desc    Get single purchase order
// @route   GET /api/purchases/:id
// @access  Private
const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate('supplier')
    .populate('items.product')
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email');

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase order not found');
  }

  // Handle population for mixed product types
  purchase.items = purchase.items.map(item => ({
    ...item,
    product: (typeof item.product === 'string' && item.product.match(/^[0-9a-fA-F]{24}$/)) ? item.product : null
  }));

  res.json(purchase);
});

// @desc    Update purchase order
// @route   PUT /api/purchases/:id
// @access  Private
const updatePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase order not found');
  }

  // Check if purchase can be modified
  if (!purchase.canBeModified()) {
    res.status(400);
    throw new Error(`Cannot update purchase order with status: ${purchase.status}`);
  }

  // Only allow the creator or admin to update
  if (purchase.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this purchase order');
  }

  const { supplier, items, expectedDeliveryDate, notes } = req.body;

  // Validate items if provided
  if (items) {
    if (items.length === 0) {
      res.status(400);
      throw new Error('Purchase order must have at least one item');
    }

    for (const item of items) {
      if (!item.product || item.product.trim() === '') {
        res.status(400);
        throw new Error('Each item must have a product');
      }

      if (item.quantity <= 0 || item.unitCost < 0) {
        res.status(400);
        throw new Error('Quantity must be positive and unit cost cannot be negative');
      }
    }
  }

  // Process items if provided - handle both existing products and new product names
  if (items) {
    purchase.items = await Promise.all(items.map(async (item) => {
      let productId = item.product;
      let productName = '';

      // Check if product is an existing product ID or new product name
      if (item.product.match(/^[0-9a-fA-F]{24}$/)) {
        // It's a MongoDB ObjectId - existing product
        const existingProduct = await Product.findById(item.product);
        if (!existingProduct) {
          throw new Error(`Product with ID ${item.product} not found`);
        }
        productId = existingProduct._id;
        productName = existingProduct.name;
      } else {
        // It's a new product name - store as string
        productName = item.product.trim();
        productId = productName;
      }

      return {
        product: productId,
        productName: productName,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity || 0,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost
      };
    }));
  }

  // Update fields
  if (supplier !== undefined) purchase.supplier = supplier;
  if (items !== undefined) purchase.items = items;
  if (expectedDeliveryDate !== undefined) purchase.expectedDeliveryDate = expectedDeliveryDate;
  if (notes !== undefined) purchase.notes = notes;

  const updatedPurchase = await purchase.save();

  // Populate the updated purchase
  await updatedPurchase.populate([
    { path: 'supplier', select: 'name email phone' },
    { path: 'items.product', select: 'name sku' },
    { path: 'createdBy', select: 'name email' },
    { path: 'approvedBy', select: 'name email' }
  ]);

  // Handle population for mixed product types
  updatedPurchase.items = updatedPurchase.items.map(item => ({
    ...item,
    product: (typeof item.product === 'string' && item.product.match(/^[0-9a-fA-F]{24}$/)) ? item.product : null
  }));

  res.json(updatedPurchase);
});

// @desc    Delete purchase order
// @route   DELETE /api/purchases/:id
// @access  Private/Admin
const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase order not found');
  }

  // Check if purchase can be deleted
  if (!purchase.canBeModified()) {
    res.status(400);
    throw new Error(`Cannot delete purchase order with status: ${purchase.status}`);
  }

  await Purchase.findByIdAndDelete(req.params.id);
  res.json({ message: 'Purchase order deleted successfully' });
});

// @desc    Approve purchase order
// @route   PUT /api/purchases/:id/approve
// @access  Private/Admin
const approvePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase order not found');
  }

  if (!purchase.canBeApproved()) {
    res.status(400);
    throw new Error(`Cannot approve purchase order with status: ${purchase.status}`);
  }

  purchase.status = 'approved';
  purchase.approvedBy = req.user.id;
  purchase.approvalDate = new Date();

  const approvedPurchase = await purchase.save();

  // Populate the approved purchase
  await approvedPurchase.populate([
    { path: 'supplier', select: 'name email phone' },
    { path: 'items.product', select: 'name sku' },
    { path: 'createdBy', select: 'name email' },
    { path: 'approvedBy', select: 'name email' }
  ]);

  // Handle population for mixed product types
  approvedPurchase.items = approvedPurchase.items.map(item => ({
    ...item,
    product: (typeof item.product === 'string' && item.product.match(/^[0-9a-fA-F]{24}$/)) ? item.product : null
  }));

  res.json(approvedPurchase);
});

// @desc    Reject purchase order
// @route   PUT /api/purchases/:id/reject
// @access  Private/Admin
const rejectPurchase = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;
  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase order not found');
  }

  if (!purchase.canBeApproved()) {
    res.status(400);
    throw new Error(`Cannot reject purchase order with status: ${purchase.status}`);
  }

  purchase.status = 'rejected';
  purchase.approvedBy = req.user.id;
  purchase.approvalDate = new Date();
  if (rejectionReason) {
    purchase.notes = purchase.notes ?
      `${purchase.notes}\n\nRejection Reason: ${rejectionReason}` :
      `Rejection Reason: ${rejectionReason}`;
  }

  const rejectedPurchase = await purchase.save();

  // Populate the rejected purchase
  await rejectedPurchase.populate([
    { path: 'supplier', select: 'name email phone' },
    { path: 'items.product', select: 'name sku' },
    { path: 'createdBy', select: 'name email' },
    { path: 'approvedBy', select: 'name email' }
  ]);

  // Handle population for mixed product types
  rejectedPurchase.items = rejectedPurchase.items.map(item => ({
    ...item,
    product: (typeof item.product === 'string' && item.product.match(/^[0-9a-fA-F]{24}$/)) ? item.product : null
  }));

  res.json(rejectedPurchase);
});

// @desc    Mark purchase as received
// @route   PUT /api/purchases/:id/receive
// @access  Private
const receivePurchase = asyncHandler(async (req, res) => {
  const { receivedItems } = req.body;

  if (!receivedItems || !Array.isArray(receivedItems)) {
    res.status(400);
    throw new Error('receivedItems must be provided as an array');
  }

  const purchase = await Purchase.findById(req.params.id).populate('items.product');

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase order not found');
  }

  if (!purchase.canReceiveItems()) {
    res.status(400);
    throw new Error(`Cannot receive items for purchase order with status: ${purchase.status}`);
  }

  // Update received quantities and inventory
  for (const receivedItem of receivedItems) {
    const { itemId, receivedQuantity } = receivedItem;

    if (!itemId || receivedQuantity === undefined) {
      res.status(400);
      throw new Error('Each received item must have itemId and receivedQuantity');
    }

    const purchaseItem = purchase.items.id(itemId);

    if (!purchaseItem) {
      res.status(400);
      throw new Error(`Item with ID ${itemId} not found in purchase order`);
    }

    if (receivedQuantity < 0) {
      res.status(400);
      throw new Error('Received quantity cannot be negative');
    }

    if (receivedQuantity > purchaseItem.quantity) {
      res.status(400);
      throw new Error(`Received quantity cannot exceed ordered quantity for item ${purchaseItem.productName || purchaseItem.product?.name}`);
    }

    // Calculate the difference for inventory update
    const previousReceived = purchaseItem.receivedQuantity || 0;
    const difference = receivedQuantity - previousReceived;

    // Update received quantity
    purchaseItem.receivedQuantity = receivedQuantity;

    // Update inventory if there's a difference and it's an existing product
    if (difference !== 0 && typeof purchaseItem.product === 'string' && purchaseItem.product.match(/^[0-9a-fA-F]{24}$/)) {
      const product = await Product.findById(purchaseItem.product);
      if (product) {
        product.quantity += difference;
        if (product.quantity < 0) {
          product.quantity = 0; // Prevent negative stock
        }
        await product.save();
      }
    }
  }

  // Update purchase status and delivery date
  if (!purchase.actualDeliveryDate) {
    purchase.actualDeliveryDate = new Date();
  }

  const updatedPurchase = await purchase.save();

  // Populate the updated purchase
  await updatedPurchase.populate([
    { path: 'supplier', select: 'name email phone' },
    { path: 'items.product', select: 'name sku' },
    { path: 'createdBy', select: 'name email' },
    { path: 'approvedBy', select: 'name email' }
  ]);

  // Handle population for mixed product types
  updatedPurchase.items = updatedPurchase.items.map(item => ({
    ...item,
    product: (typeof item.product === 'string' && item.product.match(/^[0-9a-fA-F]{24}$/)) ? item.product : null
  }));

  res.json(updatedPurchase);
});

// @desc    Get purchase order statistics
// @route   GET /api/purchases/stats
// @access  Private
const getPurchaseStats = asyncHandler(async (req, res) => {
  const stats = await Purchase.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);

  const overduePurchases = await Purchase.findOverdue();

  res.json({
    statusBreakdown: stats,
    overdueCount: overduePurchases.length,
    totalOverdueAmount: overduePurchases.reduce((sum, p) => sum + p.totalAmount, 0)
  });
});

// @desc    Add payment to purchase order
// @route   POST /api/purchases/:id/payments
// @access  Private
const addPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, paymentAccountId, notes, paymentDate } = req.body;

  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase order not found');
  }

  if (purchase.paymentStatus === 'paid') {
    res.status(400);
    throw new Error('Purchase is already fully paid');
  }

  const newPaymentAmount = Number(amount);
  if (newPaymentAmount <= 0) {
    res.status(400);
    throw new Error('Payment amount must be positive');
  }

  if (newPaymentAmount > purchase.dueAmount) {
    res.status(400);
    throw new Error(`Payment amount cannot exceed due amount: ${purchase.dueAmount}`);
  }

  // Update Payment Account
  if (paymentAccountId) {
    const paymentAccount = await PaymentAccount.findById(paymentAccountId);
    if (!paymentAccount) {
      res.status(400);
      throw new Error('Payment Account not found');
    }
    // Debit the account
    paymentAccount.currentBalance -= newPaymentAmount;
    await paymentAccount.save();
  }

  // Update Purchase Fields
  purchase.paidAmount += newPaymentAmount;
  purchase.dueAmount -= newPaymentAmount;

  if (purchase.dueAmount <= 0) {
    purchase.dueAmount = 0;
    purchase.paymentStatus = 'paid';
  } else {
    purchase.paymentStatus = 'partial';
  }

  // Add to history
  purchase.paymentHistory.push({
    amount: newPaymentAmount,
    paymentMethod: paymentMethod || 'cash',
    paymentAccount: paymentAccountId,
    paymentDate: paymentDate || new Date(),
    notes: notes,
    recordedBy: req.user.id
  });

  await purchase.save();

  res.status(200).json(purchase);
});

module.exports = {
  createPurchase,
  getPurchases,
  getPurchase,
  updatePurchase,
  deletePurchase,
  approvePurchase,
  rejectPurchase,
  receivePurchase,
  getPurchaseStats,
  addPayment
};
