const { Chatbot, Conversation } = require('../models/Chatbot');
const { Product } = require('../models');

// Get bot configuration
exports.getBotConfig = async (req, res) => {
  try {
    let bot = await Chatbot.findOne();
    if (!bot) {
      bot = await Chatbot.create({});
    }
    res.json({ bot });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update bot configuration (Admin)
exports.updateBotConfig = async (req, res) => {
  try {
    const bot = await Chatbot.findOneAndUpdate({}, req.body, { 
      new: true, 
      upsert: true 
    });
    res.json({ message: 'Bot configuration updated', bot });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Handle chat message
exports.handleMessage = async (req, res) => {
  try {
    const { sessionId, message, userId } = req.body;
    
    // Find or create conversation
    let conversation = await Conversation.findOne({ sessionId });
    if (!conversation) {
      conversation = await Conversation.create({
        sessionId,
        user: userId,
        messages: []
      });
    }
    
    // Add user message
    conversation.messages.push({
      sender: 'user',
      message,
      timestamp: new Date()
    });
    
    // Generate bot response
    const botResponse = await generateBotResponse(message, userId);
    
    // Add bot response
    conversation.messages.push({
      sender: 'bot',
      message: botResponse.message,
      type: botResponse.type,
      data: botResponse.data,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    res.json({ 
      response: botResponse,
      conversationId: conversation._id 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate bot response using AI logic
async function generateBotResponse(userMessage, userId) {
  const bot = await Chatbot.findOne();
  const message = userMessage.toLowerCase();
  
  // Check for predefined responses first
  for (const response of bot?.responses || []) {
    if (response.isActive && response.trigger.some(trigger => 
      message.includes(trigger.toLowerCase())
    )) {
      return {
        message: response.response,
        type: 'text'
      };
    }
  }
  
  // Enhanced product search with specific deity/product names
  const productKeywords = ['ganesha', 'vinayagar', 'shiva', 'vishnu', 'krishna', 'hanuman', 'durga', 'lakshmi', 'saraswati', 'buddha', 'sculpture', 'statue', 'murti', 'idol'];
  const hasProductKeyword = productKeywords.some(keyword => message.includes(keyword));
  
  if (hasProductKeyword || message.includes('show') || message.includes('find') || message.includes('search')) {
    const products = await searchProducts(message);
    if (products.length > 0) {
      return {
        message: `I found ${products.length} beautiful sculptures for you! Here are some recommendations:`,
        type: 'product',
        data: { 
          products: products.slice(0, 4),
          suggestions: [
            'Would you like to see more options?',
            'Do you have a specific size in mind?',
            'Are you looking for a particular material?'
          ]
        }
      };
    } else {
      return {
        message: 'I couldn\'t find exact matches, but here are some popular sculptures you might like:',
        type: 'product',
        data: { 
          products: await getPopularProducts(),
          suggestions: [
            'Try searching for: Ganesha, Shiva, Krishna',
            'Browse by category: Religious, Decorative',
            'Filter by price range'
          ]
        }
      };
    }
  }
  
  // Help and support responses
  if (message.includes('help') || message.includes('support') || message.includes('problem')) {
    return {
      message: 'I\'m here to help! What do you need assistance with?',
      type: 'action',
      data: {
        quickReplies: [
          { text: 'Product Information', action: 'Tell me about your sculptures' },
          { text: 'Order Status', action: 'Check my order status' },
          { text: 'Shipping Details', action: 'Shipping information' },
          { text: 'Return Policy', action: 'What is your return policy?' }
        ]
      }
    };
  }
  
  // Price inquiry with suggestions
  if (message.includes('price') || message.includes('cost') || message.includes('₹')) {
    return {
      message: 'Our divine sculptures range from ₹500 to ₹50,000. Here\'s what we offer:',
      type: 'action',
      data: {
        priceRanges: [
          { range: '₹500 - ₹2,000', description: 'Small decorative pieces' },
          { range: '₹2,000 - ₹10,000', description: 'Medium sculptures' },
          { range: '₹10,000 - ₹50,000', description: 'Large premium sculptures' }
        ],
        quickReplies: [
          { text: 'Show Budget Options', action: 'Show sculptures under 2000' },
          { text: 'Premium Collection', action: 'Show premium sculptures' }
        ]
      }
    };
  }
  
  // Shipping inquiry
  if (message.includes('shipping') || message.includes('delivery')) {
    return {
      message: 'We offer reliable shipping across India with these options:',
      type: 'action',
      data: {
        shippingInfo: [
          { type: 'Free Shipping', condition: 'Orders above ₹1,000', time: '5-7 business days' },
          { type: 'Express Delivery', condition: 'Additional ₹150', time: '2-3 business days' },
          { type: 'Same Day', condition: 'Available in select cities', time: 'Within 24 hours' }
        ],
        quickReplies: [
          { text: 'Check Delivery Time', action: 'What is delivery time to my location?' },
          { text: 'Track My Order', action: 'Track my order' }
        ]
      }
    };
  }
  
  // Order status and tracking
  if (message.includes('order') && (message.includes('status') || message.includes('track'))) {
    return {
      message: 'You can easily track your order! Here\'s how:',
      type: 'action',
      data: {
        steps: [
          'Go to "My Orders" in your account',
          'Find your order and click "View Details"',
          'Check real-time status updates'
        ],
        quickReplies: [
          { text: 'Go to My Orders', action: 'redirect:/orders' },
          { text: 'Need Help?', action: 'I need help with my order' }
        ]
      }
    };
  }
  
  // Material and craftsmanship questions
  if (message.includes('material') || message.includes('stone') || message.includes('marble')) {
    return {
      message: 'Our sculptures are crafted from premium materials:',
      type: 'action',
      data: {
        materials: [
          { name: 'White Marble', description: 'Premium Makrana marble, perfect finish' },
          { name: 'Black Granite', description: 'Durable and elegant, long-lasting' },
          { name: 'Sandstone', description: 'Traditional carved sculptures' },
          { name: 'Bronze', description: 'Antique finish, premium collection' }
        ],
        quickReplies: [
          { text: 'Show Marble Sculptures', action: 'Show marble sculptures' },
          { text: 'Granite Collection', action: 'Show granite sculptures' }
        ]
      }
    };
  }
  
  // Greeting responses
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return {
      message: 'Hello! Welcome to SilaiMart! 🙏 I\'m here to help you find the perfect divine sculpture.',
      type: 'action',
      data: {
        quickReplies: [
          { text: 'Browse Sculptures', action: 'Show me your sculptures' },
          { text: 'Popular Items', action: 'What are your popular sculptures?' },
          { text: 'Need Help', action: 'I need help' }
        ]
      }
    };
  }
  
  // Default intelligent response with suggestions
  return {
    message: 'I\'d love to help you find the perfect sculpture! Here are some things I can assist you with:',
    type: 'action',
    data: {
      suggestions: [
        '🕉️ Find sculptures by deity (Ganesha, Shiva, Krishna)',
        '💰 Get pricing information and deals',
        '🚚 Learn about shipping and delivery',
        '📞 Get support and help',
        '📦 Track your orders'
      ],
      quickReplies: [
        { text: 'Show Ganesha Sculptures', action: 'Show me Ganesha sculptures' },
        { text: 'What\'s Popular?', action: 'What are your popular items?' },
        { text: 'Pricing Info', action: 'Tell me about pricing' }
      ]
    }
  };
}

// Search products based on message
async function searchProducts(message) {
  const keywords = extractKeywords(message);
  
  // Enhanced search with deity names and product types
  const deityMap = {
    'ganesha': ['ganesha', 'vinayagar', 'ganapati'],
    'shiva': ['shiva', 'mahadev', 'nataraja'],
    'krishna': ['krishna', 'kanha', 'govind'],
    'hanuman': ['hanuman', 'bajrang'],
    'buddha': ['buddha', 'gautam'],
    'durga': ['durga', 'devi'],
    'lakshmi': ['lakshmi', 'laxmi'],
    'saraswati': ['saraswati', 'saraswathi']
  };
  
  let searchTerms = [...keywords];
  
  // Add related deity terms
  Object.entries(deityMap).forEach(([deity, variants]) => {
    if (variants.some(variant => message.includes(variant))) {
      searchTerms.push(deity, ...variants);
    }
  });
  
  const query = {
    $and: [
      {
        $or: [
          { name: { $regex: searchTerms.join('|'), $options: 'i' } },
          { description: { $regex: searchTerms.join('|'), $options: 'i' } },
          { tags: { $in: searchTerms } },
          { 'sculptureDetails.deity': { $regex: searchTerms.join('|'), $options: 'i' } }
        ]
      },
      { isActive: true }
    ]
  };
  
  return await Product.find(query)
    .populate('category', 'name')
    .limit(8)
    .select('name price discountPrice images category sculptureDetails');
}

// Get popular products when no specific search
async function getPopularProducts() {
  return await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name')
    .limit(6)
    .select('name price discountPrice images category');
}

// Extract keywords from message
function extractKeywords(message) {
  const commonWords = ['show', 'find', 'search', 'looking', 'for', 'want', 'need', 'the', 'a', 'an', 'and', 'or', 'but'];
  return message.toLowerCase()
    .split(' ')
    .filter(word => word.length > 2 && !commonWords.includes(word));
}

// Get conversations (Admin)
exports.getConversations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const conversations = await Conversation.find()
      .populate('user', 'name email')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Conversation.countDocuments();
    
    res.json({
      conversations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get conversation by ID
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('user', 'name email');
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};