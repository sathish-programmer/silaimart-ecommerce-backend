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

const sendOrderConfirmation = async (order, user) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B4513;">Order Confirmed!</h2>
        <p>Dear ${user.name},</p>
        <p>Your order has been confirmed and is being processed.</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Total Amount:</strong> ₹${order.total.toLocaleString()}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
          ${order.estimatedDeliveryDate ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>` : ''}
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
          <h3>Items Ordered</h3>
          ${order.items.map(item => `
            <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
              <p><strong>${item.product.name}</strong></p>
              <p>Quantity: ${item.quantity} | Price: ₹${(item.discountPrice || item.price).toLocaleString()}</p>
            </div>
          `).join('')}
        </div>
        
        <p>We'll keep you updated on your order status.</p>
        <p>Thank you for shopping with SilaiMart!</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

const sendOrderStatusUpdate = async (order, user, oldStatus, newStatus) => {
  try {
    console.log('Sending order status update email to:', user.email);
    
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      processing: 'Your order is now being processed.',
      shipped: `Your order has been shipped${order.trackingNumber ? ` with tracking number: ${order.trackingNumber}` : ''}.`,
      delivered: 'Your order has been delivered successfully!',
      cancelled: 'Your order has been cancelled.',
      unpaid: 'Your order payment is pending. Please complete the payment to confirm your order.'
    };

    const mailOptions = {
      from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
      to: user.email,
      subject: `Order Update - ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B4513;">Order Status Update</h2>
          <p>Dear ${user.name},</p>
          <p>${statusMessages[newStatus]}</p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Status:</strong> ${newStatus.toUpperCase()}</p>
            ${order.estimatedDeliveryDate ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>` : ''}
            ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
          </div>
          
          ${order.deliveryNotes ? `<p><strong>Delivery Notes:</strong> ${order.deliveryNotes}</p>` : ''}
          
          <p>Thank you for shopping with SilaiMart!</p>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Order status email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending order status email:', error);
    throw error;
  }
};

const sendDeliveryDateUpdate = async (order, user) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Delivery Date Update - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B4513;">Delivery Date Updated</h2>
        <p>Dear ${user.name},</p>
        <p>The estimated delivery date for your order has been updated.</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>New Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>
          ${order.deliveryNotes ? `<p><strong>Notes:</strong> ${order.deliveryNotes}</p>` : ''}
        </div>
        
        <p>We apologize for any inconvenience and appreciate your patience.</p>
        <p>Thank you for shopping with SilaiMart!</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

const sendOfferNotification = async (user, offer) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Special Offer - ${offer.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B4513;">🎉 Special Offer Just for You!</h2>
        <p>Dear ${user.name},</p>
        <p>We have an exclusive offer that you won't want to miss!</p>
        
        <div style="background: linear-gradient(135deg, #8B4513, #CD7F32); color: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center;">
          <h3 style="margin: 0; font-size: 24px;">${offer.title}</h3>
          <p style="font-size: 18px; margin: 10px 0;">${offer.description}</p>
          ${offer.discountPercentage ? `<p style="font-size: 32px; font-weight: bold; margin: 15px 0;">${offer.discountPercentage}% OFF</p>` : ''}
          ${offer.couponCode ? `<p style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px; font-family: monospace; font-size: 20px;">Code: ${offer.couponCode}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/shop" style="background: #8B4513; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Shop Now</a>
        </div>
        
        ${offer.validUntil ? `<p style="color: #666; font-size: 14px;">*Offer valid until ${new Date(offer.validUntil).toLocaleDateString()}</p>` : ''}
        
        <p>Happy Shopping!</p>
        <p>Team SilaiMart</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

const sendCustomOrderQuote = async (request, user) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Custom Order Quote - Request #${request._id.toString().slice(-6)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B4513;">Custom Order Quote from SilaiMart</h2>
        <p>Dear ${user.name},</p>
        <p>Your custom order request has been reviewed, and we have a quote for you:</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
          <h3>Request Details</h3>
          <p><strong>Your Request:</strong> ${request.requestDetails}</p>
          ${request.quotedPrice ? `<p><strong>Quoted Price:</strong> ₹${request.quotedPrice.toLocaleString()}</p>` : ''}
          ${request.estimatedDeliveryDate ? `<p><strong>Estimated Delivery:</strong> ${new Date(request.estimatedDeliveryDate).toLocaleDateString()}</p>` : ''}
          ${request.adminNotes ? `<p><strong>Admin Notes:</strong> ${request.adminNotes}</p>` : ''}
          <p><strong>Current Status:</strong> ${request.status.toUpperCase()}</p>
        </div>
        
        <p>If you wish to proceed with this quote, please reply to this email or visit your profile on our website.</p>
        <p>Thank you for choosing SilaiMart for your custom art!</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

const sendLoyaltyPointsNotification = async (user, points, type, orderDetails = null) => {
  const isEarned = type === 'earned';
  const mailOptions = {
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: `Loyalty Points ${isEarned ? 'Earned' : 'Redeemed'} - SilaiMart`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B4513;">🎆 Loyalty Points ${isEarned ? 'Earned' : 'Redeemed'}!</h2>
        <p>Dear ${user.name},</p>
        <p>Great news! You have ${isEarned ? 'earned' : 'redeemed'} <strong>${points} loyalty points</strong>.</p>
        
        <div style="background: linear-gradient(135deg, #8B4513, #CD7F32); color: white; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center;">
          <h3 style="margin: 0; font-size: 24px;">${isEarned ? '+' : '-'}${points} Points</h3>
          <p style="margin: 10px 0;">${isEarned ? 'Added to your account' : 'Redeemed successfully'}</p>
          <p style="font-size: 18px; margin: 0;">Current Balance: ${user.loyaltyPoints} Points</p>
        </div>
        
        ${orderDetails ? `
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4>Order Details</h4>
            <p><strong>Order Number:</strong> ${orderDetails.orderNumber}</p>
            <p><strong>Order Total:</strong> ₹${orderDetails.total.toLocaleString()}</p>
            ${isEarned ? '<p>Points earned: 1 point for every ₹10 spent</p>' : ''}
          </div>
        ` : ''}
        
        <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h4>How to use your points:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>1 point = ₹1 discount</li>
            <li>Minimum 100 points required for redemption</li>
            <li>Use points during checkout for instant discounts</li>
            <li>Points never expire!</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/profile" style="background: #8B4513; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View My Points</a>
        </div>
        
        <p>Keep shopping to earn more points!</p>
        <p>Team SilaiMart</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

const sendNewDeviceLoginAlert = async (user, deviceInfo) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    to: user.email,
    subject: 'New device login detected in your SilaiMart account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B4513;">🔐 New Device Login Alert</h2>
        <p>Dear ${user.name},</p>
        <p>We detected a new login to your SilaiMart account from a device we haven't seen before.</p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #856404; margin: 0 0 10px 0;">Login Details</h3>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Device:</strong> ${deviceInfo.device || 'Unknown Device'}</p>
          <p style="margin: 5px 0;"><strong>Browser:</strong> ${deviceInfo.browser || 'Unknown Browser'}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${deviceInfo.location || 'Unknown Location'}</p>
          <p style="margin: 5px 0;"><strong>IP Address:</strong> ${deviceInfo.ip || 'Unknown'}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h4>Was this you?</h4>
          <p><strong>If this was you:</strong> No action needed. You can ignore this email.</p>
          <p><strong>If this wasn't you:</strong> Please secure your account immediately by:</p>
          <ul>
            <li>Changing your password</li>
            <li>Logging out of all devices</li>
            <li>Contacting our support team</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/profile" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Secure My Account</a>
          <a href="${process.env.FRONTEND_URL || 'https://silaimart.in'}/support" style="background: #6c757d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Contact Support</a>
        </div>
        
        <p style="font-size: 12px; color: #666;">This is an automated security alert. Please do not reply to this email.</p>
        <p>Team SilaiMart</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendDeliveryDateUpdate,
  sendOfferNotification,
  sendEmail,
  sendCustomOrderQuote,
  sendLoyaltyPointsNotification,
  sendNewDeviceLoginAlert
};