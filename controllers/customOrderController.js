const CustomOrderRequest = require('../models/CustomOrderRequest');
const User = require('../models/User');
const { sendCustomOrderQuote } = require('../services/emailService');

// User creates a custom order request
exports.createCustomOrderRequest = async (req, res) => {
  try {
    const { requestDetails, images } = req.body;

    if (!requestDetails) {
      return res.status(400).json({ message: 'Request details are required.' });
    }

    const customRequest = new CustomOrderRequest({
      user: req.user.userId,
      requestDetails,
      images: images || [],
      status: 'pending',
    });

    await customRequest.save();

    res.status(201).json({ 
      success: true, 
      message: 'Custom order request submitted successfully.', 
      request: customRequest 
    });
  } catch (error) {
    console.error('Error creating custom order request:', error);
    res.status(500).json({ message: 'Failed to submit custom order request.' });
  }
};

// Admin gets all custom order requests
exports.getAllCustomOrderRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await CustomOrderRequest.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CustomOrderRequest.countDocuments(filter);

    res.json({
      success: true,
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Error fetching custom order requests:', error);
    res.status(500).json({ message: 'Failed to fetch custom order requests.' });
  }
};

// Admin gets a single custom order request by ID
exports.getCustomOrderRequestById = async (req, res) => {
  try {
    const request = await CustomOrderRequest.findById(req.params.id)
      .populate('user', 'name email phone');

    if (!request) {
      return res.status(404).json({ message: 'Custom order request not found.' });
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('Error fetching custom order request by ID:', error);
    res.status(500).json({ message: 'Failed to fetch custom order request.' });
  }
};

// Admin updates a custom order request (status, quote, delivery date, notes)
exports.updateCustomOrderRequest = async (req, res) => {
  try {
    const { status, adminNotes, quotedPrice, estimatedDeliveryDate, sendEmail } = req.body;

    const request = await CustomOrderRequest.findById(req.params.id).populate('user', 'name email');

    if (!request) {
      return res.status(404).json({ message: 'Custom order request not found.' });
    }

    const originalStatus = request.status;
    const originalQuotedPrice = request.quotedPrice;
    const originalEstimatedDeliveryDate = request.estimatedDeliveryDate;

    if (status) request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;
    if (quotedPrice !== undefined) request.quotedPrice = quotedPrice;
    if (estimatedDeliveryDate) request.estimatedDeliveryDate = estimatedDeliveryDate;

    await request.save();

    // Send email to user if quote/status changed and requested
    if (sendEmail && request.user) {
      if (status !== originalStatus || quotedPrice !== originalQuotedPrice || estimatedDeliveryDate !== originalEstimatedDeliveryDate) {
        await sendCustomOrderQuote(request, request.user);
        request.adminReplySent = true;
        await request.save(); // Save again after sending email
      }
    }

    res.json({ 
      success: true, 
      message: 'Custom order request updated successfully.', 
      request 
    });
  } catch (error) {
    console.error('Error updating custom order request:', error);
    res.status(500).json({ message: 'Failed to update custom order request.' });
  }
};

// User gets their own custom order requests
exports.getUserCustomOrderRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user.userId };
    if (status) filter.status = status;

    const requests = await CustomOrderRequest.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CustomOrderRequest.countDocuments(filter);

    res.json({
      success: true,
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Error fetching user\'s custom order requests:', error);
    res.status(500).json({ message: 'Failed to fetch custom order requests.' });
  }
};
