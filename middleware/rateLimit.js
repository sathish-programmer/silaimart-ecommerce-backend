const rateLimit = require('express-rate-limit');

/**
 * Standard Rate Limiter for general API usage.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 500, // raised: 500 requests per 15min per IP (normal browsing needs ~20 req/page)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET', // skip GET requests entirely — public read traffic is not a security risk
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

/**
 * Strict Limiter for sensitive actions (Auth, Payments).
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 requests per hour (increased from 10 to prevent lockouts)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many attempts. Please try again later.'
  }
});

/**
 * Analytics Limiter to prevent log flooding.
 */
const analyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 batches per minute
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only limit failed attempts if desired, or keep false to limit all
  message: {
    status: 429,
    message: 'Analytics rate limit exceeded.'
  }
});

module.exports = {
  apiLimiter,
  strictLimiter,
  analyticsLimiter
};
