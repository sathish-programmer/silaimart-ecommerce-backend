/**
 * SEO Normalization Middleware
 * Enforces canonical URL rules: lowercase, no trailing slashes, 301 redirects.
 */
const seoMiddleware = (req, res, next) => {
  // Skip for non-GET requests or static files
  if (req.method !== 'GET' || req.path.includes('.') || req.path.startsWith('/api/')) {
    return next();
  }

  const { path, url } = req;
  let normalizedPath = path;
  let shouldRedirect = false;

  // 1. Enforce Lowercase
  if (normalizedPath !== normalizedPath.toLowerCase()) {
    normalizedPath = normalizedPath.toLowerCase();
    shouldRedirect = true;
  }

  // 2. Remove Trailing Slashes (unless it's the root '/')
  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
    shouldRedirect = true;
  }

  if (shouldRedirect) {
    // Preserve query parameters if they exist
    const queryStr = url.includes('?') ? url.substring(url.indexOf('?')) : '';
    console.log(`[SEO] 301 Redirect: ${url} -> ${normalizedPath}${queryStr}`);
    return res.redirect(301, `${normalizedPath}${queryStr}`);
  }

  next();
};

module.exports = seoMiddleware;
