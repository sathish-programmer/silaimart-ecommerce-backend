const mongoose = require('mongoose');
const { Chatbot } = require('./models/Chatbot');

mongoose.connect('mongodb://localhost:27017/silaimart', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');
    let bot = await Chatbot.findOne();
    if (!bot) {
      bot = new Chatbot();
    }
    
    const newResponses = [
      {
        trigger: ['shipping', 'delivery', 'Shipping & Delivery'],
        response: 'Standard shipping takes 3-5 business days. Express delivery is available at checkout. You will receive a tracking link via email once your order ships.',
        category: 'general',
        isActive: true
      },
      {
        trigger: ['returns info', 'return policy', 'refund'],
        response: 'We offer a hassle-free 7-day return policy for unused items in their original packaging. Custom-tailored items are non-refundable unless there is a defect.',
        category: 'support',
        isActive: true
      },
      {
        trigger: ['contact support', 'customer care', 'help desk'],
        response: 'Our support team is available Monday-Saturday, 9 AM to 6 PM. You can reach us at silaimartindia@gmail.com or by clicking the WhatsApp icon on our website.',
        category: 'support',
        isActive: true
      }
    ];

    // Merge without duplicates
    newResponses.forEach(nr => {
      const exists = bot.responses.find(r => r.trigger.includes(nr.trigger[0]));
      if (!exists) {
        bot.responses.push(nr);
      } else {
        exists.response = nr.response; // Update existing
      }
    });

    await bot.save();
    console.log('Bot predefined responses updated successfully in DB!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
