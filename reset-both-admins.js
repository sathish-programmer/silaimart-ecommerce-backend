const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

const resetBothAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await User.updateMany(
      { email: { $in: ['admin@gmail.com', 'admin@silaimart.in'] } },
      { password: hashedPassword }
    );

    console.log('Both admin passwords reset to: admin123');
    console.log('Login with:');
    console.log('1. admin@gmail.com / admin123');
    console.log('2. admin@silaimart.in / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetBothAdmins();