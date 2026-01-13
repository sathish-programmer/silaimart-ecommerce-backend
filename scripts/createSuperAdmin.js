const mongoose = require('mongoose');
const { User } = require('../models');
require('dotenv').config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('SuperAdmin already exists:', existingSuperAdmin.email);
      process.exit(0);
    }

    const superAdmin = new User({
      name: 'Super Admin',
      email: 'superadmin@silaimart.com',
      password: 'SuperAdmin@123',
      role: 'superadmin',
      isVerified: true
    });

    await superAdmin.save();
    console.log('SuperAdmin created successfully!');
    console.log('Email: superadmin@silaimart.com');
    console.log('Password: SuperAdmin@123');
    
  } catch (error) {
    console.error('Error creating superadmin:', error);
  } finally {
    mongoose.disconnect();
  }
};

createSuperAdmin();