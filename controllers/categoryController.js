const Category = require('../models/Category');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const { limit, page = 1 } = req.query;
    const skip = (page - 1) * (limit || 0);
    
    const query = Category.find({ isActive: true });
    
    if (limit) {
      query.limit(parseInt(limit)).skip(skip);
    }
    
    const categories = await query.sort({ createdAt: -1 });
    const total = await Category.countDocuments({ isActive: true });
    
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
    
    const category = new Category({
      name,
      description,
      image,
      createdBy: req.user.id
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
    
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, image, isActive, updatedAt: Date.now() },
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