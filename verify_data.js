const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const Product = require('./models/Product');
const Category = require('./models/Category');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const products = await Product.find().limit(5).populate('category');
    
    console.log('\n--- Sample Product Data ---');
    products.forEach(p => {
      console.log(`\nProduct: ${p.name}`);
      console.log(`Raw Object:`, p.toObject());
    });

    // Test a new non-sculpture product
    const testProduct = new Product({
      name: "Verificaton Product - Modern Decor",
      description: "A test product to verify dynamic specifications",
      price: 999,
      stock: 10,
      sku: "TEST-DECOR-001",
      category: products[0]?.category?._id || new mongoose.Types.ObjectId(), // Reuse an existing category id or mock
      createdBy: products[0]?.createdBy || new mongoose.Types.ObjectId(),
      specifications: {
        "Weight": "2kg",
        "Material": "Ceramic",
        "Style": "Contemporary"
      }
    });
    
    console.log('\n--- Virtual Fallback Test ---');
    console.log('Test Product specifications:', testProduct.specifications);
    console.log('Test Product allSpecifications (Virtual):', testProduct.allSpecifications);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

verify();
