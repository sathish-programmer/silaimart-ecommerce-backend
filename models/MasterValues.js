const mongoose = require('mongoose');

const masterValuesSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['stone_types', 'finishes', 'materials', 'sculpture_types', 'sizes', 'colors']
  },
  values: [{
    label: { type: String, required: true },
    value: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    description: String,
    metadata: {
      color: String, // For color values
      price_modifier: Number, // Additional cost for this option
      availability: String // Available, Limited, Out of Stock
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create default values
masterValuesSchema.statics.createDefaults = async function() {
  const defaults = [
    {
      category: 'stone_types',
      values: [
        { label: 'Marble', value: 'marble', order: 1 },
        { label: 'Granite', value: 'granite', order: 2 },
        { label: 'Sandstone', value: 'sandstone', order: 3 },
        { label: 'Limestone', value: 'limestone', order: 4 },
        { label: 'Basalt', value: 'basalt', order: 5 },
        { label: 'Soapstone', value: 'soapstone', order: 6 }
      ]
    },
    {
      category: 'finishes',
      values: [
        { label: 'Polished', value: 'polished', order: 1 },
        { label: 'Matte', value: 'matte', order: 2 },
        { label: 'Antique', value: 'antique', order: 3 },
        { label: 'Natural', value: 'natural', order: 4 },
        { label: 'Carved', value: 'carved', order: 5 },
        { label: 'Textured', value: 'textured', order: 6 }
      ]
    },
    {
      category: 'materials',
      values: [
        { label: 'Marble', value: 'marble', order: 1 },
        { label: 'Granite', value: 'granite', order: 2 },
        { label: 'Sandstone', value: 'sandstone', order: 3 },
        { label: 'Bronze', value: 'bronze', order: 4 },
        { label: 'Brass', value: 'brass', order: 5 },
        { label: 'Wood', value: 'wood', order: 6 },
        { label: 'Clay', value: 'clay', order: 7 },
        { label: 'Other', value: 'other', order: 8 }
      ]
    },
    {
      category: 'sculpture_types',
      values: [
        { label: 'Religious', value: 'religious', order: 1 },
        { label: 'Abstract', value: 'abstract', order: 2 },
        { label: 'Portrait', value: 'portrait', order: 3 },
        { label: 'Animal', value: 'animal', order: 4 },
        { label: 'Decorative', value: 'decorative', order: 5 },
        { label: 'Custom Design', value: 'custom_design', order: 6 }
      ]
    }
  ];

  for (const defaultData of defaults) {
    const existing = await this.findOne({ category: defaultData.category });
    if (!existing) {
      await this.create(defaultData);
    }
  }
};

module.exports = mongoose.model('MasterValues', masterValuesSchema);