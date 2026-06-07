const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load default .env
require('dotenv').config();

// Load environment specific .env if it exists
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
if (fs.existsSync(path.join(__dirname, envFile))) {
   require('dotenv').config({ path: path.join(__dirname, envFile), override: true });
}

const cookieParser = require("cookie-parser");

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
const testRoutes = require('./routes/test');
const masterValuesRoutes = require('./routes/masterValues');
const loyaltyRoutes = require('./routes/loyalty');
const analyticsRoutes = require('./routes/analytics');
const pincodeRoutes = require('./routes/pincode');


const seoMiddleware = require('./middleware/seoMiddleware');

const app = express();

const { apiLimiter, strictLimiter, analyticsLimiter } = require('./middleware/rateLimit');

/* -------------------------------
   IMPORTANT: Cloudflare Support
-------------------------------- */
app.set("trust proxy", 1);   // required for HTTPS + cookies behind Cloudflare
app.use(cookieParser());
app.use(seoMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

/* -------------------------------
   Security
-------------------------------- */
app.use(helmet());

app.use(cors({
   origin: (origin, callback) => {
      // Allow no-origin (mobile apps, Postman) + any localhost + configured envs
      const allowed = [
         process.env.FRONTEND_URL,
         process.env.ADMIN_URL,
         'http://localhost:3000',
         'http://localhost:3001',
         'http://localhost:5173',
         'http://127.0.0.1:3000',
         'http://127.0.0.1:5173',
      ].filter(Boolean);
      if (!origin || allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
         callback(null, true);
      } else {
         callback(new Error(`CORS blocked: ${origin}`));
      }
   },
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key']
}));
app.options('*', cors({
   origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      const allowed = [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean);
      callback(allowed.includes(origin) ? null : new Error('CORS blocked'), allowed.includes(origin));
   },
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key']
}));   // Pre-flight for all routes


/* -------------------------------
   Body Parsing
-------------------------------- */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
// Public read-only routes — NO rate limiting (browsing should never be blocked)
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/master-values', masterValuesRoutes);
app.use('/api/offers', offerRoutes);

// Auth routes — dedicated login limiter applied inside the router
app.use('/api/auth', authRoutes);

// Interaction routes — light apiLimiter on write actions (skip GET via skip() in rateLimit.js)
app.use('/api/reviews', apiLimiter, reviewRoutes);
app.use('/api/wishlist', apiLimiter, wishlistRoutes);
app.use('/api/coupons', apiLimiter, couponRoutes);
app.use('/api/chatbot', apiLimiter, chatbotRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/loyalty', apiLimiter, loyaltyRoutes);
app.use('/api/test', apiLimiter, testRoutes);

// Sensitive routes — strict limiter
app.use('/api/orders', strictLimiter, orderRoutes);
app.use('/orders', strictLimiter, orderRoutes);
app.use('/api/payments', strictLimiter, paymentRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// Analytics — dedicated limiter
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use('/api/pincode', pincodeRoutes); // no rate limit — offline lookup


/* -------------------------------
   SEO & Public Routes
-------------------------------- */
app.get('/sitemap.xml', require('./controllers/sitemapController').getSitemap);

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
   const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
   
   console.error(`[${errorId}] ${req.method} ${req.url}`);
   console.error(`[${errorId}] Message:`, err.message);
   console.error(`[${errorId}] Stack:`, err.stack);
   
   if (err.name === 'ValidationError') {
      return res.status(400).json({ errorId, message: err.message });
   }

   res.status(err.status || 500).json({ 
      errorId,
      message: process.env.NODE_ENV === 'production' 
         ? "Internal Server Error" 
         : err.message 
   });
});

/**
 * Payment Audit Logger
 */
global.paymentAudit = (message, data = {}) => {
   console.log(`[PAYMENT-AUDIT] ${new Date().toISOString()} | ${message}`, JSON.stringify(data));
};

/* -------------------------------
   Server
-------------------------------- */
const PORT = process.env.PORT || 5000;
const startServer = (port) => {
   const server = app.listen(port, () => {
      console.log(`SilaiMart API running on port ${port}`);
   }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
         console.error(`❌ Port ${port} is already in use.`);
         const nextPort = parseInt(port) + 1;
         console.log(`🔄 Attempting to start on port ${nextPort}...`);
         startServer(nextPort);
      } else {
         console.error('❌ Server error:', err);
      }
   });
};

startServer(PORT);
