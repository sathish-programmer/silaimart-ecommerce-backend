const MasterValues = require('../models/MasterValues');

exports.getMasterValues = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (category) {
      const masterValue = await MasterValues.findOne({ 
        category, 
        isActive: true 
      });
      
      if (!masterValue) {
        return res.status(404).json({ 
          success: false, 
          message: 'Master values not found for this category' 
        });
      }
      
      const activeValues = masterValue.values
        .filter(value => value.isActive)
        .sort((a, b) => a.order - b.order);
      
      return res.json({
        success: true,
        category: masterValue.category,
        values: activeValues
      });
    }
    
    // Get all master values
    const masterValues = await MasterValues.find({ isActive: true });
    const result = {};
    
    masterValues.forEach(mv => {
      result[mv.category] = mv.values
        .filter(value => value.isActive)
        .sort((a, b) => a.order - b.order);
    });
    
    res.json({
      success: true,
      masterValues: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.updateMasterValues = async (req, res) => {
  try {
    const { category } = req.params;
    const { values } = req.body;
    
    let masterValue = await MasterValues.findOne({ category });
    
    if (!masterValue) {
      masterValue = new MasterValues({ category, values });
    } else {
      masterValue.values = values;
    }
    
    await masterValue.save();
    
    res.json({
      success: true,
      message: 'Master values updated successfully',
      masterValue
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.addMasterValue = async (req, res) => {
  try {
    const { category } = req.params;
    const { label, value, description, metadata } = req.body;
    
    let masterValue = await MasterValues.findOne({ category });
    
    if (!masterValue) {
      masterValue = new MasterValues({ 
        category, 
        values: [{ label, value, description, metadata }] 
      });
    } else {
      const maxOrder = Math.max(...masterValue.values.map(v => v.order || 0), 0);
      masterValue.values.push({ 
        label, 
        value, 
        description, 
        metadata,
        order: maxOrder + 1 
      });
    }
    
    await masterValue.save();
    
    res.json({
      success: true,
      message: 'Master value added successfully',
      masterValue
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.deleteMasterValue = async (req, res) => {
  try {
    const { category, valueId } = req.params;
    
    const masterValue = await MasterValues.findOne({ category });
    
    if (!masterValue) {
      return res.status(404).json({ 
        success: false, 
        message: 'Master values not found' 
      });
    }
    
    masterValue.values = masterValue.values.filter(
      value => value._id.toString() !== valueId
    );
    
    await masterValue.save();
    
    res.json({
      success: true,
      message: 'Master value deleted successfully',
      masterValue
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};