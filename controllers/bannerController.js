const { Banner } = require('../models');

// Get all banners (public)
exports.getBanners = async (req, res) => {
  try {
    const { position = 'shop-top', active = true } = req.query;
    const filter = { position };

    if (active === 'true') {
      filter.isActive = true;
      filter.$or = [
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: { $lte: new Date() } }
      ];
      filter.$and = [
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: new Date() } }
          ]
        }
      ];
    }

    const banners = await Banner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .populate('createdBy', 'name');

    res.json({
      success: true,
      banners
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all banners (admin)
exports.getAllBanners = async (req, res) => {
  try {
    const { page = 1, limit = 10, position } = req.query;
    const filter = {};

    if (position) filter.position = position;

    // If the user is an admin but not a superadmin, filter by createdBy
    if (req.user.role === 'admin') {
      filter.createdBy = req.user.id;
    }

    const banners = await Banner.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Banner.countDocuments(filter);

    res.json({
      success: true,
      banners,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get banner by ID
exports.getBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
      .populate('createdBy', 'name');

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.json({ success: true, banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create banner (Admin only)
exports.createBanner = async (req, res) => {
  try {
    console.log('--- Create Banner Debug ---');
    console.log('Body:', req.body);
    console.log('Schema Title Required:', Banner.schema.path('title').isRequired);

    const banner = new Banner({
      ...req.body,
      createdBy: req.user.id
    });

    await banner.save();
    await banner.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      banner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update banner (Admin only)
exports.updateBanner = async (req, res) => {
  try {
    console.log('--- Update Banner Debug ---');
    console.log('ID:', req.params.id);
    console.log('Body:', req.body);
    console.log('Schema Title Required:', Banner.schema.path('title').isRequired);

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.json({
      success: true,
      message: 'Banner updated successfully',
      banner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete banner (Admin only)
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update banner order
exports.updateBannerOrder = async (req, res) => {
  try {
    const { banners } = req.body; // Array of { id, order }

    const updatePromises = banners.map(({ id, order }) =>
      Banner.findByIdAndUpdate(id, { order })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Banner order updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};