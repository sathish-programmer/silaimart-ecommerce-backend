const mongoose = require('mongoose');
const Banner = require('./models/Banner');

console.log('Title required:', Banner.schema.path('title').isRequired);
console.log('Title options:', JSON.stringify(Banner.schema.path('title').options));
process.exit(0);
