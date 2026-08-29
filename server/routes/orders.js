const express = require('express');
const router = express.Router();
const admin = require('../config/firebaseAdmin');
const { sendWhatsAppNotification, formatOrderWhatsAppMessage } = require('../services/whatsapp');

/**
 * POST /api/orders/notify-whatsapp
 * Dispatches an automatic WhatsApp order notification to +91 9485703011
 */
router.post('/notify-whatsapp', async (req, res) => {
  try {
    const { orderId, orderData } = req.body;

    let targetOrder = orderData;
    let orderDocRef = null;

    if (orderId) {
      orderDocRef = admin.firestore().collection('orders').doc(orderId);
      const docSnap = await orderDocRef.get();
      if (docSnap.exists) {
        targetOrder = { id: docSnap.id, ...docSnap.data() };
      }
    }

    if (!targetOrder) {
      return res.status(400).json({
        success: false,
        message: 'Order data or valid orderId is required',
      });
    }

    // Check duplicate prevention flag
    if (targetOrder.whatsappNotificationSent === true) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'WhatsApp notification has already been sent for this order.',
      });
    }

    // Dispatch WhatsApp notification
    const whatsappResult = await sendWhatsAppNotification(targetOrder);

    // Update Firestore status if orderDocRef exists
    if (orderDocRef) {
      if (whatsappResult.success) {
        await orderDocRef.update({
          whatsappNotificationSent: true,
          whatsappSentAt: admin.firestore.FieldValue.serverTimestamp(),
          whatsappError: null,
        }).catch(() => {});
      } else {
        await orderDocRef.update({
          whatsappNotificationSent: false,
          whatsappError: whatsappResult.error || 'Failed to send WhatsApp message',
        }).catch(() => {});
      }
    }

    return res.status(200).json({
      success: true,
      message: 'WhatsApp order notification processed successfully',
      whatsappResult,
      formattedMessage: formatOrderWhatsAppMessage(targetOrder),
    });
  } catch (error) {
    console.error('WhatsApp Notification Route Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to dispatch WhatsApp notification',
    });
  }
});

/**
 * POST /api/orders/retry-whatsapp
 * Admin retry trigger for failed WhatsApp notifications
 */
router.post('/retry-whatsapp', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const orderDocRef = admin.firestore().collection('orders').doc(orderId);
    const snap = await orderDocRef.get();

    if (!snap.exists) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderData = { id: snap.id, ...snap.data() };
    const whatsappResult = await sendWhatsAppNotification(orderData);

    if (whatsappResult.success) {
      await orderDocRef.update({
        whatsappNotificationSent: true,
        whatsappSentAt: admin.firestore.FieldValue.serverTimestamp(),
        whatsappError: null,
      });
    } else {
      await orderDocRef.update({
        whatsappNotificationSent: false,
        whatsappError: whatsappResult.error || 'Retry failed',
      });
    }

    return res.status(200).json({
      success: whatsappResult.success,
      message: whatsappResult.success
        ? 'WhatsApp notification retried successfully'
        : 'WhatsApp notification retry failed',
      whatsappResult,
    });
  } catch (err) {
    console.error('WhatsApp Retry Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
