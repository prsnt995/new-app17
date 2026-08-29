const https = require('https');

/**
 * Format order details into a clean WhatsApp Business message
 */
function formatOrderWhatsAppMessage(order) {
  const orderNumber = order.orderNumber || order.id || 'NM-ORDER';
  const customerName = order.customerName || order.customer?.name || 'Customer';
  const customerPhone = order.customerPhone || order.customer?.phoneNumber || order.phoneNumber || 'N/A';
  const customerEmail = order.customerEmail || order.customer?.email || order.email || 'N/A';
  const customerUid = order.customerUid || order.userId || 'N/A';

  const addr = order.deliveryAddress || order.recipient || {};
  const streetAddress = addr.streetAddress || addr.address || 'Address not specified';
  const building = addr.buildingName ? ` ${addr.buildingName}` : '';
  const unit = addr.unitNumber ? ` Unit ${addr.unitNumber}` : '';
  const detailAddr = addr.detailAddress ? ` ${addr.detailAddress}` : `${building}${unit}`;
  const postalCode = addr.postalCode || 'N/A';

  const items = order.items || order.itemSnapshots || [];
  let itemsText = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsText = items
      .map((it) => {
        const name = it.name || it.product?.name || 'Product';
        const qty = it.quantity || 1;
        const price = it.finalPrice || it.product?.finalPrice || it.originalPrice || 0;
        const lineTotal = price * qty;
        return `• ${name} × ${qty}\n  ₩${price.toLocaleString()} each = ₩${lineTotal.toLocaleString()}`;
      })
      .join('\n');
  } else {
    itemsText = '• 1x Order Package';
  }

  const subtotal = order.subtotalKRW ?? order.subtotal ?? 0;
  const discount = order.discountKRW ?? order.totalDiscount ?? order.discount ?? 0;
  const shipping = order.shippingFeeKRW ?? order.deliveryFee ?? 0;
  const total = order.totalKRW ?? order.totalAmount ?? 0;

  const paymentMethod = order.paymentMethod || 'Direct Bank Transfer';
  const paymentStatus = order.paymentStatus || order.payment?.status || 'Payment Pending';
  const screenshotUrl = order.paymentScreenshot || order.paymentScreenshotUrl || order.payment?.screenshotUrl || null;

  const dateStr = order.date || new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });

  let message = `🛒 *NEW ORDER – NAMASTE MART*\n`;
  message += `Order ID: #${orderNumber}\n\n`;

  message += `👤 *Customer Details*\n`;
  message += `Name: ${customerName}\n`;
  message += `Phone: ${customerPhone}\n`;
  message += `Email: ${customerEmail}\n`;
  message += `User ID: ${customerUid}\n\n`;

  message += `📍 *Delivery Address*\n`;
  message += `${streetAddress}${detailAddr}\n`;
  message += `Postal Code: ${postalCode}\n`;
  message += `South Korea 🇰🇷\n\n`;

  message += `🛍️ *Order Items*\n`;
  message += `${itemsText}\n\n`;

  message += `💰 *Order Summary*\n`;
  message += `Subtotal: ₩${subtotal.toLocaleString()}\n`;
  message += `Discount: -₩${discount.toLocaleString()}\n`;
  message += `Delivery Fee: ${shipping === 0 ? 'FREE (₩0)' : `₩${shipping.toLocaleString()}`}\n`;
  message += `*TOTAL: ₩${total.toLocaleString()}*\n\n`;

  message += `💳 *Payment Details*\n`;
  message += `Method: ${paymentMethod}\n`;
  message += `Status: ${paymentStatus.toUpperCase()}\n`;
  if (screenshotUrl) {
    message += `Screenshot Proof: ${screenshotUrl}\n`;
  }
  message += `\n🕒 *Order Time*\n`;
  message += `${dateStr}\n`;
  message += `\n— Namaste Mart Express Logistics ✈️`;

  return message;
}

/**
 * Send WhatsApp Notification via Meta WhatsApp Cloud API or Fallback Logger
 */
async function sendWhatsAppNotification(order) {
  const recipientNumber = (process.env.WHATSAPP_BUSINESS_NUMBER || '+919485703011').replace(/[^0-9]/g, '');
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const textMessage = formatOrderWhatsAppMessage(order);

  // If Meta Cloud API Credentials present, send via Meta Graph API
  if (phoneNumberId && accessToken) {
    return new Promise((resolve) => {
      const data = JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientNumber,
        type: 'text',
        text: { preview_url: true, body: textMessage },
      });

      const options = {
        hostname: 'graph.facebook.com',
        path: `/v20.0/${phoneNumberId}/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ WhatsApp API Notification Sent Successfully to +', recipientNumber);
            resolve({ success: true, response: JSON.parse(responseBody || '{}') });
          } else {
            console.error('❌ WhatsApp API Error:', responseBody);
            resolve({ success: false, error: responseBody });
          }
        });
      });

      req.on('error', (err) => {
        console.error('❌ WhatsApp HTTPS Error:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.write(data);
      req.end();
    });
  }

  // Fallback / Development mode: log WhatsApp message formatted clearly
  console.log('================================================================');
  console.log(`📱 WHATSAPP NOTIFICATION FOR BUSINESS NUMBER: +${recipientNumber}`);
  console.log('================================================================');
  console.log(textMessage);
  console.log('================================================================');

  return {
    success: true,
    message: `WhatsApp notification logged for +${recipientNumber} (Dev / Pending API Credentials)`,
    devText: textMessage,
  };
}

module.exports = {
  formatOrderWhatsAppMessage,
  sendWhatsAppNotification,
};
