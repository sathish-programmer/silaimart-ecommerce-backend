const PDFDocument = require('pdfkit');

/**
 * Generates a modern, premium PDF invoice for a given order.
 * @param {Object} order - The order object with populated items and user.
 * @returns {Promise<Buffer>} - A promise that resolves to the PDF buffer.
 */
const generateInvoicePDF = (order) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            let chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // --- Header Section ---
            // Background for header
            doc.rect(0, 0, 612, 120).fill('#1c1917'); // Stone-900 for premium feel
            
            doc.fillColor('#fbbf24').fontSize(32).font('Helvetica-Bold').text('SILAIMART', 50, 40); // Amber-400
            doc.fillColor('#a8a29e').fontSize(10).font('Helvetica').text('YOUR PREMIUM SHOPPING DESTINATION', 50, 75, { characterSpacing: 2 });
            
            doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('INVOICE', 400, 40, { align: 'right' });
            doc.fillColor('#a8a29e').fontSize(10).font('Helvetica').text(`Nº: ${order.orderNumber}`, 400, 70, { align: 'right' });
            doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 400, 85, { align: 'right' });

            // --- Bill To / Details Section ---
            doc.fillColor('#1c1917').fontSize(12).font('Helvetica-Bold').text('BILL TO', 50, 150);
            doc.fontSize(10).font('Helvetica');
            doc.text(order.shippingAddress.name, 50, 170);
            doc.text(order.shippingAddress.street, 50, 185, { width: 220 });
            doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`, 50, 200);
            doc.text(`Phone: ${order.shippingAddress.phone}`, 50, 215);
            doc.text(`Email: ${order.user?.email || 'N/A'}`, 50, 230);

            doc.font('Helvetica-Bold').text('BUSINESS INFO', 350, 150);
            doc.font('Helvetica');
            doc.text('SilaiMart India', 350, 170);
            doc.text('Tiruvannamalai, Tamil Nadu', 350, 185);
            doc.text('Pin: 606902', 350, 200);
            doc.text('Email: silaimartindia@gmail.com', 350, 215);
            doc.text('Web: www.silaimart.in', 350, 230);

            // --- Items Table ---
            const tableTop = 280;
            const itemX = 50;
            const qtyX = 300;
            const priceX = 360;
            const totalX = 460;

            // Table Header
            doc.rect(itemX - 10, tableTop, 520, 25).fill('#f8f7f4');
            doc.fillColor('#44403c').fontSize(10).font('Helvetica-Bold');
            doc.text('ITEM DESCRIPTION', itemX, tableTop + 8);
            doc.text('QTY', qtyX, tableTop + 8, { width: 40, align: 'center' });
            doc.text('UNIT PRICE', priceX, tableTop + 8, { width: 80, align: 'right' });
            doc.text('TOTAL', totalX, tableTop + 8, { width: 100, align: 'right' });

            // Border below header
            doc.moveTo(itemX - 10, tableTop + 25).lineTo(itemX + 510, tableTop + 25).strokeColor('#e7e5e4').lineWidth(1).stroke();

            // Table Content
            let y = tableTop + 35;
            doc.font('Helvetica');
            
            order.items.forEach((item, index) => {
                const product = item.product || { name: 'Product' };
                const price = item.discountPrice || item.price;
                const total = price * item.quantity;
                
                // Zebra striping
                if (index % 2 !== 0) {
                    doc.rect(itemX - 10, y - 5, 520, 20).fill('#faf9f6');
                }
                
                doc.fillColor('#1c1917');
                doc.text(product.name, itemX, y, { width: 240 });
                doc.text(item.quantity.toString(), qtyX, y, { width: 40, align: 'center' });
                doc.text(`Rs. ${price.toLocaleString('en-IN')}`, priceX, y, { width: 80, align: 'right' });
                doc.text(`Rs. ${total.toLocaleString('en-IN')}`, totalX, y, { width: 100, align: 'right' });
                
                y += 25;
            });

            // --- Calculation Section ---
            const summaryY = Math.max(y + 20, 500);
            const summaryX = 350;
            const valueX = 460;

            doc.fontSize(10).font('Helvetica');
            
            // Subtotal
            doc.fillColor('#78716c').text('Subtotal', summaryX, summaryY);
            doc.fillColor('#1c1917').text(`Rs. ${order.subtotal.toLocaleString('en-IN')}`, valueX, summaryY, { width: 100, align: 'right' });
            
            let currentY = summaryY + 20;

            // Discount
            if (order.discount > 0 || order.loyaltyDiscount > 0) {
                const totalDisc = (order.discount || 0) + (order.loyaltyDiscount || 0);
                doc.fillColor('#78716c').text('Total Discount', summaryX, currentY);
                doc.fillColor('#dc2626').text(`-Rs. ${totalDisc.toLocaleString('en-IN')}`, valueX, currentY, { width: 100, align: 'right' });
                currentY += 20;
            }

            // Shipping
            doc.fillColor('#78716c').text('Shipping', summaryX, currentY);
            doc.fillColor('#1c1917').text(order.shippingCost === 0 ? 'FREE' : `Rs. ${order.shippingCost.toLocaleString('en-IN')}`, valueX, currentY, { width: 100, align: 'right' });
            currentY += 20;

            // Tax
            doc.fillColor('#78716c').text(`Tax (GST ${order.taxRate || 18}%)`, summaryX, currentY);
            doc.fillColor('#1c1917').text(`Rs. ${order.tax.toLocaleString('en-IN')}`, valueX, currentY, { width: 100, align: 'right' });
            currentY += 25;

            // Total Box
            doc.rect(summaryX - 10, currentY - 5, 220, 35).fill('#1c1917');
            doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('TOTAL', summaryX, currentY + 8);
            doc.fillColor('#fbbf24').text(`Rs. ${order.total.toLocaleString('en-IN')}`, valueX, currentY + 8, { width: 100, align: 'right' });

            // --- Footer ---
            doc.rect(0, 780, 612, 62).fill('#faf9f6');
            doc.fillColor('#78716c').fontSize(9).font('Helvetica-Oblique').text('This is a computer generated invoice and does not require a physical signature.', 0, 800, { align: 'center', width: 612 });
            doc.fillColor('#1c1917').fontSize(10).font('Helvetica-Bold').text('THANK YOU FOR SHOPPING WITH SILAIMART', 0, 815, { align: 'center', width: 612, characterSpacing: 1 });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateInvoicePDF };
