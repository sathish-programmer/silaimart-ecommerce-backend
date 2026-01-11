const Policy = require('../models/Policy');

// Get all policies (public)
exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ isActive: true });
    res.json({ policies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get policy by type (public)
exports.getPolicyByType = async (req, res) => {
  try {
    const policy = await Policy.findOne({ 
      type: req.params.type, 
      isActive: true 
    });
    
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }
    
    res.json({ policy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all policies (admin)
exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.find().sort({ type: 1 });
    res.json({ policies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create or update policy (admin)
exports.upsertPolicy = async (req, res) => {
  try {
    const { type, title, content, isActive } = req.body;
    
    const policy = await Policy.findOneAndUpdate(
      { type },
      { 
        title, 
        content, 
        isActive,
        lastUpdated: new Date()
      },
      { 
        new: true, 
        upsert: true 
      }
    );
    
    res.json({ 
      message: 'Policy updated successfully', 
      policy 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete policy (admin)
exports.deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findOneAndDelete({ type: req.params.type });
    
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }
    
    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};