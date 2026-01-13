const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['user', 'admin', 'superadmin'] }
});

const User = mongoose.model('User', userSchema);

const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await User.findOneAndUpdate(
      { email: 'admin@gmail.com' },
      { 
        role: 'superadmin',
        password: hashedPassword
      },
      { new: true }
    );

    if (admin) {
      console.log('Admin updated successfully!');
      console.log('Email: admin@gmail.com');
      console.log('Password: admin123');
      console.log('Role: superadmin');
    } else {
      console.log('Admin with email admin@gmail.com not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin:', error);
    process.exit(1);
  }
};

resetAdminPassword();