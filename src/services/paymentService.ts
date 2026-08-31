/**
 * NamasteMart Payment Service
 * Handles payment screenshot upload, order payment metadata updates,
 * admin verification / rejection flows, and audit trail logging.
 */

import { supabase, TABLES } from '@/config/supabase';
import { uploadPaymentProofFile, UploadProgress } from './storage';
import { PaymentInfo, PaymentVerificationLog } from '@/types';

/**
 * Uploads a payment screenshot to Firebase Storage and links it to the order in Supabase.
 * Updates order to PENDING_VERIFICATION and sets orderStatus to PENDING.
 */
export const uploadAndLinkPaymentScreenshot = async (
  fileUri: string,
  userId: string,
  orderId: string,
  onProgress?: (p: UploadProgress) => void
): Promise<{ downloadUrl: string; storagePath: string }> => {
  // 1. Upload to Firebase Storage: payment-proofs/{userId}/{orderId}/{fileName}
  const result = await uploadPaymentProofFile(fileUri, userId, orderId, onProgress);
  const { downloadUrl, storagePath } = result;

  // 2. Update order in Supabase
  const paymentUpdate: PaymentInfo = {
    screenshotUrl: downloadUrl,
    storagePath,
    paymentProofUrl: downloadUrl,
    paymentProofStoragePath: storagePath,
    paymentProofUploadedAt: Date.now(),
    uploaded: true,
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    status: 'PENDING_VERIFICATION',
    paymentType: 'BANK_TRANSFER',
  };

  const { error } = await supabase
    .from(TABLES.ORDERS)
    .update({
      payment: paymentUpdate,
      paymentScreenshot: downloadUrl, // backward compatibility
      paymentProofUrl: downloadUrl,
      paymentProofStoragePath: storagePath,
      paymentProofUploadedAt: Date.now(),
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'PENDING_VERIFICATION',
      status: 'Payment Submitted',
      orderStatus: 'PENDING',
      paymentRejectedAt: null,
      paymentRejectedBy: null,
      paymentRejectionReason: null,
      updatedAt: Date.now(),
    })
    .eq('id', orderId);

  if (error) throw error;

  return { downloadUrl, storagePath };
};

/**
 * Admin Action: Verify payment for an order.
 * Sets paymentStatus = 'PAID', orderStatus = 'CONFIRMED', and logs audit trail.
 */
export const verifyOrderPayment = async (
  orderId: string,
  adminUid: string,
  adminEmail = 'admin@namastemart.com',
  orderAmount = 0,
  customerName = 'Customer',
  orderNumber?: string
): Promise<void> => {
  const { data: orderData, error: fetchError } = await supabase
    .from(TABLES.ORDERS)
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError || !orderData) throw new Error('Order not found.');

  const currentPayment = orderData.payment || {};
  const actualAmount = orderAmount || orderData.totalAmount || orderData.totalKRW || 0;
  const actualCustName = customerName || orderData.customerName || orderData.customer?.name || 'Customer';
  const actualOrderNumber = orderNumber || orderData.orderNumber || orderId;

  // 1. Update Order Document
  const { error: updateError } = await supabase
    .from(TABLES.ORDERS)
    .update({
      paymentStatus: 'PAID',
      paymentVerifiedAt: Date.now(),
      paymentVerifiedBy: adminUid,
      'payment.verified': true,
      'payment.verifiedAt': Date.now(),
      'payment.verifiedBy': adminUid,
      'payment.status': 'paid',
      orderStatus: 'CONFIRMED',
      status: 'Payment Confirmed',
      updatedAt: Date.now(),
    })
    .eq('id', orderId);

  if (updateError) throw updateError;

  // 2. Write Immutable Audit Trail Log
  try {
    const { error: logError } = await supabase
      .from(TABLES.PAYMENT_LOGS)
      .insert({
        orderId,
        orderNumber: actualOrderNumber,
        action: 'VERIFIED',
        adminUserId: adminUid,
        adminEmail,
        amount: actualAmount,
        customerName: actualCustName,
        timestamp: Date.now(),
        createdAt: Date.now(),
      });

    if (logError) throw logError;
  } catch (logErr: any) {
    console.warn('Audit log write notice:', logErr.message);
  }
};

/**
 * Admin Action: Reject payment for an order.
 * Sets paymentStatus = 'REJECTED', records reason, and logs audit trail.
 */
export const rejectOrderPayment = async (
  orderId: string,
  adminUid: string,
  reason = 'Payment proof could not be verified (amount or sender mismatch)',
  adminEmail = 'admin@namastemart.com',
  orderAmount = 0,
  customerName = 'Customer',
  orderNumber?: string
): Promise<void> => {
  const { data: orderData, error: fetchError } = await supabase
    .from(TABLES.ORDERS)
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError || !orderData) throw new Error('Order not found.');

  const actualAmount = orderAmount || orderData.totalAmount || orderData.totalKRW || 0;
  const actualCustName = customerName || orderData.customerName || orderData.customer?.name || 'Customer';
  const actualOrderNumber = orderNumber || orderData.orderNumber || orderId;

  // 1. Update Order Document
  const { error: updateError } = await supabase
    .from(TABLES.ORDERS)
    .update({
      paymentStatus: 'REJECTED',
      paymentRejectedAt: Date.now(),
      paymentRejectedBy: adminUid,
      paymentRejectionReason: reason,
      'payment.verified': false,
      'payment.status': 'REJECTED',
      'payment.rejectionReason': reason,
      'payment.rejectedAt': Date.now(),
      'payment.rejectedBy': adminUid,
      orderStatus: 'PENDING',
      status: 'Payment Pending',
      updatedAt: Date.now(),
    })
    .eq('id', orderId);

  if (updateError) throw updateError;

  // 2. Write Immutable Audit Trail Log
  try {
    const { error: logError } = await supabase
      .from(TABLES.PAYMENT_LOGS)
      .insert({
        orderId,
        orderNumber: actualOrderNumber,
        action: 'REJECTED',
        adminUserId: adminUid,
        adminEmail,
        reason,
        amount: actualAmount,
        customerName: actualCustName,
        timestamp: Date.now(),
        createdAt: Date.now(),
      });

    if (logError) throw logError;
  } catch (logErr: any) {
    console.warn('Audit log write notice:', logErr.message);
  }
};

/**
 * Fetch recent payment verification audit logs.
 */
export const getPaymentVerificationLogs = async (
  limitCount = 50
): Promise<PaymentVerificationLog[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PAYMENT_LOGS)
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limitCount);

    if (error) throw error;

    return (data || []).map((d: any) => ({
      id: d.id,
      ...d,
    })) as PaymentVerificationLog[];
  } catch (error) {
    console.warn('Error fetching payment verification logs:', error);
    return [];
  }
};

/**
 * Helper to get readable status text, color, and icon for payment.
 */
export const getPaymentStatusBadge = (
  payment?: PaymentInfo,
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
  const currentStatus = paymentStatus || payment?.status;

  if (currentStatus === 'PAID' || currentStatus === 'paid' || payment?.verified) {
    return { label: 'PAID (결제완료)', color: '#10B981', emoji: '🟢' };
  }

  if (currentStatus === 'REJECTED' || currentStatus === 'rejected') {
    return { label: 'Payment Proof Rejected', color: '#EF4444', emoji: '🔴' };
  }

  if (
    currentStatus === 'PENDING_VERIFICATION' ||
    currentStatus === 'uploaded' ||
    currentStatus === 'under_verification' ||
    payment?.uploaded ||
    payment?.screenshotUrl ||
    payment?.paymentProofUrl
  ) {
    return { label: 'Pending Verification (입금 확인 중)', color: '#F59E0B', emoji: '🟡' };
  }

  return { label: 'Payment Pending (입금 대기)', color: '#F97316', emoji: '⏳' };
};
