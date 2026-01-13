const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

const checkAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    
    const admins = await User.find({ 
      role: { $in: ['admin', 'superadmin'] } 
    }).select('name email role');

    console.log('Found admin accounts:');
    admins.forEach(admin => {
      console.log(`Email: ${admin.email}, Role: ${admin.role}, Name: ${admin.name}`);
    });
    
    if (admins.length === 0) {
      console.log('No admin accounts found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmins();