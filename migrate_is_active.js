const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Product.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    console.log(`Updated ${result.modifiedCount} products to have isActive: true`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

migrate();
