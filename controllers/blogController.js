const { Blog } = require('../models');

// Helper function to generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim('-'); // Remove leading/trailing hyphens
};

// Helper function to ensure unique slug
const ensureUniqueSlug = async (slug, excludeId = null) => {
  let uniqueSlug = slug;
  let counter = 1;
  
  while (true) {
    const query = { slug: uniqueSlug };
    if (excludeId) query._id = { $ne: excludeId };
    
    const existingBlog = await Blog.findOne(query);
    if (!existingBlog) break;
    
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return uniqueSlug;
};

exports.getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter = {};
    
    if (search) {
      filter.$text = { $search: search };
    }

    const blogs = await Blog.find(filter)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(filter);

    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter = { isPublished: true };
    
    if (search) {
      filter.$text = { $search: search };
    }

    const blogs = await Blog.find(filter)
      .populate('author', 'name')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(filter);

    res.json({
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true })
      .populate('author', 'name');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const blogData = { ...req.body, author: req.user.userId };
    
    // Generate slug from title if not provided
    if (!blogData.slug && blogData.title) {
      const baseSlug = generateSlug(blogData.title);
      blogData.slug = await ensureUniqueSlug(baseSlug);
    }
    
    const blog = new Blog(blogData);
    await blog.save();
    await blog.populate('author', 'name');
    
    res.status(201).json({ message: 'Blog created successfully', blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Generate new slug if title changed and no slug provided
    if (updateData.title && !updateData.slug) {
      const baseSlug = generateSlug(updateData.title);
      updateData.slug = await ensureUniqueSlug(baseSlug, req.params.id);
    }
    
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('author', 'name');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.json({ message: 'Blog updated successfully', blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};