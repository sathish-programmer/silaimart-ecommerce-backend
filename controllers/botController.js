const { BotQuestion, BotFlow, Product } = require('../models');

exports.getBotFlow = async (req, res) => {
  try {
    const startQuestion = await BotQuestion.findOne({ isStartQuestion: true, isActive: true });
    if (!startQuestion) {
      return res.status(404).json({ message: 'No bot flow configured' });
    }
    
    res.json(startQuestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getQuestion = async (req, res) => {
  try {
    const question = await BotQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const { category, priceRange, tags } = req.body;
    
    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (priceRange) {
      filter.price = {
        $gte: priceRange.min || 0,
        $lte: priceRange.max || 999999
      };
    }
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .limit(6)
      .sort({ rating: -1, createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin functions
exports.createQuestion = async (req, res) => {
  try {
    const question = new BotQuestion(req.body);
    await question.save();
    res.status(201).json({ message: 'Question created successfully', question });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const question = await BotQuestion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json({ message: 'Question updated successfully', question });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await BotQuestion.findByIdAndDelete(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await BotQuestion.find().sort({ order: 1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};