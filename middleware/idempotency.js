const IdempotencyKey = require('../models/IdempotencyKey');

/**
 * Idempotency Middleware
 * Ensures that a request with the same 'Idempotency-Key' header 
 * is only processed once.
 */
const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  
  if (!key) {
    return next();
  }

  try {
    const existing = await IdempotencyKey.findOne({ key, userId: req.user?._id });

    if (existing) {
      console.log(`[Idempotency] Replaying response for key: ${key}`);
      return res.status(existing.responseStatus).json(existing.responseBody);
    }

    // Wrap res.json to capture the response for future replays
    const originalJson = res.json;
    res.json = function(body) {
      // Only store successful or 4xx responses, skip 5xx to allow retries
      if (res.statusCode < 500) {
        IdempotencyKey.create({
          key,
          userId: req.user?._id,
          responseStatus: res.statusCode,
          responseBody: body
        }).catch(err => console.error('[Idempotency] Failed to save key:', err));
      }
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    console.error('[Idempotency] Middleware error:', error);
    next();
  }
};

module.exports = idempotency;
