const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const FALLBACK_ADMIN_EMAILS = ['parshanttanwar995@gmail.com','dineshgodara571@gmail.com','admin@namastemart.com'];
router.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: adminRows } = await supabase.from('admins').select('id').eq('id', req.user.uid).limit(1);
    const adminOk = !!(adminRows && adminRows.length) || FALLBACK_ADMIN_EMAILS.includes((req.user.email||'').toLowerCase());
    if (!adminOk) {
      console.log('DELETE admin blocked:', { uid: req.user.uid, email: req.user.email, adminRows });
      return res.status(403).json({ success: false, message: `Admin only — uid ${req.user.uid} email ${req.user.email} not in admins table` });
    }

    // Delete storage objects (both single and legacy double prefix)
    for (const prefix of [id, `products/${id}`]) {
      try {
        const { data: files } = await supabase.storage.from('products').list(prefix);
        if (files?.length) {
          const paths = files.map((f) => `${prefix}/${f.name}`);
          await supabase.storage.from('products').remove(paths);
        }
      } catch {}
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/orders/:id/verify', authMiddleware, async (req, res) => {
  try {
    console.log('VERIFY req.user:', req.user?.uid, req.user?.email);
    const { id } = req.params;
    const { adminEmail, orderAmount, customerName, orderNumber } = req.body;
    const { data: adminRows, error: adminErr } = await supabase.from('admins').select('id').eq('id', req.user.uid).limit(1);
    const isAdmin = !!(adminRows?.length) || FALLBACK_ADMIN_EMAILS.includes((req.user.email||'').toLowerCase());
    console.log('admin check:', adminRows?.length, adminErr?.message, 'fallback', FALLBACK_ADMIN_EMAILS.includes((req.user.email||'').toLowerCase()));
    if (!isAdmin) return res.status(403).json({ success: false, message: `Admin only — uid ${req.user.uid} email ${req.user.email} not in admins table` });
    const { error } = await supabase.from('orders').update({
      payment_status: 'PAID', order_status: 'CONFIRMED', status: 'Payment Confirmed', updated_at: Date.now(),
    }).eq('id', id);
    console.log('order update:', error ? `ERR ${error.code} ${error.message}` : 'OK');
    if (error) throw error;
    try {
      await supabase.from('payment_verification_logs').insert({
        order_id: id, order_number: orderNumber || id, action: 'VERIFIED',
        admin_user_id: req.user.uid, admin_email: adminEmail || req.user.email, amount: orderAmount || 0, customer_name: customerName || 'Customer', created_at: Date.now(),
      });
    } catch (e) { console.log('log insert err:', e.message); }
    return res.json({ success: true });
  } catch (e) {
    console.log('VERIFY catch:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/orders/:id/reject', authMiddleware, async (req, res) => {
  try {
    console.log('REJECT req.user:', req.user?.uid, req.user?.email);
    const { id } = req.params;
    const { reason, adminEmail, orderAmount, customerName, orderNumber } = req.body;
    const { data: adminRows, error: adminErr } = await supabase.from('admins').select('id').eq('id', req.user.uid).limit(1);
    const isAdminR = !!(adminRows?.length) || FALLBACK_ADMIN_EMAILS.includes((req.user.email||'').toLowerCase());
    console.log('reject admin check:', adminRows?.length, adminErr?.message, 'fallback', FALLBACK_ADMIN_EMAILS.includes((req.user.email||'').toLowerCase()));
    if (!isAdminR) return res.status(403).json({ success: false, message: `Admin only — uid ${req.user.uid} email ${req.user.email} not in admins table` });
    const { data: existingOrder } = await supabase.from('orders').select('payment').eq('id', id).single();
    const existingPayment = existingOrder?.payment || {};
    const { error } = await supabase.from('orders').update({
      payment_status: 'REJECTED', order_status: 'REJECTED', status: 'Payment Rejected', payment: { ...existingPayment, verified: false, status: 'rejected', rejectionReason: reason || 'Payment proof rejected', rejectedAt: Date.now(), rejectedBy: req.user.uid }, updated_at: Date.now(),
    }).eq('id', id);
    console.log('reject order update:', error ? `ERR ${error.code} ${error.message}` : 'OK');
    if (error) throw error;
    // Restore stock (best-effort)
    try {
      const { data: order } = await supabase.from('orders').select('items').eq('id', id).single();
      for (const it of (order?.items || [])) {
        const pid = it.productId || it.product?.id;
        const qty = it.quantity || 1;
        if (pid) await supabase.rpc('increment_stock', { p_product_id: pid, p_quantity: qty }).catch(async () => {
          const { data: prod } = await supabase.from('products').select('stock').eq('id', pid).single();
          if (prod) await supabase.from('products').update({ stock: (prod.stock || 0) + qty, available: true }).eq('id', pid);
        });
      }
    } catch {}
    try {
      await supabase.from('payment_verification_logs').insert({
        order_id: id, order_number: orderNumber || id, action: 'REJECTED',
        admin_user_id: req.user.uid, admin_email: adminEmail || req.user.email, reason: reason || 'Payment proof rejected', amount: orderAmount || 0, customer_name: customerName || 'Customer', created_at: Date.now(),
      });
    } catch {}
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
