const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');

        // Import models
        require('./models');
        const Banner = mongoose.model('Banner');

        console.log('--- Banner Schema Info ---');
        const titlePath = Banner.schema.path('title');
        console.log('Title options:', titlePath.options);
        console.log('Title required:', titlePath.isRequired);

        console.log('--- Model Version Key ---');
        console.log('Version:', Banner.schema.get('versionKey'));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
