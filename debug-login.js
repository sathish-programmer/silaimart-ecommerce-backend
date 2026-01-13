const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  address: Object,
  isVerified: Boolean,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const debugLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    
    const user = await User.findOne({ email: 'admin@gmail.com' });
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('User found:', {
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });
    
    // Test password comparison
    const isMatch = await bcrypt.compare('admin123', user.password);
    console.log('Password match:', isMatch);
    
    // Reset password with correct bcrypt rounds
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await User.findOneAndUpdate(
      { email: 'admin@gmail.com' },
      { password: hashedPassword }
    );
    
    console.log('Password reset completed. Try login again.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

debugLogin();