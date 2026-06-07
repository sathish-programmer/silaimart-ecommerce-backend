const mongoose = require('mongoose');
require('dotenv').config();
const Settings = require('./models/Settings');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const s = await Settings.findOne();
  console.log(JSON.stringify(s.payment, null, 2));
  process.exit();
}
run();
