const mongoose = require('mongoose');
const Policy = require('../models/Policy');
require('dotenv').config();

const defaultPolicies = [
  {
    type: 'terms',
    title: 'Terms & Conditions',
    content: `
      <h3>Welcome to SilaiMart</h3>
      <p>These terms and conditions outline the rules and regulations for the use of SilaiMart's Website.</p>
      
      <h3>1. Acceptance of Terms</h3>
      <p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>
      
      <h3>2. Products and Services</h3>
      <ul>
        <li>All products are high-quality and may have slight variations due to their nature</li>
        <li>Product images are for reference only and actual products may vary slightly</li>
        <li>We reserve the right to modify or discontinue products without notice</li>
      </ul>
      
      <h3>3. Pricing and Payment</h3>
      <ul>
        <li>All prices are in Indian Rupees (INR) and include applicable taxes</li>
        <li>We accept various payment methods including cards, UPI, and wallets</li>
        <li>Prices are subject to change without prior notice</li>
      </ul>
      
      <h3>4. User Accounts</h3>
      <p>You are responsible for maintaining the confidentiality of your account and password.</p>
      
      <h3>5. Intellectual Property</h3>
      <p>All content on this website is owned by SilaiMart and protected by copyright laws.</p>
      
      <h3>6. Contact Information</h3>
      <p>For any questions regarding these terms, please contact us at silaimartindia@gmail.com</p>
    `,
    isActive: true
  },
  {
    type: 'return',
    title: 'Return & Exchange Policy',
    content: `
      <h3>Return & Exchange Policy</h3>
      <p>At SilaiMart, we want you to be completely satisfied with your purchase.</p>
      
      <h3>Return Period</h3>
      <ul>
        <li><strong>7 days</strong> from delivery for returns</li>
        <li><strong>3 days</strong> from delivery for exchanges</li>
        <li>Items must be in original condition with tags</li>
      </ul>
      
      <h3>Eligible Items</h3>
      <ul>
        <li>Damaged or defective products</li>
        <li>Wrong item delivered</li>
        <li>Significantly different from description</li>
      </ul>
      
      <h3>Return Process</h3>
      <ol>
        <li>Contact customer service within return period</li>
        <li>Provide order number and reason</li>
        <li>Pack item securely in original packaging</li>
        <li>Schedule pickup or drop at our location</li>
      </ol>
      
      <h3>Refund Timeline</h3>
      <p>Refunds processed within <strong>5-7 business days</strong> after inspection.</p>
      
      <p><strong>Contact:</strong> silaimartindia@gmail.com</p>
    `,
    isActive: true
  },
  {
    type: 'cancellation',
    title: 'Cancellation Policy',
    content: `
      <h3>Order Cancellation Policy</h3>
      
      <h3>When You Can Cancel</h3>
      <ul>
        <li><strong>Before Processing:</strong> Free cancellation</li>
        <li><strong>Within 2 hours:</strong> Usually possible</li>
        <li><strong>Before Shipping:</strong> May incur processing fee</li>
      </ul>
      
      <h3>How to Cancel</h3>
      <ol>
        <li>Go to "My Orders" in your account</li>
        <li>Click "Cancel Order"</li>
        <li>Select cancellation reason</li>
        <li>Confirm cancellation</li>
      </ol>
      
      <h3>Cancellation Charges</h3>
      <ul>
        <li><strong>Free:</strong> Before processing</li>
        <li><strong>Processing fee:</strong> If being prepared</li>
        <li><strong>No cancellation:</strong> Once shipped</li>
      </ul>
      
      <h3>Refund Timeline</h3>
      <ul>
        <li><strong>Online payments:</strong> 3-5 business days</li>
        <li><strong>UPI/Wallet:</strong> Instant to 24 hours</li>
      </ul>
      
      <p><strong>Contact:</strong> silaimartindia@gmail.com</p>
    `,
    isActive: true
  },
  {
    type: 'privacy',
    title: 'Privacy Policy',
    content: `
      <h3>Privacy Policy</h3>
      <p>SilaiMart respects your privacy and protects your personal information.</p>
      
      <h3>Information We Collect</h3>
      <ul>
        <li>Name, email, phone, address</li>
        <li>Payment information (securely processed)</li>
        <li>Website usage data</li>
      </ul>
      
      <h3>How We Use Information</h3>
      <ul>
        <li>Process and fulfill orders</li>
        <li>Provide customer support</li>
        <li>Send order updates</li>
        <li>Improve our services</li>
      </ul>
      
      <h3>Data Security</h3>
      <ul>
        <li>SSL encryption for transactions</li>
        <li>Secure servers and databases</li>
        <li>Limited access to information</li>
      </ul>
      
      <h3>Your Rights</h3>
      <ul>
        <li>Access your information</li>
        <li>Correct inaccurate data</li>
        <li>Delete your account</li>
        <li>Opt-out of marketing</li>
      </ul>
      
      <p><strong>Contact:</strong> silaimartindia@gmail.com</p>
    `,
    isActive: true
  },
  {
    type: 'shipping',
    title: 'Shipping Policy',
    content: `
      <h3>Shipping & Delivery Policy</h3>
      
      <h3>Shipping Options</h3>
      <ul>
        <li><strong>Standard:</strong> 5-7 days</li>
        <li><strong>Express:</strong> 2-3 days</li>
        <li><strong>Free Shipping:</strong> Orders above ₹1,000</li>
      </ul>
      
      <h3>Delivery Areas</h3>
      <ul>
        <li>Pan India delivery available</li>
        <li>Metro cities: Faster delivery</li>
        <li>Remote areas: Additional 2-3 days</li>
      </ul>
      
      <h3>Order Processing</h3>
      <ul>
        <li>Standard products: 1-2 business days</li>
        <li>Customized items: 7-14 days</li>
      </ul>
      
      <h3>Packaging</h3>
      <ul>
        <li>Eco-friendly and secure materials</li>
        <li>Extra protection for fragile items</li>
        <li>Comprehensive quality checks before dispatch</li>
      </ul>
      
      <h3>Tracking</h3>
      <ul>
        <li>SMS and email notifications</li>
        <li>Real-time tracking in account</li>
        <li>Delivery partner tracking</li>
      </ul>
      
      <p><strong>Contact:</strong> silaimartindia@gmail.com</p>
    `,
    isActive: true
  }
];

async function populatePolicies() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silaimart');
    console.log('Connected to MongoDB');

    for (const policyData of defaultPolicies) {
      await Policy.findOneAndUpdate(
        { type: policyData.type },
        policyData,
        { upsert: true, new: true }
      );
      console.log(`✓ ${policyData.title} policy created/updated`);
    }

    console.log('All policies populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating policies:', error);
    process.exit(1);
  }
}

populatePolicies();