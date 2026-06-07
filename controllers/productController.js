const mongoose = require('mongoose');
const { Product, Category, Review } = require('../models');

/**
 * Resolve category param to an ObjectId.
 * Accepts either a valid ObjectId string OR a slug/name string.
 */
const resolveCategoryId = async (categoryParam) => {
  if (!categoryParam) return null;
  // Already a valid ObjectId — use as-is
  if (mongoose.Types.ObjectId.isValid(categoryParam)) return categoryParam;
  // Otherwise treat as slug or name
  const cat = await Category.findOne({
    $or: [{ slug: categoryParam }, { name: new RegExp(`^${categoryParam}$`, 'i') }]
  }).select('_id').lean();
  return cat ? cat._id : null; // null = no match → return 0 results (don't crash)
};


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
    
    // Role-based filtering
    if (req.user.role === 'admin') {
      filter.createdBy = req.user.userId;
    }
    // Superadmin sees all products
    
    const resolvedCategory = await resolveCategoryId(category);
    if (category && !resolvedCategory) {
      // Slug didn't match any category — return empty gracefully
      return res.json({ success: true, products: [], totalPages: 0, currentPage: page, total: 0 });
    }
    if (resolvedCategory) filter.category = resolvedCategory;
    if (search) {
      filter.$text = { $search: search };
    }

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('category', 'name slug sizeGuideImage')
      .populate('createdBy', 'name email')
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
      subCategory,
      minPrice,
      maxPrice,
      search,
      sort = 'createdAt',
      order = 'desc',
      featured,
      trending,
      bestSeller,
      newArrival,
      size,
      color,
      material,
      // Dynamic filters from query params
      ...dynamicFilters
    } = req.query;

    const filter = { isActive: true };
    
    const resolvedCategory = await resolveCategoryId(category);
    if (category && !resolvedCategory) {
      return res.json({ success: true, products: [], recommendations: [], filterOptions: {}, totalPages: 0, currentPage: page, total: 0 });
    }
    if (resolvedCategory) filter.category = resolvedCategory;

    const resolvedSubCategory = subCategory && mongoose.Types.ObjectId.isValid(subCategory) ? subCategory : null;
    if (resolvedSubCategory) filter.subCategory = resolvedSubCategory;
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    if (search) {
      const trimmedSearch = search.trim();
      // 1. All words must exist (any order)
      const searchTerms = trimmedSearch.split(/\s+/).map(term => `(?=.*${term})`).join('');
      const fuzzyRegex = new RegExp(searchTerms, 'i');
      
      // 2. Any word matches partially
      const simpleRegex = new RegExp(trimmedSearch.split(/\s+/).join('|'), 'i');

      // 3. Typo tolerance: match characters with skips (e.g., "Gansh" -> "G.*a.*n.*s.*h")
      const typoRegex = new RegExp(trimmedSearch.split('').join('.*'), 'i');

      const searchFilter = {
        $or: [
          { name: { $regex: fuzzyRegex } },
          { name: { $regex: simpleRegex } },
          { name: { $regex: typoRegex } },
          { tags: { $regex: simpleRegex } },
          { tags: { $regex: typoRegex } }
        ]
      };
      // Combine with existing filter logic
      Object.assign(filter, searchFilter);
    }

    // Discovery Flags
    if (featured === 'true') filter.isFeatured = true;
    if (trending === 'true') filter.isTrending = true;
    if (bestSeller === 'true') filter.isBestSeller = true;
    if (newArrival === 'true') filter.isNewArrival = true;
    if (req.query.sale === 'true') {
      filter.discountPrice = { $exists: true, $gt: 0 };
      filter.$expr = { $lt: ["$discountPrice", "$price"] };
    }
    
    // Generic Material Filter
    if (material) filter.material = new RegExp(material, 'i');
    
    // Dynamic specifications/attribute filters
    Object.keys(dynamicFilters).forEach(key => {
      if (dynamicFilters[key]) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { [`specifications.${key}`]: dynamicFilters[key] },
            { [`productDetails.${key}`]: dynamicFilters[key] }
          ]
        });
      }
    });

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
      .populate('category', 'name slug sizeGuideImage')
      .populate('subCategory', 'name slug')
      .sort(sortObj)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Product.countDocuments(filter);
    
    // If no products found, fetch some recommended products
    let recommendations = [];
    if (products.length === 0) {
      recommendations = await Product.find({ isActive: true })
        .limit(4)
        .populate('category', 'name slug sizeGuideImage')
        .lean();
    }

    // Get filter options dynamically based on products in this category
    const filterOptions = await Product.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          materials: { $addToSet: '$material' },
          sizes: { $addToSet: '$sizes.name' },
          colors: { $addToSet: '$colors.name' },
          // Collect all unique specification keys
          specKeys: { $push: { $objectToArray: "$specifications" } },
          legacySpecKeys: { $push: { $objectToArray: "$productDetails" } }
        }
      }
    ]);

    res.json({
      products,
      recommendations,
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
      .populate('category', 'name slug sizeGuideImage');
    
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
    const productData = { ...req.body, createdBy: req.user.userId };
    // Fix empty string casting error for subCategory
    if (productData.subCategory === "") {
      delete productData.subCategory;
    }
    
    const product = new Product(productData);
    await product.save();
    await product.populate('category', 'name slug sizeGuideImage');
    
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'admin') {
      filter.createdBy = req.user.userId;
    }
    const updateData = { ...req.body };
    console.log('Update Data received:', updateData);
    if (updateData.subCategory === "") {
      updateData.subCategory = null;
    }

    const product = await Product.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    ).populate('category', 'name slug sizeGuideImage');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }
    
    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'admin') {
      filter.createdBy = req.user.userId;
    }
    
    const product = await Product.findOneAndDelete(filter);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
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
    .populate('category', 'name slug sizeGuideImage')
    .limit(4);

    res.json(relatedProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get personalized recommendations
exports.getRecommendations = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    const filter = { isActive: true };

    let products = [];

    switch (type) {
      case 'trending':
        products = await Product.find({ ...filter, isTrending: true }).limit(limit).lean();
        break;
      case 'new-arrivals':
        products = await Product.find({ ...filter, isNewArrival: true }).limit(limit).lean();
        break;
      case 'best-sellers':
        products = await Product.find({ ...filter, isBestSeller: true }).limit(limit).lean();
        break;
      default:
        // Default to a mix of featured and trending
        products = await Product.find({ ...filter, isFeatured: true }).limit(limit).lean();
    }

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
