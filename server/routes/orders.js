const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { sendWhatsAppNotification, formatOrderWhatsAppMessage } = require('../services/whatsapp');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/orders/notify-whatsapp
 * Dispatches an automatic WhatsApp order notification
 */
router.post('/notify-whatsapp', async (req, res) => {
  try {
    const { orderId, orderData } = req.body;

    let targetOrder = orderData;

    if (orderId && !targetOrder) {
      const { data: orderDoc } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderDoc) {
        targetOrder = orderDoc;
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

    // Update Supabase order status
    if (orderId) {
      if (whatsappResult.success) {
        await supabase
          .from('orders')
          .update({
            whatsapp_notification_sent: true,
            whatsapp_sent_at: Date.now(),
            whatsapp_error: null,
          })
          .eq('id', orderId)
          .catch(() => {});
      } else {
        await supabase
          .from('orders')
          .update({
            whatsapp_notification_sent: false,
            whatsapp_error: whatsappResult.error || 'Failed to send WhatsApp message',
          })
          .eq('id', orderId)
          .catch(() => {});
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

    const { data: orderDoc, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !orderDoc) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const whatsappResult = await sendWhatsAppNotification(orderDoc);

    if (whatsappResult.success) {
      await supabase
        .from('orders')
        .update({
          whatsapp_notification_sent: true,
          whatsapp_sent_at: Date.now(),
          whatsapp_error: null,
        })
        .eq('id', orderId);
    } else {
      await supabase
        .from('orders')
        .update({
          whatsapp_notification_sent: false,
          whatsapp_error: whatsappResult.error || 'Retry failed',
        })
        .eq('id', orderId);
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
