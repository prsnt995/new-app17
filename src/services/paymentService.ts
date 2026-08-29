/**
 * NamasteMart Payment Service
 * Handles payment screenshot upload, order payment metadata updates,
 * and admin verification / rejection flows.
 */

import {
  db,
  COLLECTIONS,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from '@/config/firebase';
import { uploadPaymentScreenshotFile, UploadProgress } from './storage';
import { PaymentInfo } from '@/types';

/**
 * Uploads a payment screenshot to Firebase Storage and links it to the order in Firestore.
 */
export const uploadAndLinkPaymentScreenshot = async (
  fileUri: string,
  userId: string,
  orderId: string,
  onProgress?: (p: UploadProgress) => void
): Promise<string> => {
  // 1. Upload to Firebase Storage: payment-screenshots/{userId}/{orderId}/{fileName}
  const result = await uploadPaymentScreenshotFile(fileUri, userId, orderId, onProgress);
  const screenshotUrl = result.downloadUrl;

  // 2. Update order in Firestore
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const paymentUpdate: PaymentInfo = {
    screenshotUrl,
    uploaded: true,
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    status: 'uploaded',
  };

  await updateDoc(orderRef, {
    payment: paymentUpdate,
    paymentScreenshot: screenshotUrl, // backward compatibility
    status: 'payment_uploaded',
    updatedAt: serverTimestamp(),
  });

  return screenshotUrl;
};

/**
 * Admin Action: Verify payment for an order.
 */
export const verifyOrderPayment = async (
  orderId: string,
  adminUid: string
): Promise<void> => {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('Order not found.');

  const currentPayment = snap.data().payment || {};

  await updateDoc(orderRef, {
    'payment.verified': true,
    'payment.verifiedAt': serverTimestamp(),
    'payment.verifiedBy': adminUid,
    'payment.status': 'verified',
    status: 'payment_verified',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Admin Action: Reject payment for an order.
 */
export const rejectOrderPayment = async (
  orderId: string,
  adminUid: string,
  reason = 'Payment screenshot could not be verified'
): Promise<void> => {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('Order not found.');

  await updateDoc(orderRef, {
    'payment.verified': false,
    'payment.status': 'rejected',
    'payment.rejectionReason': reason,
    status: 'payment_pending',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Helper to get readable status text and color for payment.
 */
export const getPaymentStatusBadge = (payment?: PaymentInfo): { label: string; color: string; emoji: string } => {
  if (!payment || !payment.uploaded || !payment.screenshotUrl) {
    return { label: 'Payment Screenshot Required', color: '#EF4444', emoji: '⚠️' };
  }
  if (payment.status === 'rejected') {
    return { label: 'Payment Rejected', color: '#DC2626', emoji: '❌' };
  }
  if (payment.verified) {
    return { label: 'Payment Verified', color: '#10B981', emoji: '✅' };
  }
  return { label: 'Payment Under Verification', color: '#F59E0B', emoji: '⏳' };
};
