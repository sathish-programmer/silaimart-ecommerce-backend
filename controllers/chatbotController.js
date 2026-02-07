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
        message: `I found ${products.length} beautiful sculptures for you${user ? ', ' + user.name.split(' ')[0] : ''}! Here are some recommendations:`,
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

  // Main Menu / Show Options
  if (message.includes('menu') || message.includes('option') || message.includes('help') || message.includes('start over')) {
    return {
      message: `I'm here to help${user ? ', ' + user.name.split(' ')[0] : ''}! Please choose an option below:`,
      type: 'action',
      data: {
        suggestions: [
          '🕉️ Browse Sculptures',
          '📦 Track Order',
          '🚚 Shipping Info',
          '💰 Pricing & Deals'
        ],
        quickReplies: [
          { text: 'Show Products', action: 'Show me your sculptures' },
          { text: 'Track Order', action: 'Track order' },
          { text: 'Help & Support', action: 'I need help' }
        ]
      }
    };
  }

  // Help and support responses
  if (message.includes('support') || message.includes('problem')) {
    return {
      message: `I'm here to support you${user ? ', ' + user.name.split(' ')[0] : ''}! What do you need assistance with?`,
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

  // Specific prompt for Order ID
  if (message.toLowerCase() === 'track order sm' || message.toLowerCase() === 'i have an order id') {
    return {
      message: "Please enter your full Order ID (e.g., SM123456789) to track your package.",
      type: 'text'
    };
  }

  // Order tracking by ID or keyword
  const orderIdMatch = message.match(/sm\d+[a-z0-9]*/i);
  if (orderIdMatch) {
    const orderId = orderIdMatch[0].toUpperCase();
    const order = await Order.findOne({ orderNumber: orderId }).populate('items.product');

    if (order) {
      let deliveryMsg = '';
      if (order.orderStatus.toLowerCase() === 'delivered') {
        deliveryMsg = order.deliveredAt ? `Delivered on ${new Date(order.deliveredAt).toLocaleDateString()}` : 'Delivered';
      } else {
        deliveryMsg = `Estimated delivery: ${order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : 'Pending confirmation'}`;
      }

      const itemNames = order.items.map(item => `${item.product?.name || 'Item'} (x${item.quantity})`).join(', ');

      const steps = [
        `Status: ${order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}`,
        `Total: ₹${order.total.toLocaleString('en-IN')}`,
        `Items: ${order.items.length} - ${itemNames}`
      ];

      if (order.trackingNumber) steps.push(`Tracking #: ${order.trackingNumber}`);
      if (order.shippingAddress) {
        const addr = order.shippingAddress;
        steps.push(`Ship to: ${addr.name}, ${addr.street || ''}, ${addr.city}, ${addr.state} - ${addr.pincode}`);
      }

      return {
        message: `I found order #${order.orderNumber}. It is currently **${order.orderStatus.toUpperCase()}**. ${deliveryMsg}.`,
        type: 'action',
        data: {
          steps: steps,
          quickReplies: [
            { text: 'View Order Details', action: `redirect:/orders/${order._id}` },
            { text: 'Track Another Order', action: 'Track order' }
          ]
        }
      };
    } else {
      return {
        message: `I couldn't find an order with ID ${orderId}. Please check the ID and try again.`,
        type: 'text'
      };
    }
  }

  // General Order status and tracking inquiry
  if (message.includes('order') && (message.includes('status') || message.includes('track') || message.includes('where'))) {
    if (lastOrder) {
      // Ensure we populate lastOrder if it wasn't already (though lastOrder is passed in args, we might need to fetch it again to populate if not already populated)
      // Assuming lastOrder passed to this function might handle it, but better to re-fetch if needed. 
      // Actually, checking how lastOrder is derived... it's passed into `processMessage`.
      // Getting it fresh is safer for population.
      const freshLastOrder = await Order.findById(lastOrder._id).populate('items.product');

      let deliveryMsg = '';
      if (freshLastOrder.orderStatus.toLowerCase() === 'delivered') {
        deliveryMsg = freshLastOrder.deliveredAt ? `Delivered on ${new Date(freshLastOrder.deliveredAt).toLocaleDateString()}` : 'Delivered';
      } else {
        deliveryMsg = `Estimated delivery: ${freshLastOrder.estimatedDeliveryDate ? new Date(freshLastOrder.estimatedDeliveryDate).toLocaleDateString() : 'Pending confirmation'}`;
      }

      const itemNames = freshLastOrder.items.map(item => `${item.product?.name || 'Item'} (x${item.quantity})`).join(', ');

      const steps = [
        `Status: ${freshLastOrder.orderStatus.charAt(0).toUpperCase() + freshLastOrder.orderStatus.slice(1)}`,
        `Total: ₹${freshLastOrder.total.toLocaleString('en-IN')}`,
        `Items: ${freshLastOrder.items.length} - ${itemNames}`
      ];

      if (freshLastOrder.trackingNumber) steps.push(`Tracking #: ${freshLastOrder.trackingNumber}`);
      if (freshLastOrder.shippingAddress) {
        const addr = freshLastOrder.shippingAddress;
        steps.push(`Ship to: ${addr.name}, ${addr.street || ''}, ${addr.city}, ${addr.state} - ${addr.pincode}`);
      }

      return {
        message: `Your last order #${freshLastOrder.orderNumber} is currently **${freshLastOrder.orderStatus.toUpperCase()}**. ${deliveryMsg}.`,
        type: 'action',
        data: {
          steps: steps,
          quickReplies: [
            { text: 'View Order Details', action: `redirect:/orders/${freshLastOrder._id}` },
            { text: 'Track Another Order', action: 'I need help with another order' }
          ]
        }
      };
    } else {
      return {
        message: user ? `I couldn't find any recent orders for you, ${user.name.split(' ')[0]}.` : 'To track your order, please provide your **Order ID** (e.g., SM123456789) or log in to see your history.',
        type: 'action',
        data: {
          suggestions: [
            'Type "Track order SM..."',
            'Login to view history'
          ],
          quickReplies: [
            { text: 'Login', action: 'redirect:/login' },
            { text: 'I have an Order ID', action: 'Track order SM' }
          ]
        }
      };
    }
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
      message: `Hello${user ? ' ' + user.name.split(' ')[0] : ''}! Welcome to SilaiMart! 🙏 I'm here to help you find the perfect divine sculpture.`,
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

  // Help & Support specific handler
  if (message.includes('help') || message.includes('support') || message.includes('assist')) {
    return {
      message: "Here are some ways I can assist you directly:",
      type: 'action',
      data: {
        suggestions: [
          '📞 Contact our support team',
          '📦 Track an existing order',
          '🔄 Learn about returns & refunds',
          '🚚 Shipping information'
        ],
        quickReplies: [
          { text: 'Contact Support', action: 'redirect:/support' },
          { text: 'Track Order', action: 'redirect:/track-order' },
          { text: 'Return Policy', action: 'redirect:/policy/return' }
        ]
      }
    };
  }

  // Default intelligent response with suggestions
  return {
    message: `I'd love to help you find the perfect sculpture${user ? ', ' + user.name.split(' ')[0] : ''}! Here are some things I can assist you with:`,
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