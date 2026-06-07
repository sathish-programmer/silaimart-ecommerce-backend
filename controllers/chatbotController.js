const { Chatbot, Conversation } = require('../models/Chatbot');
const { Product, User, Order } = require('../models');
const { GoogleGenAI } = require('@google/genai');

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
      lastOrder = await Order.findOne({ user: userId }).sort({ createdAt: -1 }).populate('items.product');
    } catch (err) {
      console.error('Error fetching user context:', err);
    }
  }

  const userName = user ? user.name.split(' ')[0] : 'Guest';

  // Check for predefined admin responses first (override AI)
  for (const response of bot?.responses || []) {
    if (response.isActive && response.trigger.some(trigger =>
      message.toLowerCase().includes(trigger.toLowerCase())
    )) {
      return {
        message: response.response,
        type: 'action',
        data: { suggestions: ['menu'] }
      };
    }
  }

  // Intercept 'menu' or 'help' command for quick access
  if (message === 'menu' || message === 'help' || message.includes('support')) {
    return {
      message: `Here are some quick options to help you navigate, ${userName}:`,
      type: 'action',
      data: {
        suggestions: [
          '🛍️ Browse collection',
          '📦 Check order status',
          '🚚 Shipping & Delivery',
          '🔄 Returns info',
          '📞 Contact Support'
        ]
      }
    };
  }

  // Check if GEMINI_API_KEY is configured
  if (!process.env.GEMINI_API_KEY) {
    return {
      message: `Hi ${userName}! My AI brain isn't connected yet. To enable real-time, dynamic AI chat, please add a valid **GEMINI_API_KEY** to the \`backend/.env\` file. In the meantime, you can browse our collections manually.`,
      type: 'action',
      data: {
        suggestions: ['🛍️ Browse Products', '📦 Check Orders', '📞 Contact Support']
      }
    };
  }

  try {
    // 1. Gather context to inject into AI
    const popularProducts = await getPopularProducts();
    const catalogSnippet = popularProducts.map(p => `- ${p.name} (₹${p.price})`).join('\n');
    
    let orderContext = 'User has no recent orders.';
    if (lastOrder) {
      orderContext = `Recent Order #${lastOrder.orderNumber}: Status is ${lastOrder.orderStatus}. Total: ₹${lastOrder.total}. Items: ${lastOrder.items.map(i => i.product?.name).join(', ')}. Estimated delivery: ${lastOrder.estimatedDeliveryDate ? new Date(lastOrder.estimatedDeliveryDate).toLocaleDateString() : 'Pending'}.`;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are SilaiMart Assistant, a highly intelligent, polite, and brief e-commerce assistant for an Indian premium product store named SilaiMart. 
Do not talk about sculptures unless explicitly asked; refer to products generally as "premium products", "home decor", or "items".

User's Name: ${userName}
User's Message: "${userMessage}"

--- CONTEXT ---
Order History: ${orderContext}
Popular Products in Catalog:
${catalogSnippet}
---------------

Your job is to answer the user's question directly based on the context provided. Keep your response conversational, helpful, and concise (1-3 sentences max). If they ask about their order, use the Order History context to tell them the exact status. If they ask for recommendations, suggest items from the Popular Products catalog. Do NOT hallucinate products that aren't in the catalog snippet. Format your response cleanly using markdown if needed.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    // Determine if we should attach product cards visually
    const responseText = response.text;
    const hasProductKeyword = ['buy', 'shop', 'product', 'recommend', 'show'].some(kw => message.includes(kw));

    if (hasProductKeyword) {
      const searchRes = await searchProducts(message);
      if (searchRes.length > 0) {
        return {
          message: responseText,
          type: 'product',
          data: {
            products: searchRes.slice(0, 4),
            suggestions: ['Show me more', 'Track my order', 'Talk to support']
          }
        };
      }
    }

    return {
      message: responseText,
      type: 'action',
      data: {
        suggestions: ['🛍️ Shop', '🚚 Track Order', '📞 Help']
      }
    };

  } catch (err) {
    console.error('Gemini API error:', err);
    return {
      message: `I'm having a little trouble connecting to my AI brain right now. Please try again in a moment!`,
      type: 'action',
      data: {
        suggestions: ['🛍️ Browse Products', '📞 Contact Support']
      }
    };
  }
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
    .select('name price discountPrice images category specifications productDetails');
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