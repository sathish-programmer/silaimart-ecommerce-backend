const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['user', 'admin', 'superadmin'] }
});

const User = mongoose.model('User', userSchema);

const updateToSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    
    const admin = await User.findOneAndUpdate(
      { email: 'admin@gmail.com' },
      { role: 'superadmin' },
      { new: true }
    );

    if (admin) {
      console.log('Admin updated to superadmin successfully!');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
    } else {
      console.log('Admin with email admin@gmail.com not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin:', error);
    process.exit(1);
  }
};

updateToSuperAdmin();