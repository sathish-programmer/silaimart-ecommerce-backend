const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Order = require('./Order');
const Blog = require('./Blog');
const Coupon = require('./Coupon');
const Review = require('./Review');
const Banner = require('./Banner');
const Settings = require('./Settings');
const { BotQuestion, BotFlow } = require('./BotQuestion');
const CustomizationRequest = require('./CustomizationRequest');
const LoyaltyTransaction = require('./LoyaltyTransaction');

module.exports = {
  User,
  Product,
  Category,
  Order,
  Blog,
  Coupon,
  Review,
  Banner,
  Settings,
  BotQuestion,
  BotFlow,
  CustomizationRequest,
  LoyaltyTransaction
};