const { Product, Category, Blog } = require('../models');

// Simple in-memory cache
let cachedSitemap = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Dynamic Sitemap Controller
 * Generates XML on-the-fly for products, categories, and blogs.
 */
exports.getSitemap = async (req, res) => {
  try {
    const now = Date.now();
    if (cachedSitemap && (now - cacheTimestamp < CACHE_DURATION)) {
      res.header('Content-Type', 'application/xml');
      return res.send(cachedSitemap);
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://silaimart.in';

    // 1. Fetch Data concurrently
    const [products, categories, blogs] = await Promise.all([
      Product.find({ isActive: true, stock: { $gt: 0 } }).select('_id name images updatedAt').lean(),
      Category.find({ isActive: true }).select('_id name updatedAt').lean(),
      Blog.find({ status: 'published' }).select('slug updatedAt').lean()
    ]);

    // 2. Static Pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/shop', priority: '0.9', changefreq: 'daily' },
      { url: '/about', priority: '0.5', changefreq: 'monthly' },
      { url: '/support', priority: '0.5', changefreq: 'monthly' },
      { url: '/blogs', priority: '0.7', changefreq: 'weekly' }
    ];

    // 3. Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Add Static Pages
    staticPages.forEach(page => {
      xml += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // Add Categories
    categories.forEach(cat => {
      xml += `
  <url>
    <loc>${baseUrl}/category/${cat._id}</loc>
    <lastmod>${cat.updatedAt?.toISOString() || new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Add Products
    products.forEach(prod => {
      xml += `
  <url>
    <loc>${baseUrl}/product/${prod._id}</loc>
    <lastmod>${prod.updatedAt?.toISOString() || new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>`;
      
      // Add Product Images for SEO
      if (prod.images && prod.images.length > 0) {
        prod.images.forEach(img => {
          if (img.url) {
            xml += `
    <image:image>
      <image:loc>${img.url}</image:loc>
      <image:title>${prod.name}</image:title>
    </image:image>`;
          }
        });
      }
      
      xml += `
  </url>`;
    });

    // Add Blogs
    blogs.forEach(blog => {
      xml += `
  <url>
    <loc>${baseUrl}/blog/${blog.slug}</loc>
    <lastmod>${blog.updatedAt?.toISOString() || new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    // 4. Cache and Send
    cachedSitemap = xml;
    cacheTimestamp = now;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Sitemap] Generation failed:', error);
    res.status(500).send('Error generating sitemap');
  }
};
