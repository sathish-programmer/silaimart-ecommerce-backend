const { Coupon } = require('../models');

exports.getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    let filter = {};

    if (req.user.role === 'admin') {
      filter.createdBy = req.user.userId;
    }
    
    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Coupon.countDocuments(filter);

    res.json({
      success: true,
      coupons,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ isActive: true });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      $and: [
        { $or: [ { validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: new Date() } } ] },
        { $or: [ { validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gte: new Date() } } ] }
      ]
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    if (amount < coupon.minimumAmount) {
      return res.status(400).json({ message: `Minimum order amount is ₹${coupon.minimumAmount}` });
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (amount * coupon.value) / 100;
      if (coupon.maximumDiscount) {
        discount = Math.min(discount, coupon.maximumDiscount);
      }
    } else {
      discount = coupon.value;
    }

    res.json({ coupon, discount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const coupon = new Coupon({
      ...req.body,
      createdBy: req.user.userId
    });
    await coupon.save();
    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const coupons = await Coupon.find({ createdBy: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Coupon.countDocuments({ createdBy: req.user.userId });

    res.json({
      success: true,
      coupons,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    
    res.json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};