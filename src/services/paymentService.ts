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
 * Admin Action: Verify payment for an order.
 */
export const verifyOrderPayment = async (
  orderId: string,
  adminUid: string,
  adminEmail = 'admin@namastemart.com',
  orderAmount = 0,
  customerName = 'Customer',
  orderNumber?: string,
  paymentId?: string,
  transactionId?: string,
  note?: string
): Promise<void> => {
  const targetPaymentId = paymentId || `pay_${orderId}`;
  await verifyBankTransferPaymentAdmin({
    paymentId: targetPaymentId,
    orderId,
    receivedAmount: orderAmount,
    adminUid,
    adminEmail,
    transactionId,
    note,
  });
};

/**
 * Admin Action: Reject payment for an order.
 */
export const rejectOrderPayment = async (
  orderId: string,
  adminUid: string,
  reason = 'Payment proof could not be verified in bank account (amount or sender mismatch)',
  adminEmail = 'admin@namastemart.com',
  orderAmount = 0,
  customerName = 'Customer',
  orderNumber?: string,
  paymentId?: string
): Promise<void> => {
  const targetPaymentId = paymentId || `pay_${orderId}`;
  await rejectBankTransferPaymentAdmin({
    paymentId: targetPaymentId,
    orderId,
    adminUid,
    adminEmail,
    reason,
  });
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
