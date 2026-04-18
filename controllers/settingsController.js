const { Settings } = require('../models');

// Get settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get public settings (for frontend)
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Only return public settings
    const publicSettings = {
      site: {
        name: settings.site?.name || 'SilaiMart',
        tagline: settings.site?.tagline || 'Divine Art to Your Doorstep'
      },
      payment: {
        razorpay: { 
          enabled: settings.payment?.razorpay?.enabled || false,
          keyId: settings.payment?.razorpay?.keyId || process.env.RAZORPAY_KEY_ID || ''
        },
        stripe: { enabled: settings.payment?.stripe?.enabled || false },
        cod: { 
          enabled: settings.payment?.cod?.enabled === true,
          minimumAmount: settings.payment?.cod?.minimumAmount ?? 0,
          maximumAmount: settings.payment?.cod?.maximumAmount ?? 5000
        },
        qr: {
          enabled: settings.payment?.qr?.enabled || false,
          upiId: settings.payment?.qr?.upiId || 'silaimart@paytm',
          merchantName: settings.payment?.qr?.merchantName || 'SilaiMart'
        }
      },
      shipping: {
        freeShippingThreshold: settings.shipping?.freeShippingThreshold ?? 1000,
        standardShipping: settings.shipping?.standardShipping ?? 50,
        expressShipping: settings.shipping?.expressShipping ?? 150,
        internationalShipping: settings.shipping?.internationalShipping || false,
        estimatedDelivery: settings.shipping?.estimatedDelivery || {
          standard: '5-7 business days',
          express: '2-3 business days'
        }
      },
      tax: {
        enabled: settings.tax?.enabled ?? true,
        rate: settings.tax?.rate ?? 18,
        inclusive: settings.tax?.inclusive ?? false
      }
    };
    
    res.json({ success: true, settings: publicSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update settings (Admin only)
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      // Recursive deep merge helper
      const deepMerge = (target, source) => {
        Object.keys(source).forEach(key => {
          if (
            source[key] !== null &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key])
          ) {
            if (!target[key] || typeof target[key] !== 'object') {
              target[key] = {};
            }
            deepMerge(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        });
      };
      deepMerge(settings, req.body);
      settings.markModified('payment');
      settings.markModified('shipping');
      settings.markModified('tax');
      settings.markModified('loyalty');
    }
    
    await settings.save();
    
    res.json({ 
      success: true, 
      message: 'Settings updated successfully', 
      settings 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update specific setting section
exports.updateSettingSection = async (req, res) => {
  try {
    const { section } = req.params;
    const settings = await Settings.getSettings();
    
    if (!settings[section]) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid settings section' 
      });
    }
    
    settings[section] = { ...settings[section], ...req.body };
    await settings.save();
    
    res.json({ 
      success: true, 
      message: `${section} settings updated successfully`, 
      settings: settings[section] 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reset settings to default
exports.resetSettings = async (req, res) => {
  try {
    await Settings.deleteMany({});
    const settings = await Settings.getSettings();
    
    res.json({ 
      success: true, 
      message: 'Settings reset to default', 
      settings 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};