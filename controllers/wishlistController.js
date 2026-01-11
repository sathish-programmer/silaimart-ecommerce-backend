const Wishlist = require('../models/Wishlist');

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: 'products',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, products: [] });
      await wishlist.save();
    }

    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, products: [productId] });
    } else {
      if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
      } else {
        return res.status(400).json({ message: 'Product already in wishlist' });
      }
    }

    await wishlist.save();
    await wishlist.populate({
      path: 'products',
      populate: {
        path: 'category',
        select: 'name'
      }
    });

    res.json({ wishlist, message: 'Product added to wishlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.products = wishlist.products.filter(
      product => product.toString() !== productId
    );

    await wishlist.save();
    await wishlist.populate({
      path: 'products',
      populate: {
        path: 'category',
        select: 'name'
      }
    });

    res.json({ wishlist, message: 'Product removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check if product is in wishlist
exports.checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ 
      user: req.user.id,
      products: productId
    });

    res.json({ inWishlist: !!wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear wishlist
exports.clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.products = [];
    await wishlist.save();

    res.json({ wishlist, message: 'Wishlist cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};