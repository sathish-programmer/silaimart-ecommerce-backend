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

  // Generic Greetings
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    const greetings = [
      `Hello${userName ? ' ' + userName : ''}! Welcome to SilaiMart. How can I help you find what you're looking for today?`,
      `Hi there! Welcome to SilaiMart. I'm here to assist you with your shopping experience.`,
      `Namaste! Hope you're having a great day. How can I help you explore our collection?`
    ];
    return {
      message: greetings[Math.floor(Math.random() * greetings.length)],
      type: 'action',
      data: {
        quickReplies: [
          { text: 'Browse Products', action: 'Show me your products' },
          { text: 'New Arrivals', action: 'What are your latest items?' },
          { text: 'Best Sellers', action: 'What are your most popular products?' },
          { text: 'Check Categories', action: 'Show me all categories' }
        ]
      }
    };
  }

  // Enhanced product search
  const productKeywords = ['product', 'item', 'buy', 'shop', 'order', 'decor', 'gift', 'pooja', 'sculpture', 'statue', 'furniture', 'painting', 'handicraft', 'clothing', 'home', 'accessories', 'art', 'jewelry'];
  const hasProductKeyword = productKeywords.some(keyword => message.includes(keyword));

  if (hasProductKeyword || message.includes('show') || message.includes('find') || message.includes('search')) {
    const products = await searchProducts(message);
    if (products.length > 0) {
      const responses = [
        `I've found some items for you${userName ? ', ' + userName : ''}. Here are the top matches from our collection:`,
        `Based on your request, I recommend these products:`,
        `Here are some items that might be what you're looking for:`
      ];
      return {
        message: responses[Math.floor(Math.random() * responses.length)],
        type: 'product',
        data: {
          products: products.slice(0, 6),
          suggestions: [
            'Tell me more about a product',
            'Do you have other categories?',
            'What are your best sellers?'
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
            'Browse Home Decor',
            'Show Best Sellers',
            'Check New Arrivals'
          ]
        }
      };
    }
  }

  // Help & Support
  if (message.includes('help') || message.includes('support') || message.includes('assist') || message.includes('menu')) {
    return {
      message: `I'm here to ensure your experience with SilaiMart is seamless${userName ? ', ' + userName : ''}. What can I guide you with today?`,
      type: 'action',
      data: {
        suggestions: [
          '📦 Track an existing order',
          '🚚 Shipping & Delivery info',
          '🔄 Returns & Refunds',
          '💳 Payment issues',
          '📞 Contact Customer Care'
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
            `Estimated Delivery: ${freshLastOrder.estimatedDeliveryDate ? new Date(freshLastOrder.estimatedDeliveryDate).toLocaleDateString() : 'Will be updated soon'}`,
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
      message: 'We deliver products safely to your doorstep. What would you like to know?',
      type: 'action',
      data: {
        quickReplies: [
          { text: 'Shipping Rates', action: 'What is shipping cost?' },
          { text: 'I have an Order ID', action: 'Track order' },
          { text: 'Delivery Times', action: 'How long does delivery take?' }
        ]
      }
    };
  }

  // Default Fallback
  const fallbacks = [
    `I'm not quite sure I follow, but I'd love to help you find something special${userName ? ', ' + userName : ''}. Try asking about our latest products!`,
    `I'm still learning! Could you rephrase that? Or would you like to see our most popular items?`,
    `That's a great question! While I might not have a specific answer for that yet, I can certainly help you track an order or browse our collection.`
  ];
  return {
    message: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    type: 'action',
    data: {
      suggestions: [
        '🛍️ Browse collection',
        '📦 Check order status',
        '✨ View new arrivals',
        '📞 Talk to support'
      ]
    }
  };
}

// Search products based on message
async function searchProducts(message) {
  const keywords = extractKeywords(message);

  const query = {
    $and: [
      {
        $or: [
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
          { tags: { $in: keywords } },
          { 'specifications.type': { $regex: keywords.join('|'), $options: 'i' } },
          { 'specifications.collection': { $regex: keywords.join('|'), $options: 'i' } }
        ]
      },
      { isActive: true }
    ]
  };

  return await Product.find(query)
    .populate('category', 'name')
    .limit(8)
    .select('name price discountPrice images category specifications sculptureDetails');
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