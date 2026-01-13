const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.model('User', userSchema);

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    
    const existingAdmin = await User.findOne({ email: 'admin@silaimart.in' });
    if (existingAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    const superAdmin = new User({
      name: 'Super Admin',
      email: 'admin@silaimart.in',
      password: 'admin123',
      role: 'superadmin'
    });

    await superAdmin.save();
    console.log('Super admin created successfully!');
    console.log('Email: admin@silaimart.in');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();