const { Chatbot, Conversation } = require('../models/Chatbot');
const { Product, User, Order } = require('../models');

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

  let user = null;
  let lastOrder = null;

  if (userId) {
    try {
      user = await User.findById(userId);
      lastOrder = await Order.findOne({ user: userId }).sort({ createdAt: -1 });
    } catch (err) {
      console.error('Error fetching user context:', err);
    }
  }

  const userName = user ? user.name.split(' ')[0] : '';

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

  // Greeting responses (Varied)
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    const greetings = [
      `Namaste${userName ? ' ' + userName : ''}! Welcome to SilaiMart. How can I assist you in finding the perfect divine sculpture today? 🙏`,
      `Hello${userName ? ' ' + userName : ''}! It's a pleasure to have you here. Looking for a specific deity or material? ✨`,
      `Hi there! Hope you're having a blessed day. How can I help you explore our sacred collection? 🕉️`
    ];
    return {
      message: greetings[Math.floor(Math.random() * greetings.length)],
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

  // Enhanced product search
  const productKeywords = ['ganesha', 'vinayagar', 'shiva', 'vishnu', 'krishna', 'hanuman', 'durga', 'lakshmi', 'saraswati', 'buddha', 'sculpture', 'statue', 'murti', 'idol', 'bronze', 'stone', 'marble'];
  const hasProductKeyword = productKeywords.some(keyword => message.includes(keyword));

  if (hasProductKeyword || message.includes('show') || message.includes('find') || message.includes('search')) {
    const products = await searchProducts(message);
    if (products.length > 0) {
      const responses = [
        `I've found some exquisite pieces for you${userName ? ', ' + userName : ''}. Here are the top matches from our collection:`,
        `Based on your request, I recommend these divine sculptures:`,
        `Here are some sacred art pieces that might be what you're looking for:`
      ];
      return {
        message: responses[Math.floor(Math.random() * responses.length)],
        type: 'product',
        data: {
          products: products.slice(0, 6), // Return more products
          suggestions: [
            'Can I see more details for one of these?',
            'What materials are these made from?',
            'Do you have any smaller sizes?'
          ]
        }
      };
    } else {
      return {
        message: "I couldn't find exact matches for that term, but our featured collection is truly special. Take a look:",
        type: 'product',
        data: {
          products: await getPopularProducts(),
          suggestions: [
            'Search for Ganesha',
            'Search for Shiva',
            'Show marble sculptures'
          ]
        }
      };
    }
  }

  // Detailed Help & Support
  if (message.includes('help') || message.includes('support') || message.includes('assist') || message.includes('menu')) {
    return {
      message: `I'm here to ensure your experience with SilaiMart is seamless${userName ? ', ' + userName : ''}. What can I guide you with today?`,
      type: 'action',
      data: {
        suggestions: [
          '📦 Track an existing order',
          '🚚 Shipping & Delivery timelines',
          '🔄 Returns & Refund policy',
          '💎 Material & Craftsmanship details',
          '📞 Talk to our artisan support'
        ],
        quickReplies: [
          { text: 'Track Order', action: 'Track my order' },
          { text: 'Returns Info', action: 'What is your return policy?' },
          { text: 'Shipping Details', action: 'Shipping information' },
          { text: 'Contact Us', action: 'redirect:/support' }
        ]
      }
    };
  }

  // Material and craftsmanship
  if (message.includes('material') || message.includes('stone') || message.includes('marble') || message.includes('brass') || message.includes('bronze')) {
    return {
      message: 'At SilaiMart, we pride ourselves on using sacred materials for our art:',
      type: 'action',
      data: {
        steps: [
          "**Makrana Marble**: Pure white marble, renowned for its spiritual radiance.",
          "**Panchaloha Bronze**: A traditional five-metal alloy used in Chola-style casting.",
          "**Black Granite**: Durable, high-detail stone from Southern India.",
          "**Natural Sandstone**: Echoing the textures of India's ancient cave temples."
        ],
        quickReplies: [
          { text: 'Show Marble Art', action: 'Show marble sculptures' },
          { text: 'Bronze Collection', action: 'Show bronze sculptures' }
        ]
      }
    };
  }

  // Pricing & Deals
  if (message.includes('price') || message.includes('cost') || message.includes('₹') || message.includes('offer') || message.includes('discount')) {
    return {
      message: 'We offer divine art across various price ranges to suit every home:',
      type: 'action',
      data: {
        priceRanges: [
          { range: '₹500 - ₹2,000', description: 'Small decorative and gift items' },
          { range: '₹2,000 - ₹10,000', description: 'Medium-sized household shrines' },
          { range: '₹10,000+', description: 'Premium large-scale artisan masterpieces' }
        ],
        quickReplies: [
          { text: 'Budget Finds', action: 'Show products under 2000' },
          { text: 'Current Offers', action: 'Show current offers' }
        ]
      }
    };
  }

  // Shipping & Tracking
  if (message.includes('shipping') || message.includes('delivery') || message.includes('order status') || message.includes('track')) {
    if (lastOrder && !message.match(/sm\d+/i)) {
      const freshLastOrder = await Order.findById(lastOrder._id).populate('items.product');
      return {
        message: `Your most recent order #${freshLastOrder.orderNumber} is currently **${freshLastOrder.orderStatus.toUpperCase()}**.`,
        type: 'action',
        data: {
          steps: [
            `Status: ${freshLastOrder.orderStatus}`,
            `Estimated Delivery: ${freshLastOrder.estimatedDeliveryDate ? new Date(freshLastOrder.estimatedDeliveryDate).toLocaleDateString() : 'Confirmed soon'}`,
            `Items: ${freshLastOrder.items.length} item(s)`
          ],
          quickReplies: [
            { text: 'View Full Order', action: `redirect:/orders/${freshLastOrder._id}` },
            { text: 'Track Another', action: 'I have another Order ID' }
          ]
        }
      };
    }

    return {
      message: 'We deliver sacred art safely to your doorstep. What would you like to know?',
      type: 'action',
      data: {
        quickReplies: [
          { text: 'Shipping Rates', action: 'What is shipping cost?' },
          { text: 'I have an Order ID', action: 'Track order sm' },
          { text: 'Delivery Times', action: 'How long does delivery take?' }
        ]
      }
    };
  }

  // Default Fallback (Varied)
  const fallbacks = [
    `I'm not quite sure I follow, but I'd love to help you find something special${userName ? ', ' + userName : ''}. Try asking about a specific deity like 'Ganesha' or 'Shiva'.`,
    `I'm still learning the way of the artist! Could you rephrase that? Or would you like to see our most popular sculptures?`,
    `That's a great question! While I might not have a specific answer for that yet, I can certainly help you track an order or browse our collection.`
  ];
  return {
    message: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    type: 'action',
    data: {
      suggestions: [
        '🕉️ Browse divine statues',
        '📦 Check order status',
        '💎 Learn about materials',
        '📞 Talk to support'
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