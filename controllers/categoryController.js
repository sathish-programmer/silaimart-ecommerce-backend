const Category = require('../models/Category');

// Helper function to generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Helper function to ensure unique slug
const ensureUniqueSlug = async (slug, excludeId = null) => {
  let uniqueSlug = slug;
  let counter = 1;
  
  while (true) {
    const query = { slug: uniqueSlug };
    if (excludeId) query._id = { $ne: excludeId };
    
    const existingCategory = await Category.findOne(query);
    if (!existingCategory) break;
    
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return uniqueSlug;
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const { limit, page = 1 } = req.query;
    const skip = (page - 1) * (limit || 0);
    
    const filter = { isActive: true };
    // Role-based filtering for admin routes
    if (req.user && req.user.role === 'admin') {
      filter.createdBy = req.user.userId;
    }
    
    const query = Category.find(filter);
    
    if (limit) {
      query.limit(parseInt(limit)).skip(skip);
    }
    
    const categories = await query.sort({ createdAt: -1 }).populate('createdBy', 'name email');
    const total = await Category.countDocuments(filter);
    
    res.json({
      success: true,
      categories,
      pagination: limit ? {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create category (Admin only)
const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(name, 'i') } });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
    
    // Generate slug from name
    const baseSlug = generateSlug(name);
    const slug = await ensureUniqueSlug(baseSlug);
    
    const category = new Category({
      name,
      slug,
      description,
      image,
      createdBy: req.user.userId
    });
    
    await category.save();
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update category (Admin only)
const updateCategory = async (req, res) => {
  try {
    const { name, description, image, isActive } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // Check if name is being changed and if it conflicts
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(name, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existingCategory) {
        return res.status(400).json({ success: false, message: 'Category name already exists' });
      }
    }
    
    // Generate new slug if name changed
    const updateData = { description, image, isActive, updatedAt: Date.now() };
    if (name) {
      updateData.name = name;
      if (name !== category.name) {
        const baseSlug = generateSlug(name);
        updateData.slug = await ensureUniqueSlug(baseSlug, req.params.id);
      }
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, category: updatedCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // Soft delete - mark as inactive
    await Category.findByIdAndUpdate(req.params.id, { isActive: false });
    
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get categories with product count
const getCategoriesWithCount = async (req, res) => {
  try {
    const categories = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' }
        }
      },
      {
        $project: {
          products: 0
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesWithCount
};