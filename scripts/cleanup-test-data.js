const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

/**
 * PRODUCTION CLEANUP SCRIPT
 * 
 * Safety: Set DRY_RUN to true to only log what would be deleted.
 * Set DRY_RUN to false to actually perform deletions.
 */
const DRY_RUN = process.env.CONFIRM_CLEANUP !== 'true';

async function cleanup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.production');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to Production Database...');
    await mongoose.connect(uri);
    console.log('✅ Connected.');

    if (DRY_RUN) {
      console.log('\n--- ⚠️  DRY RUN MODE ENABLED ---');
      console.log('No data will be deleted. Set CONFIRM_CLEANUP=true to execute.\n');
    } else {
      console.log('\n--- 🚀 EXECUTION MODE: DATA DELETION STARTED ---\n');
    }

    // 1. Orders
    const orderCount = await mongoose.connection.collection('orders').countDocuments();
    console.log(`📦 Orders found: ${orderCount}`);
    if (!DRY_RUN && orderCount > 0) {
      await mongoose.connection.collection('orders').deleteMany({});
      console.log('   ✅ All orders deleted.');
    }

    // 2. Loyalty Transactions
    const loyaltyCount = await mongoose.connection.collection('loyaltytransactions').countDocuments();
    console.log(`💎 Loyalty Transactions found: ${loyaltyCount}`);
    if (!DRY_RUN && loyaltyCount > 0) {
      await mongoose.connection.collection('loyaltytransactions').deleteMany({});
      console.log('   ✅ All loyalty transactions deleted.');
    }

    // 3. Reviews
    const reviewCount = await mongoose.connection.collection('reviews').countDocuments();
    console.log(`⭐ Reviews found: ${reviewCount}`);
    if (!DRY_RUN && reviewCount > 0) {
      await mongoose.connection.collection('reviews').deleteMany({});
      console.log('   ✅ All reviews deleted.');
    }

    // 4. Notifications (Type: order or payment)
    const notificationFilter = { type: { $in: ['order', 'payment'] } };
    const notificationCount = await mongoose.connection.collection('notifications').countDocuments(notificationFilter);
    console.log(`🔔 Relevant Notifications found: ${notificationCount}`);
    if (!DRY_RUN && notificationCount > 0) {
      await mongoose.connection.collection('notifications').deleteMany(notificationFilter);
      console.log('   ✅ Relevant notifications deleted.');
    }

    // 5. Reset User Loyalty Points
    const usersWithPoints = await mongoose.connection.collection('users').countDocuments({ loyaltyPoints: { $gt: 0 } });
    console.log(`👤 Users with loyalty points: ${usersWithPoints}`);
    if (!DRY_RUN && usersWithPoints > 0) {
      await mongoose.connection.collection('users').updateMany({}, { $set: { loyaltyPoints: 0 } });
      console.log('   ✅ All user loyalty points reset to 0.');
    }

    console.log('\n✨ Cleanup process completed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanup();
