const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

/**
 * POST /api/pincode/check
 * Body: { pincode: "600001" }
 * Returns serviceability + estimated delivery date
 *
 * In production, integrate with Shiprocket / Delhivery / Dunzo API.
 * For now we use a robust offline lookup of major Indian pincodes.
 */

// Major city pincode ranges (simplified but covers most metro/tier-2 cities)
const METRO_RANGES = [
  // Chennai
  { start: 600001, end: 600130, city: 'Chennai', state: 'Tamil Nadu', days: 3 },
  // Coimbatore
  { start: 641001, end: 641110, city: 'Coimbatore', state: 'Tamil Nadu', days: 4 },
  // Bengaluru
  { start: 560001, end: 560110, city: 'Bengaluru', state: 'Karnataka', days: 3 },
  // Mumbai
  { start: 400001, end: 400110, city: 'Mumbai', state: 'Maharashtra', days: 4 },
  // Delhi / NCR
  { start: 110001, end: 110110, city: 'Delhi', state: 'Delhi', days: 4 },
  { start: 121001, end: 122030, city: 'Faridabad/Gurugram', state: 'Haryana', days: 4 },
  { start: 201001, end: 201310, city: 'Noida/Ghaziabad', state: 'Uttar Pradesh', days: 5 },
  // Hyderabad
  { start: 500001, end: 500110, city: 'Hyderabad', state: 'Telangana', days: 3 },
  // Pune
  { start: 411001, end: 411060, city: 'Pune', state: 'Maharashtra', days: 4 },
  // Kolkata
  { start: 700001, end: 700110, city: 'Kolkata', state: 'West Bengal', days: 5 },
  // Ahmedabad
  { start: 380001, end: 380080, city: 'Ahmedabad', state: 'Gujarat', days: 5 },
  // Jaipur
  { start: 302001, end: 302040, city: 'Jaipur', state: 'Rajasthan', days: 5 },
  // Surat
  { start: 395001, end: 395010, city: 'Surat', state: 'Gujarat', days: 5 },
  // Lucknow
  { start: 226001, end: 226030, city: 'Lucknow', state: 'Uttar Pradesh', days: 6 },
  // Kochi
  { start: 682001, end: 682030, city: 'Kochi', state: 'Kerala', days: 4 },
  // Madurai
  { start: 625001, end: 625020, city: 'Madurai', state: 'Tamil Nadu', days: 4 },
  // Vizag
  { start: 530001, end: 530050, city: 'Visakhapatnam', state: 'Andhra Pradesh', days: 5 },
  // Bhopal
  { start: 462001, end: 462040, city: 'Bhopal', state: 'Madhya Pradesh', days: 6 },
  // Indore
  { start: 452001, end: 452020, city: 'Indore', state: 'Madhya Pradesh', days: 6 },
  // Nagpur
  { start: 440001, end: 440035, city: 'Nagpur', state: 'Maharashtra', days: 5 },
  // Chandigarh
  { start: 160001, end: 160062, city: 'Chandigarh', state: 'Chandigarh', days: 5 },
];

// Tier-3 / rural: serviceable but longer delivery
const TIER3_RANGES = [
  // Tamil Nadu districts (e.g. Tirunelveli, Salem, Vellore)
  { start: 627001, end: 635999, state: 'Tamil Nadu', days: 6 },
  // Karnataka districts
  { start: 570001, end: 591999, state: 'Karnataka', days: 7 },
  // AP/Telangana districts
  { start: 515001, end: 535999, state: 'Andhra Pradesh/Telangana', days: 7 },
  // Maharashtra districts
  { start: 413001, end: 445999, state: 'Maharashtra', days: 7 },
  // Gujarat districts
  { start: 360001, end: 396999, state: 'Gujarat', days: 7 },
  // Rajasthan districts
  { start: 303001, end: 345999, state: 'Rajasthan', days: 8 },
  // UP districts
  { start: 202001, end: 285999, state: 'Uttar Pradesh', days: 8 },
  // Bihar
  { start: 800001, end: 855999, state: 'Bihar', days: 8 },
  // West Bengal districts
  { start: 711001, end: 743999, state: 'West Bengal', days: 7 },
  // Kerala
  { start: 670001, end: 695999, state: 'Kerala', days: 5 },
  // Odisha
  { start: 751001, end: 770999, state: 'Odisha', days: 8 },
  // Assam/North East
  { start: 781001, end: 799999, state: 'North East', days: 10 },
  // Jammu & Kashmir / Himachal
  { start: 180001, end: 195999, state: 'J&K / Himachal', days: 10 },
];

const addWorkingDays = (days) => {
  const date = new Date();
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0) added++; // skip Sundays only (we deliver Saturdays)
  }
  return date;
};

const formatDate = (date) =>
  date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

router.post('/check', async (req, res) => {
  const { pincode } = req.body;

  // Validate format
  if (!pincode || !/^\d{6}$/.test(pincode.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid 6-digit pincode'
    });
  }

  const code = parseInt(pincode.trim(), 10);
  const codeStr = pincode.trim();

  // Fetch settings once for global toggles
  let globalCod = true;
  let freeShippingThreshold = 1000;
  try {
    const settings = await Settings.findOne();
    if (settings) {
      globalCod = settings.payment?.cod?.enabled !== false;
      freeShippingThreshold = settings.shipping?.freeShippingThreshold ?? 1000;
      
      if (settings.site?.store?.customPincodes?.length > 0) {
        const customMatch = settings.site.store.customPincodes.find(p => p.pincode === codeStr);
        if (customMatch) {
          const deliveryDate = addWorkingDays(customMatch.deliveryDays);
          return res.json({
            success: true,
            serviceable: true,
            pincode: codeStr,
            city: 'Custom Location',
            state: 'India',
            deliveryDays: customMatch.deliveryDays,
            estimatedDelivery: formatDate(deliveryDate),
            expressAvailable: customMatch.deliveryDays <= 4,
            freeDelivery: customMatch.freeDelivery,
            cod: globalCod && customMatch.codAvailable,
            message: 'Delivery available based on custom rules'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching settings for pincode check:', error);
  }

  // Check metro cities first (fastest delivery)
  for (const range of METRO_RANGES) {
    if (code >= range.start && code <= range.end) {
      const deliveryDate = addWorkingDays(range.days);
      return res.json({
        success: true,
        serviceable: true,
        pincode: pincode.trim(),
        city: range.city,
        state: range.state,
        deliveryDays: range.days,
        estimatedDelivery: formatDate(deliveryDate),
        expressAvailable: range.days <= 4,
        freeDelivery: true, // Will be filtered by threshold on frontend
        cod: globalCod,
        message: `Delivery available in ${range.city}`
      });
    }
  }

  // Check tier-3 cities
  for (const range of TIER3_RANGES) {
    if (code >= range.start && code <= range.end) {
      const deliveryDate = addWorkingDays(range.days);
      return res.json({
        success: true,
        serviceable: true,
        pincode: pincode.trim(),
        state: range.state,
        deliveryDays: range.days,
        estimatedDelivery: formatDate(deliveryDate),
        expressAvailable: false,
        freeDelivery: range.days <= 7, // Will be filtered by threshold on frontend
        cod: globalCod && range.days <= 8,
        message: `Delivery available to ${range.state}`
      });
    }
  }

  // Valid Indian pincode but not in our delivery network yet
  return res.json({
    success: true,
    serviceable: false,
    pincode: pincode.trim(),
    message: 'Sorry, we do not deliver to this pincode yet. Try a nearby city pincode.',
  });
});

module.exports = router;
