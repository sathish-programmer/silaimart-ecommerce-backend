const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

const categories = [
  {
    name: 'Trimurti Sculpture',
    description: 'Sacred sculptures representing the Hindu trinity - Brahma, Vishnu, and Shiva',
    slug: 'trimurti-sculpture'
  },
  {
    name: 'Brahma Sculpture',
    description: 'Divine sculptures of Lord Brahma, the creator in Hindu mythology',
    slug: 'brahma-sculpture'
  },
  {
    name: 'Vishnu Sculpture',
    description: 'Sacred sculptures of Lord Vishnu, the preserver deity',
    slug: 'vishnu-sculpture'
  },
  {
    name: 'Shiva Sculpture',
    description: 'Divine sculptures of Lord Shiva, the destroyer and transformer',
    slug: 'shiva-sculpture'
  },
  {
    name: 'Krishna Sculpture',
    description: 'Beautiful sculptures of Lord Krishna in various forms',
    slug: 'krishna-sculpture'
  },
  {
    name: 'Shiva Lingam',
    description: 'Sacred Shiva Lingam sculptures for worship and meditation',
    slug: 'shiva-lingam'
  },
  {
    name: 'Lingam',
    description: 'Traditional Lingam sculptures in various materials',
    slug: 'lingam'
  },
  {
    name: 'Dhyana Lingam',
    description: 'Meditation Lingam sculptures for spiritual practice',
    slug: 'dhyana-lingam'
  },
  {
    name: 'Suyambu Lingam',
    description: 'Natural self-manifested Lingam sculptures',
    slug: 'suyambu-lingam'
  },
  {
    name: 'Bairavar',
    description: 'Fierce form of Lord Shiva sculptures',
    slug: 'bairavar'
  },
  {
    name: 'Tridevi Sculpture',
    description: 'Sacred sculptures of the three goddesses - Saraswati, Lakshmi, and Parvati',
    slug: 'tridevi-sculpture'
  },
  {
    name: 'Vinayagar Sculpture',
    description: 'Lord Ganesha sculptures in various poses and sizes',
    slug: 'vinayagar-sculpture'
  },
  {
    name: 'Murugar Sculpture',
    description: 'Lord Murugan sculptures, the Tamil deity of war and victory',
    slug: 'murugar-sculpture'
  },
  {
    name: 'Amman Sculpture',
    description: 'Divine Mother goddess sculptures in various forms',
    slug: 'amman-sculpture'
  },
  {
    name: 'Navagraham Sculpture',
    description: 'Nine planetary deities sculptures for astrological worship',
    slug: 'navagraham-sculpture'
  },
  {
    name: 'God Vaganam Sculpture',
    description: 'Divine vehicle sculptures of various deities',
    slug: 'god-vaganam-sculpture'
  },
  {
    name: 'Kannimargal Sculpture',
    description: 'Sacred virgin goddess sculptures',
    slug: 'kannimargal-sculpture'
  },
  {
    name: 'Kaval Dheivam',
    description: 'Guardian deity sculptures for protection',
    slug: 'kaval-dheivam'
  },
  {
    name: 'Ramar Set',
    description: 'Complete Rama family sculpture sets',
    slug: 'ramar-set'
  },
  {
    name: 'Naalvar',
    description: 'Four Alvars saint sculptures',
    slug: 'naalvar'
  },
  {
    name: 'Others',
    description: 'Other divine sculptures and spiritual artifacts',
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