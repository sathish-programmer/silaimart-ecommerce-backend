const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'silaimartindia@gmail.com',
    pass: process.env.EMAIL_PASS || 'wuriyvdutxcfkwql'
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
      cancelled: 'Your order has been cancelled.'
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

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendDeliveryDateUpdate,
  sendOfferNotification
};