/**
 * NamasteMart Payment Service
 * Handles payment screenshot upload, order payment metadata updates,
 * admin verification / rejection flows, and audit trail logging.
 */

import {
  db,
  COLLECTIONS,
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from '@/config/firebase';
import { uploadPaymentProofFile, UploadProgress } from './storage';
import { PaymentInfo, PaymentVerificationLog } from '@/types';

const AUDIT_COLLECTION = 'paymentVerificationLogs';

/**
 * Uploads a payment screenshot to Firebase Storage and links it to the order in Firestore.
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

  // 2. Update order in Firestore
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const paymentUpdate: PaymentInfo = {
    screenshotUrl: downloadUrl,
    storagePath,
    paymentProofUrl: downloadUrl,
    paymentProofStoragePath: storagePath,
    paymentProofUploadedAt: serverTimestamp(),
    uploaded: true,
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    status: 'PENDING_VERIFICATION',
    paymentType: 'BANK_TRANSFER',
  };

  await updateDoc(orderRef, {
    payment: paymentUpdate,
    paymentScreenshot: downloadUrl, // backward compatibility
    paymentProofUrl: downloadUrl,
    paymentProofStoragePath: storagePath,
    paymentProofUploadedAt: serverTimestamp(),
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: 'PENDING_VERIFICATION',
    status: 'Payment Submitted',
    orderStatus: 'PENDING',
    paymentRejectedAt: null,
    paymentRejectedBy: null,
    paymentRejectionReason: null,
    updatedAt: serverTimestamp(),
  });

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
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('Order not found.');

  const orderData = snap.data();
  const currentPayment = orderData.payment || {};
  const actualAmount = orderAmount || orderData.totalAmount || orderData.totalKRW || 0;
  const actualCustName = customerName || orderData.customerName || orderData.customer?.name || 'Customer';
  const actualOrderNumber = orderNumber || orderData.orderNumber || orderId;

  // 1. Update Order Document
  await updateDoc(orderRef, {
    paymentStatus: 'PAID',
    paymentVerifiedAt: serverTimestamp(),
    paymentVerifiedBy: adminUid,
    'payment.verified': true,
    'payment.verifiedAt': serverTimestamp(),
    'payment.verifiedBy': adminUid,
    'payment.status': 'paid',
    orderStatus: 'CONFIRMED',
    status: 'Payment Confirmed',
    updatedAt: serverTimestamp(),
  });

  // 2. Write Immutable Audit Trail Log
  try {
    const logsCol = collection(db, AUDIT_COLLECTION);
    await addDoc(logsCol, {
      orderId,
      orderNumber: actualOrderNumber,
      action: 'VERIFIED',
      adminUserId: adminUid,
      adminEmail,
      amount: actualAmount,
      customerName: actualCustName,
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
    });
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
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('Order not found.');

  const orderData = snap.data();
  const actualAmount = orderAmount || orderData.totalAmount || orderData.totalKRW || 0;
  const actualCustName = customerName || orderData.customerName || orderData.customer?.name || 'Customer';
  const actualOrderNumber = orderNumber || orderData.orderNumber || orderId;

  // 1. Update Order Document
  await updateDoc(orderRef, {
    paymentStatus: 'REJECTED',
    paymentRejectedAt: serverTimestamp(),
    paymentRejectedBy: adminUid,
    paymentRejectionReason: reason,
    'payment.verified': false,
    'payment.status': 'REJECTED',
    'payment.rejectionReason': reason,
    'payment.rejectedAt': serverTimestamp(),
    'payment.rejectedBy': adminUid,
    orderStatus: 'PENDING',
    status: 'Payment Pending',
    updatedAt: serverTimestamp(),
  });

  // 2. Write Immutable Audit Trail Log
  try {
    const logsCol = collection(db, AUDIT_COLLECTION);
    await addDoc(logsCol, {
      orderId,
      orderNumber: actualOrderNumber,
      action: 'REJECTED',
      adminUserId: adminUid,
      adminEmail,
      reason,
      amount: actualAmount,
      customerName: actualCustName,
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
    });
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
    const logsCol = collection(db, AUDIT_COLLECTION);
    const q = query(logsCol, orderBy('createdAt', 'desc'), limit(limitCount));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PaymentVerificationLog, 'id'>),
    }));
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


