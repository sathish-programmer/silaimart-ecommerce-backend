const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

const categories = [
  {
    name: 'Trimurti Product',
    description: 'Sacred products representing the Hindu trinity - Brahma, Vishnu, and Shiva',
    slug: 'trimurti-product'
  },
  {
    name: 'Brahma Product',
    description: 'Divine products of Lord Brahma, the creator in Hindu mythology',
    slug: 'brahma-product'
  },
  {
    name: 'Vishnu Product',
    description: 'Sacred products of Lord Vishnu, the preserver deity',
    slug: 'vishnu-product'
  },
  {
    name: 'Shiva Product',
    description: 'Divine products of Lord Shiva, the destroyer and transformer',
    slug: 'shiva-product'
  },
  {
    name: 'Krishna Product',
    description: 'Beautiful products of Lord Krishna in various forms',
    slug: 'krishna-product'
  },
  {
    name: 'Shiva Lingam',
    description: 'Sacred Shiva Lingam products for worship and meditation',
    slug: 'shiva-lingam'
  },
  {
    name: 'Lingam',
    description: 'Traditional Lingam products in various materials',
    slug: 'lingam'
  },
  {
    name: 'Dhyana Lingam',
    description: 'Meditation Lingam products for spiritual practice',
    slug: 'dhyana-lingam'
  },
  {
    name: 'Suyambu Lingam',
    description: 'Natural self-manifested Lingam products',
    slug: 'suyambu-lingam'
  },
  {
    name: 'Bairavar',
    description: 'Fierce form of Lord Shiva products',
    slug: 'bairavar'
  },
  {
    name: 'Tridevi Product',
    description: 'Sacred products of the three goddesses - Saraswati, Lakshmi, and Parvati',
    slug: 'tridevi-product'
  },
  {
    name: 'Vinayagar Product',
    description: 'Lord Ganesha products in various poses and sizes',
    slug: 'vinayagar-product'
  },
  {
    name: 'Murugar Product',
    description: 'Lord Murugan products, the Tamil deity of war and victory',
    slug: 'murugar-product'
  },
  {
    name: 'Amman Product',
    description: 'Divine Mother goddess products in various forms',
    slug: 'amman-product'
  },
  {
    name: 'Navagraham Product',
    description: 'Nine planetary deities products for astrological worship',
    slug: 'navagraham-product'
  },
  {
    name: 'God Vaganam Product',
    description: 'Divine vehicle products of various deities',
    slug: 'god-vaganam-product'
  },
  {
    name: 'Kannimargal Product',
    description: 'Sacred virgin goddess products',
    slug: 'kannimargal-product'
  },
  {
    name: 'Kaval Dheivam',
    description: 'Guardian deity products for protection',
    slug: 'kaval-dheivam'
  },
  {
    name: 'Ramar Set',
    description: 'Complete Rama family product sets',
    slug: 'ramar-set'
  },
  {
    name: 'Naalvar',
    description: 'Four Alvars saint products',
    slug: 'naalvar'
  },
  {
    name: 'Others',
    description: 'Other divine products and spiritual artifacts',
    slug: 'others'
  }
];

async function populateCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert new categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`Created ${createdCategories.length} categories:`);
    
    createdCategories.forEach(cat => {
      console.log(`- ${cat.name} (${cat.slug})`);
    });

    console.log('\nCategories populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating categories:', error);
    process.exit(1);
  }
}

populateCategories();