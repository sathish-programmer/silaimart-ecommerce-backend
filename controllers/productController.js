const { Product, Category, Review } = require('../models');

exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    const filter = {};
    
    if (category) filter.category = category;
    if (search) {
      filter.$text = { $search: search };
    }

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortObj)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'createdAt',
      order = 'desc',
      featured,
      stone,
      finish,
      size,
      color,
      material,
      deity,
      origin
    } = req.query;

    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.$text = { $search: search };
    }
    if (featured === 'true') filter.isFeatured = true;
    
    // Sculpture-specific filters
    if (stone) filter['sculptureDetails.stone'] = stone;
    if (finish) filter['sculptureDetails.finish'] = finish;
    if (material) filter.material = new RegExp(material, 'i');
    if (deity) filter['sculptureDetails.deity'] = new RegExp(deity, 'i');
    if (origin) filter['sculptureDetails.origin'] = new RegExp(origin, 'i');
    
    // Size filter
    if (size) {
      filter['sizes.name'] = new RegExp(size, 'i');
    }
    
    // Color filter
    if (color) {
      filter['colors.name'] = new RegExp(color, 'i');
    }

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortObj)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    // Get filter options for frontend
    const filterOptions = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          stones: { $addToSet: '$sculptureDetails.stone' },
          finishes: { $addToSet: '$sculptureDetails.finish' },
          materials: { $addToSet: '$material' },
          deities: { $addToSet: '$sculptureDetails.deity' },
          origins: { $addToSet: '$sculptureDetails.origin' },
          sizes: { $addToSet: '$sizes.name' },
          colors: { $addToSet: '$colors.name' },
          priceRange: {
            $push: {
              min: { $min: '$price' },
              max: { $max: '$price' }
            }
          }
        }
      }
    ]);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      filterOptions: filterOptions[0] || {}
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const reviews = await Review.find({ product: product._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json({ product, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    await product.populate('category', 'name slug');
    
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('category', 'name slug');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
    .populate('category', 'name slug')
    .limit(4);

    res.json(relatedProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};