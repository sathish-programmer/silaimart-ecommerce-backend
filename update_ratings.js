const mongoose = require('mongoose');
require('dotenv').config();
const Review = require('./models/Review');
const Product = require('./models/Product');

async function updateRatings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const products = await Product.find({});
    for (const product of products) {
      const stats = await Review.aggregate([
        { $match: { product: product._id, isApproved: true } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
          }
        }
      ]);

      if (stats.length > 0) {
        await Product.findByIdAndUpdate(product._id, {
          'rating.average': Math.round(stats[0].averageRating * 10) / 10,
          'rating.count': stats[0].totalReviews
        });
        console.log(`Updated ${product.name}: ${stats[0].averageRating} (${stats[0].totalReviews})`);
      } else {
        await Product.findByIdAndUpdate(product._id, {
          'rating.average': 0,
          'rating.count': 0
        });
      }
    }
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateRatings();
