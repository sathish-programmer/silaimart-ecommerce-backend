const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

const getBaseTemplate = (title, content, preheader = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@1,700&display=swap');
    body { background-color: #faf9f6; margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #faf9f6; padding: 40px 0; }
    .main-table { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.03); border: 1px solid #f0eee8; }
    .header { background: linear-gradient(135deg, #1c1917 0%, #44403c 100%); padding: 60px 40px; text-align: center; }
    .logo { color: #f59e0b; font-size: 32px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 8px; }
    .slogan { color: #a8a29e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; margin-top: 8px; }
    .content { padding: 50px 40px; color: #44403c; line-height: 1.6; }
    .footer { padding: 40px; background-color: #faf9f6; text-align: center; font-size: 12px; color: #a8a29e; }
    .button { display: inline-block; background-color: #78350f; color: #ffffff !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; transition: background 0.3s; margin-top: 25px; }
    .card { background-color: #faf9f6; border-radius: 16px; padding: 30px; margin: 25px 0; border: 1px solid #f0eee8; }
    .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #a8a29e; margin-bottom: 12px; display: block; }
    .badge { display: inline-block; padding: 6px 12px; background-color: #fef3c7; color: #92400e; border-radius: 99px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
    h1 { font-family: 'Playfair Display', serif; font-size: 32px; color: #1c1917; margin-bottom: 24px; font-style: italic; }
    h2 { font-size: 20px; font-weight: 900; color: #1c1917; margin-bottom: 20px; letter-spacing: -0.01em; }
    .divider { height: 1px; background-color: #f0eee8; margin: 40px 0; }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
  <div class="wrapper">
    <table class="main-table" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="header">
          <div class="logo">SILAIMART</div>
          <div class="slogan">Your Premium Shopping Destination</div>
        </td>
      </tr>
      <tr>
        <td class="content">${content}</td>
      </tr>
      <tr>
        <td class="footer">
          <p style="margin-bottom: 15px;">&copy; ${new Date().getFullYear()} SilaiMart India. All rights reserved.</p>
          <p>You're receiving this because you're a valued customer of SilaiMart.</p>
          <div style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/policy/privacy" style="color: #78350f; text-decoration: none; font-weight: 700; margin: 0 10px;">Privacy Policy</a>
            <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/support" style="color: #78350f; text-decoration: none; font-weight: 700; margin: 0 10px;">Support</a>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

const sendOrderConfirmation = async (order, user) => {
  const content = `
    <h1>Order Confirmed</h1>
    <p>Hi ${user.name},</p>
    <p>Thank you for your order! We've received it and are currently processing it.</p>
    
    <div class="card">
      <span class="label">Order Summary</span>
      <div style="font-size: 24px; font-weight: 900; color: #1c1917; margin-bottom: 15px;">#${order.orderNumber}</div>
      <div style="display: flex; gap: 20px; margin-bottom: 10px;">
        <div style="flex: 1;"><span class="label">Total Amount</span><div style="font-weight: 700;">₹${order.total.toLocaleString()}</div></div>
        <div style="flex: 1;"><span class="label">Payment Method</span><div style="font-weight: 700;">${order.paymentMethod.toUpperCase()}</div></div>
      </div>
      ${order.estimatedDeliveryDate ? `<div><span class="label">Expected Delivery</span><div style="font-weight: 700;">${new Date(order.estimatedDeliveryDate).toLocaleDateString()}</div></div>` : ''}
    </div>

    <h2>Items Ordered</h2>
    ${order.items.map(item => `
      <div style="padding: 15px 0; border-bottom: 1px solid #f0eee8; display: flex; align-items: center;">
        <div style="flex-grow: 1;">
          <div style="font-weight: 700; color: #1c1917;">${item.product.name}</div>
          <div style="font-size: 13px; color: #a8a29e;">Quantity: ${item.quantity} | ₹${(item.discountPrice || item.price).toLocaleString()}</div>
        </div>
      </div>
    `).join('')}
    
    <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/profile" class="button">Track Your Order</a>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Order Confirmation: ${order.orderNumber}`,
    html: getBaseTemplate('Order Confirmed', content, 'Your SilaiMart order is confirmed and being prepared.')
  });
};

const sendOrderStatusUpdate = async (order, user, oldStatus, newStatus) => {
  try {
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      processing: 'Your order is now being processed.',
      shipped: `Your order has been shipped${order.trackingNumber ? ` with tracking number: ${order.trackingNumber}` : ''}.`,
      delivered: 'Your order has been delivered successfully!',
      cancelled: 'Your order has been cancelled. Any payment made will be refunded within 3-5 business days.',
      refunded: 'Your refund has been processed successfully. It should reflect in your account within 3-5 business days.',
      unpaid: 'Your order payment is pending. Please complete the payment to confirm your order.'
    };

    const statusTitles = {
      confirmed: 'Order Confirmed',
      processing: 'Processing Order',
      shipped: 'On The Way',
      delivered: 'Delivered',
      cancelled: 'Order Cancelled',
      refunded: 'Refund Processed',
      unpaid: 'Payment Pending'
    };

    const content = `
      <h1>${statusTitles[newStatus]}</h1>
      <p>Hi ${user.name},</p>
      <p>${statusMessages[newStatus]}</p>
      
      <div class="card">
        <span class="label">Order ID</span>
        <div style="font-size: 20px; font-weight: 900; color: #1c1917; margin-bottom: 15px;">${order.orderNumber}</div>
        <div class="badge">${newStatus.toUpperCase()}</div>
        
        <div style="margin-top: 20px;">
          ${order.trackingNumber ? `<span class="label">Tracking Number</span><div style="font-weight: 700;">${order.trackingNumber}</div>` : ''}
          ${order.deliveryNotes ? `<div style="margin-top: 15px;"><span class="label">Notes</span><p style="margin: 0; font-size: 14px;">${order.deliveryNotes}</p></div>` : ''}
        </div>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/profile" class="button">See Your Order Status</a>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
      to: user.email,
      subject: `Order Update: ${order.orderNumber}`,
      html: getBaseTemplate(statusTitles[newStatus], content, statusMessages[newStatus])
    });
  } catch (error) {
    console.error('Error sending order status email:', error);
    throw error;
  }
};

const sendDeliveryDateUpdate = async (order, user) => {
  const content = `
    <h1>Delivery Updated</h1>
    <p>Hi ${user.name},</p>
    <p>There has been a slight change in your estimated delivery date. We are working hard to get your order to you as quickly as possible.</p>
    
    <div class="card">
      <span class="label">Order ID</span>
      <div style="font-weight: 900; color: #1c1917; margin-bottom: 15px;">${order.orderNumber}</div>
      <span class="label">New Expected Delivery</span>
      <div style="font-size: 24px; font-weight: 900; color: #78350f;">${new Date(order.estimatedDeliveryDate).toLocaleDateString()}</div>
      ${order.deliveryNotes ? `<div style="margin-top: 15px;"><span class="label">Reason</span><p style="margin: 0; font-size: 14px;">${order.deliveryNotes}</p></div>` : ''}
    </div>
    
    <p style="font-size: 14px; color: #a8a29e;">We apologize for any inconvenience caused.</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Timeline Shift: ${order.orderNumber}`,
    html: getBaseTemplate('Delivery Updated', content, 'The estimated delivery for your order has changed.')
  });
};

const sendOfferNotification = async (user, offer) => {
  const content = `
    <h1>Exclusive Offer</h1>
    <p>Hi ${user.name},</p>
    <p>A special opportunity has arrived for you to shop your favorite products.</p>
    
    <div style="background: linear-gradient(135deg, #78350f 0%, #a16207 100%); color: white; padding: 40px; border-radius: 24px; text-align: center; margin: 30px 0; box-shadow: 0 15px 30px rgba(120,53,15,0.2);">
      <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 15px; opacity: 0.8;">Special Offer</div>
      <h2 style="color: white; margin: 0; font-family: 'Playfair Display', serif; font-size: 32px; font-style: italic;">${offer.title}</h2>
      <p style="margin: 15px 0; font-size: 16px; opacity: 0.9;">${offer.description}</p>
      ${offer.discountPercentage ? `<div style="font-size: 48px; font-weight: 900; margin: 20px 0;">${offer.discountPercentage}% OFF</div>` : ''}
      ${offer.couponCode ? `
        <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.3); font-family: monospace; font-size: 20px; letter-spacing: 0.2em;">
          CODE: ${offer.couponCode}
        </div>
      ` : ''}
    </div>
    
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/shop" class="button">Shop Now</a>
    </div>
    
    ${offer.validUntil ? `<p style="text-align: center; font-size: 12px; color: #a8a29e; margin-top: 20px;">*Valid until ${new Date(offer.validUntil).toLocaleDateString()}</p>` : ''}
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Special Offer: ${offer.title}`,
    html: getBaseTemplate('Special Offer', content, offer.description)
  });
};

const sendEmail = async (options) => {
  const content = `
    <h1>Notification from SilaiMart</h1>
    <div style="white-space: pre-wrap;">${options.message}</div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: options.email,
    subject: options.subject,
    html: getBaseTemplate(options.subject, content)
  });
};

const sendCustomOrderQuote = async (request, user) => {
  const content = `
    <h1>Custom Order Proposal</h1>
    <p>Hi ${user.name},</p>
    <p>Our team has reviewed your custom request and prepared a proposal for your consideration.</p>
    
    <div class="card">
      <span class="label">Your Request Details</span>
      <p style="font-style: italic; color: #78716c; margin-bottom: 25px;">"${request.requestDetails}"</p>
      
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div style="flex: 1;"><span class="label">Quoted Price</span><div style="font-size: 20px; font-weight: 900;">₹${request.quotedPrice?.toLocaleString() || 'Pending'}</div></div>
        <div style="flex: 1;"><span class="label">Estimated Time</span><div style="font-weight: 700;">${request.estimatedDeliveryDate ? new Date(request.estimatedDeliveryDate).toLocaleDateString() : 'TBD'}</div></div>
      </div>
      
      ${request.adminNotes ? `<div style="margin-top: 15px;"><span class="label">Notes</span><p style="margin: 0; font-size: 14px;">${request.adminNotes}</p></div>` : ''}
    </div>
    
    <p>If this vision aligns with yours, please proceed via your profile to begin the creation process.</p>
    
    <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/profile" class="button">View Custom Orders</a>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Custom Quote: Request #${request._id.toString().slice(-6)}`,
    html: getBaseTemplate('Custom Proposal', content, 'We have prepared a quote for your custom order.')
  });
};

const sendLoyaltyPointsNotification = async (user, points, type, orderDetails = null) => {
  const isEarned = type === 'earned';
  const content = `
    <h1>Loyalty Points Update</h1>
    <p>Hi ${user.name},</p>
    <p>You have ${isEarned ? 'earned' : 'redeemed'} <strong>${points} loyalty points</strong>.</p>
    
    <div style="background: linear-gradient(135deg, #1c1917 0%, #44403c 100%); padding: 40px; border-radius: 24px; text-align: center; color: white;">
      <div style="font-size: 48px; font-weight: 900; margin-bottom: 10px; color: #f59e0b;">${isEarned ? '+' : '-'}${points}</div>
      <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.7;">Points Balance</div>
      <div style="font-size: 20px; font-weight: 900; margin-top: 15px;">${user.loyaltyPoints} Points</div>
    </div>
    
    ${orderDetails ? `
      <div class="card" style="margin-top: 30px;">
        <span class="label">Connected Order</span>
        <div style="font-weight: 700;">#${orderDetails.orderNumber}</div>
        <div style="font-size: 13px; color: #a8a29e; margin-top: 5px;">Value: ₹${orderDetails.total.toLocaleString()}</div>
      </div>
    ` : ''}
    
    <div style="margin-top: 30px; font-size: 14px; padding: 20px; background-color: #faf9f6; border-radius: 12px;">
      <span class="label" style="color: #78350f;">About Points:</span>
      <ul style="margin: 0; padding-left: 20px; color: #78716c;">
        <li>1 point equals ₹1 off your purchase</li>
        <li>Redeem your points at checkout</li>
        <li>Your points never expire</li>
      </ul>
    </div>
    
    <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/profile" class="button">My Wisdom Balance</a>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Loyalty Points Update: ${isEarned ? '+' : '-'}${points} Points`,
    html: getBaseTemplate('Loyalty Rewards', content, `You've ${isEarned ? 'earned' : 'redeemed'} points at SilaiMart.`)
  });
};

const sendNewDeviceLoginAlert = async (user, deviceInfo) => {
  const content = `
    <h1>Security Alert</h1>
    <p>Hi ${user.name},</p>
    <p>We're writing to let you know that a new sign-in was detected on your account from an unfamiliar device.</p>
    
    <div class="card" style="background-color: #fffbeb; border-color: #fef3c7;">
      <span class="label" style="color: #92400e;">Login Details</span>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
        <div><span class="label">Time</span><div style="font-weight: 700;">${new Date().toLocaleString()}</div></div>
        <div><span class="label">Location</span><div style="font-weight: 700;">${deviceInfo.location || 'Unknown Location'}</div></div>
        <div><span class="label">Device</span><div style="font-weight: 700;">${deviceInfo.device || 'Unknown Device'}</div></div>
        <div><span class="label">Browser</span><div style="font-weight: 700;">${deviceInfo.browser || 'Unknown Browser'}</div></div>
      </div>
    </div>
    
    <div class="card">
      <h2>Was this you?</h2>
      <p style="font-size: 14px; color: #44403c;">If you recognize this activity, no action is required. If you don't, please <strong>secure your account</strong> immediately.</p>
      
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/profile" style="flex: 1; text-align: center; border: 2px solid #ef4444; color: #ef4444; padding: 12px; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase;">Secure Account</a>
        <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/support" style="flex: 1; text-align: center; border: 2px solid #78716c; color: #78716c; padding: 12px; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase;">Need Help?</a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: 'Security Alert: New Sign-in Detected',
    html: getBaseTemplate('Security Vigilance', content, 'A new device has signed into your SilaiMart account.')
  });
};

const sendInvoiceEmail = async (order, user, pdfBuffer) => {
  const content = `
    <h1>Your Invoice is Here</h1>
    <p>Hi ${user.name},</p>
    <p>Your order has been delivered successfully. Attached is your invoice for this purchase.</p>
    
    <div class="card">
      <span class="label">Order ID</span>
      <div style="font-size: 24px; font-weight: 900; color: #1c1917; margin-bottom: 10px;">#${order.orderNumber}</div>
      <p style="margin: 0; font-size: 14px;">We've attached your official invoice to this email for your records.</p>
    </div>
    
    <div style="margin: 30px 0; padding: 25px; border-radius: 16px; background-color: #ecfdf5; border: 1px solid #d1fae5; text-align: center;">
      <h2 style="color: #065f46; margin-bottom: 5px;">Successfully Delivered</h2>
      <p style="color: #065f46; margin: 0; font-size: 14px;">We hope you enjoy your purchase.</p>
    </div>

    <p style="font-size: 14px; text-align: center;">Would you mind sharing your experience with our community?</p>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/profile?tab=orders&reviewOrderId=${order.orderNumber}" class="button">Write a Review</a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Invoice for ${order.orderNumber}`,
    html: getBaseTemplate('Your Invoice', content, 'Thank you for your purchase. Your invoice is attached.'),
    attachments: [
      {
        filename: `invoice-${order.orderNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });
};

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendDeliveryDateUpdate,
  sendOfferNotification,
  sendEmail,
  sendCustomOrderQuote,
  sendLoyaltyPointsNotification,
  sendNewDeviceLoginAlert,
  sendInvoiceEmail
};