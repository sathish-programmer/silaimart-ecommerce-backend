const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const couponRoutes = require('./routes/coupons');
const blogRoutes = require('./routes/blogs');
const chatbotRoutes = require('./routes/chatbot');
const reviewRoutes = require('./routes/reviews');
const wishlistRoutes = require('./routes/wishlist');
const bannerRoutes = require('./routes/banners');
const settingsRoutes = require('./routes/settings');
const policyRoutes = require('./routes/policies');
const notificationRoutes = require('./routes/notifications');
const offerRoutes = require('./routes/offers');
const adminRoutes = require('./routes/admin');

const app = express();

/* -------------------------------
   IMPORTANT: Cloudflare Support
-------------------------------- */
app.set("trust proxy", 1);   // required for HTTPS + cookies behind Cloudflare

/* -------------------------------
   Security
-------------------------------- */
app.use(helmet());

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,          // https://silaimart.in
    process.env.ADMIN_URL,             // https://admin.silaimart.in
    "http://localhost:3000",
    "http://localhost:3001"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

/* -------------------------------
   Rate Limiting
-------------------------------- */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

/* -------------------------------
   Body Parsing
-------------------------------- */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* -------------------------------
   Database
-------------------------------- */
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB error:", err));

/* -------------------------------
   Routes
-------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/admin', adminRoutes);

/* -------------------------------
   Health Check
-------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

/* -------------------------------
   Error Handler
-------------------------------- */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

/* -------------------------------
   Server
-------------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SilaiMart API running on port ${PORT}`);
});
