/**
 * NamasteMart Payment Service (Firestore Integrated)
 * Handles payment screenshot upload, order payment metadata updates,
 * admin verification / rejection flows, and audit trail logging.
 */

import {
  createBankTransferOrderAndPayment,
  resubmitPaymentScreenshot,
  verifyBankTransferPaymentAdmin,
  rejectBankTransferPaymentAdmin,
  subscribeToPendingPaymentsAdmin,
  subscribeToPaymentLogsAdmin,
  subscribeToOrderPayments,
  FirestorePayment,
} from './firestorePaymentService';
import { uploadPaymentScreenshotToFirestoreStorage, uploadPaymentProofFile, UploadProgress } from './storage';
import { PaymentInfo, PaymentVerificationLog } from '@/types';

// Re-export Firestore payment functions
export {
  createBankTransferOrderAndPayment,
  resubmitPaymentScreenshot,
  verifyBankTransferPaymentAdmin,
  rejectBankTransferPaymentAdmin,
  subscribeToPendingPaymentsAdmin,
  subscribeToPaymentLogsAdmin,
  subscribeToOrderPayments,
};
export type { FirestorePayment };

/**
 * Uploads a payment screenshot to Firebase Storage and links it to the order in Firestore.
 */
export const uploadAndLinkPaymentScreenshot = async (
  fileUri: string,
  userId: string,
  orderId: string,
  onProgress?: (p: UploadProgress) => void,
  transferredAmount?: number,
  senderName?: string
): Promise<{ downloadUrl: string; storagePath: string }> => {
  const payment = await resubmitPaymentScreenshot({
    orderId,
    userId,
    screenshotUri: fileUri,
    transferredAmount: transferredAmount || 0,
    senderName,
    onUploadProgress: onProgress,
  });

  return {
    downloadUrl: payment.screenshotUrl,
    storagePath: payment.storagePath || '',
  };
};

/**
 * Admin Action: Verify payment for an order (Supabase via server).
 */
export const verifyOrderPayment = async (
  orderId: string,
  adminUid: string,
  adminEmail = 'admin@namastemart.com',
  orderAmount = 0,
  customerName = 'Customer',
  orderNumber?: string,
  _paymentId?: string,
  _transactionId?: string,
  _note?: string
): Promise<void> => {
  const { supabase } = await import('@/config/supabase');
  const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050/api';
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) {
    const res = await fetch(`${API}/admin/orders/${orderId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ adminEmail, orderAmount, customerName, orderNumber }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.success) return;
    if (res.status === 404) throw new Error(body?.message || 'Order not found');
  }
  // Fallback: direct Supabase (requires is_admin RLS) — keep all statuses in sync
  const { error } = await supabase.from('orders').update({
    payment_status: 'PAID',
    order_status: 'CONFIRMED',
    payment: { verified: true, status: 'paid', verifiedAt: Date.now(), verifiedBy: adminUid } as any,
    status: 'Payment Confirmed',
    updated_at: Date.now(),
  }).eq('id', orderId);
  if (error) throw error;
  await supabase.from('payment_verification_logs').insert({
    order_id: orderId, order_number: orderNumber || orderId, action: 'VERIFIED',
    admin_user_id: adminUid, admin_email: adminEmail, amount: orderAmount, customer_name: customerName, created_at: Date.now(),
  }).then(() => {}).catch(() => {});
};

/**
 * Admin Action: Reject payment for an order (Supabase via server).
 */
export const rejectOrderPayment = async (
  orderId: string,
  adminUid: string,
  reason = 'Payment proof could not be verified in bank account (amount or sender mismatch)',
  adminEmail = 'admin@namastemart.com',
  orderAmount = 0,
  customerName = 'Customer',
  orderNumber?: string,
  _paymentId?: string
): Promise<void> => {
  const { supabase } = await import('@/config/supabase');
  const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050/api';
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) {
    const res = await fetch(`${API}/admin/orders/${orderId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason, adminEmail, orderAmount, customerName, orderNumber }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.success) return;
    if (res.status === 404) throw new Error(body?.message || 'Order not found');
  }
  const { data: existingOrder } = await supabase.from('orders').select('payment').eq('id', orderId).single();
  const existingPayment = (existingOrder as any)?.payment || {};
  await supabase.from('orders').update({
    payment_status: 'REJECTED',
    order_status: 'REJECTED',
    status: 'Payment Rejected',
    payment: { ...existingPayment, verified: false, status: 'rejected', rejectionReason: reason, rejectedAt: Date.now(), rejectedBy: adminUid } as any,
    updated_at: Date.now(),
  }).eq('id', orderId);
  await supabase.from('payment_verification_logs').insert({
    order_id: orderId, order_number: orderNumber || orderId, action: 'REJECTED',
    admin_user_id: adminUid, admin_email: adminEmail, reason, amount: orderAmount, customer_name: customerName, created_at: Date.now(),
  }).then(() => {}).catch(() => {});
};

export const getPaymentVerificationLogs = async (limitCount = 50): Promise<PaymentVerificationLog[]> => {
  const { supabase } = await import('@/config/supabase');
  const { data, error } = await supabase
    .from('payment_verification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limitCount);
  if (error || !data) return [];
  return data.map((d: any) => ({
    id: d.id,
    orderId: d.order_id || d.orderId,
    orderNumber: d.order_number || d.orderNumber,
    action: d.action,
    adminUserId: d.admin_user_id || d.adminUserId,
    adminEmail: d.admin_email || d.adminEmail,
    amount: d.amount,
    customerName: d.customer_name || d.customerName,
    reason: d.reason,
    timestamp: d.created_at || d.timestamp,
    createdAt: d.created_at,
  })) as PaymentVerificationLog[];
};

/**
 * Helper to get readable status text, color, and icon for payment.
 */
export const getPaymentStatusBadge = (
  payment?: PaymentInfo | FirestorePayment | any,
  paymentMethod?: string,
  paymentStatus?: string
): { label: string; color: string; emoji: string } => {
  // 1. Korean Card Payment
  if (
    payment?.paymentType === 'KOREAN_CARD' ||
    paymentMethod?.includes('Card') ||
    paymentMethod?.includes('카드')
  ) {
    if (
      payment?.verified ||
      payment?.status === 'verified' ||
      payment?.status === 'paid' ||
      paymentStatus === 'PAID' ||
      paymentStatus === 'paid'
    ) {
      const cardName = payment?.cardDetails?.cardCompany || 'Korean Card';
      return { label: `PAID (${cardName})`, color: '#10B981', emoji: '💳' };
    }
    return { label: 'Card Payment Processing', color: '#3B82F6', emoji: '💳' };
  }

  // 2. Bank Transfer Verification Flow
  const currentStatus = (paymentStatus || payment?.status || '').toLowerCase();

  if (currentStatus === 'paid' || currentStatus === 'verified' || payment?.verification?.verified || payment?.verified) {
    return { label: 'PAID (결제완료)', color: '#10B981', emoji: '🟢' };
  }

  if (currentStatus === 'rejected') {
    return { label: 'Payment Rejected (입금 반려)', color: '#EF4444', emoji: '🔴' };
  }

  if (
    currentStatus === 'under_review' ||
    currentStatus === 'payment_verification' ||
    currentStatus === 'pending_verification' ||
    currentStatus === 'submitted' ||
    currentStatus === 'uploaded' ||
    payment?.uploaded ||
    payment?.screenshotUrl ||
    payment?.paymentProofUrl
  ) {
    return { label: 'Under Review (입금 확인 중)', color: '#F59E0B', emoji: '🟡' };
  }

  return { label: 'Payment Pending (입금 대기)', color: '#F97316', emoji: '⏳' };
};
