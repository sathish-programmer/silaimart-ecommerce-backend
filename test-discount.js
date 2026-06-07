const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = require('./models/Product');
  const p = await Product.findByIdAndUpdate('6a1f07291600b1187ba719a6', { discountValue: 15, discountPrice: 68 }, { new: true });
  console.log('Saved:', p.discountValue);
  process.exit(0);
});
