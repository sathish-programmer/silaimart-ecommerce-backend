/**
 * setup-razorpay-test.js
 * Run once to enable Razorpay in DB settings with test keys.
 * Usage: node setup-razorpay-test.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('./models/Settings');

const RAZORPAY_TEST_KEY_ID     = process.env.RAZORPAY_KEY_ID     || 'rzp_test_1DP5mmOlF5G5ag';
const RAZORPAY_TEST_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'thisissecret1thisissecret2thi';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    console.log('✅ Connected to MongoDB');

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
      console.log('📝 No settings found — creating fresh document');
    }

    // Enable Razorpay with test keys
    settings.payment = settings.payment || {};
    settings.payment.razorpay = {
      enabled: true,
      keyId: RAZORPAY_TEST_KEY_ID,
      keySecret: RAZORPAY_TEST_KEY_SECRET
    };

    settings.markModified('payment');
    await settings.save();

    console.log('');
    console.log('✅ Razorpay enabled in DB settings!');
    console.log(`   Key ID  : ${RAZORPAY_TEST_KEY_ID}`);
    console.log(`   Enabled : true`);
    console.log('');
    console.log('👉 Now RESTART the backend server for .env changes to take effect.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
