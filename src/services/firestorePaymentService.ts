/**
 * NamasteMart Firestore Payment Service
 * Complete bank-transfer payment verification system using Firebase Firestore and Firebase Storage.
 * Complies with strict security rules, amount validation, and real-time listeners.
 */

import {
  db,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
  ensureFirebaseAuth,
} from '@/config/firebase';
import { uploadPaymentScreenshotToFirestoreStorage, UploadProgress } from './storage';
import { OrderItem, PaymentInfo, PaymentVerificationLog } from '@/types';

// ─── FIRESTORE INTERFACES ───────────────────────────────────────────────────

export interface FirestorePayment {
  paymentId: string;
  orderId: string;
  userId: string;
  method: 'bank_transfer';
  currency: 'KRW';
  expectedAmount: number;
  uploadedAmount: number | null;
  receivedAmount: number | null;
  screenshotUrl: string;
  storagePath?: string;
  status: 'pending' | 'submitted' | 'under_review' | 'verified' | 'rejected' | 'expired';
  verification: {
    verified: boolean;
    verifiedBy: string | null;
    verifiedAt: any | null;
    verificationMethod: string | null;
    note: string | null;
  };
  bankTransaction: {
    transactionId: string | null;
    transactionDate: any | null;
    receivedAmount: number | null;
    verified: boolean;
  };
  senderName?: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateBankTransferPayload {
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  transferredAmount: number;
  screenshotUri: string;
  senderName?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  destinationCity?: string;
  shippingMethod?: 'Standard' | 'Express';
  onUploadProgress?: (p: UploadProgress) => void;
}

// ─── NEW: Split Payload for Step-Based Checkout ────────────────────────────

export interface CreateOrderOnlyPayload {
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  deliveryAddress?: {
    recipientName: string;
    phone: string;
    fullAddress: string;
    detailAddress?: string;
    postalCode: string;
    city: string;
    country: string;
    deliveryInstructions?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  destinationCity?: string;
  shippingMethod?: 'Standard' | 'Express';
}

export interface SubmitPaymentPayload {
  orderId: string;
  userId: string;
  screenshotUri: string;
  transferredAmount: number;
  senderName?: string;
  onUploadProgress?: (p: UploadProgress) => void;
}

// ─── HELPER: GENERATE IDS ───────────────────────────────────────────────────

const generateOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timeCode = Date.now().toString(36).slice(-4).toUpperCase();
  return `NM-${year}-${timeCode}${rand}`;
};

const generateId = (prefix = 'pay'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CUSTOMER PAYMENT CREATION FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates an order and associated payment record in Firestore.
 * Uploads screenshot to `payment-screenshots/{userId}/{orderId}/{paymentId}.jpg`.
 * Sets `payments.status = 'under_review'` and `orders.orderStatus = 'payment_verification'`.
 */
export const createBankTransferOrderAndPayment = async (
  payload: CreateBankTransferPayload
): Promise<{ order: OrderItem; payment: FirestorePayment }> => {
  if (!payload.items || payload.items.length === 0) {
    throw new Error('Order items cannot be empty.');
  }

  if (!payload.screenshotUri) {
    throw new Error('Payment screenshot is required for bank transfer.');
  }

  const orderId = generateId('ord');
  const paymentId = generateId('pay');
  const orderNumber = generateOrderNumber();
  const trackingNumber = `KR-CJ${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 1. Validate Product Prices & Totals
  let calculatedSubtotal = 0;
  for (const it of payload.items) {
    calculatedSubtotal += (Number(it.price) - Number(it.discount || 0)) * Number(it.quantity);
  }
  const expectedTotal = Math.max(0, calculatedSubtotal + Number(payload.shippingFee || 0) - Number(payload.discount || 0));

  // 2. Upload Screenshot to Firebase Storage
  const uploadRes = await uploadPaymentScreenshotToFirestoreStorage(
    payload.screenshotUri,
    payload.userId,
    orderId,
    paymentId,
    payload.onUploadProgress
  );

  const screenshotUrl = uploadRes.downloadUrl;
  const storagePath = uploadRes.storagePath;

  // 3. Construct Payment Document
  const paymentDocData: FirestorePayment = {
    paymentId,
    orderId,
    userId: payload.userId,
    method: 'bank_transfer',
    currency: 'KRW',
    expectedAmount: expectedTotal || payload.totalAmount,
    uploadedAmount: Number(payload.transferredAmount) || Number(payload.totalAmount),
    receivedAmount: null,
    screenshotUrl,
    storagePath,
    status: 'under_review',
    verification: {
      verified: false,
      verifiedBy: null,
      verifiedAt: null,
      verificationMethod: null,
      note: null,
    },
    bankTransaction: {
      transactionId: null,
      transactionDate: null,
      receivedAmount: null,
      verified: false,
    },
    senderName: payload.senderName || payload.customer.name,
    orderNumber,
    customerName: payload.customer.name,
    customerEmail: payload.customer.email,
    customerPhone: payload.customer.phone,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // 4. Construct Order Document
  const orderDocData: any = {
    id: orderId,
    orderNumber,
    userId: payload.userId,
    customer: {
      name: payload.customer.name,
      email: payload.customer.email,
      phone: payload.customer.phone,
      address: payload.customer.address,
    },
    deliveryAddress: {
      recipientName: payload.customer.name,
      phoneNumber: payload.customer.phone,
      postalCode: '06000',
      address: payload.customer.address,
      country: 'South Korea',
    },
    recipient: {
      name: payload.customer.name,
      phone: payload.customer.phone,
      address: payload.customer.address,
      city: payload.destinationCity || 'Seoul',
      postalCode: '06000',
      country: 'South Korea',
    },
    items: payload.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      quantity: Number(it.quantity),
      price: Number(it.price),
      discount: Number(it.discount || 0),
      subtotal: (Number(it.price) - Number(it.discount || 0)) * Number(it.quantity),
      imageUrl: it.imageUrl || '',
    })),
    subtotal: payload.subtotal,
    shippingFee: payload.shippingFee,
    discount: payload.discount,
    totalAmount: expectedTotal || payload.totalAmount,
    currency: 'KRW',
    paymentId,
    paymentStatus: 'under_review',
    orderStatus: 'payment_verification',
    status: 'Payment Submitted',
    paymentMethod: 'Bank Transfer (계좌이체)',
    senderName: payload.senderName || payload.customer.name,
    bankAccount: payload.bankAccount || {
      bankName: 'Woori Bank',
      accountNumber: '1002340390276',
      accountHolder: '박기삼',
    },
    paymentScreenshot: screenshotUrl,
    paymentProofUrl: screenshotUrl,
    paymentProofStoragePath: storagePath,
    trackingNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    confirmedAt: null,
  };

  // 5. Write to Firestore Documents Atomically using WriteBatch
  const batch = writeBatch(db);
  const paymentRef = doc(db, 'payments', paymentId);
  const orderRef = doc(db, 'orders', orderId);

  batch.set(paymentRef, paymentDocData);
  batch.set(orderRef, orderDocData);

  await batch.commit();

  return {
    order: {
      ...orderDocData,
      id: orderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as OrderItem,
    payment: {
      ...paymentDocData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1b. STEP-BASED CHECKOUT: CREATE ORDER ONLY (No payment yet)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Step 3 of checkout: Creates an order in Firestore BEFORE payment.
 * Sets `paymentStatus: 'pending'` and `orderStatus: 'awaiting_payment'`.
 * The confirmed delivery address is saved as a frozen snapshot inside the order.
 */
export const createBankTransferOrder = async (
  payload: CreateOrderOnlyPayload
): Promise<{ orderId: string; orderNumber: string; order: OrderItem }> => {
  if (!payload.items || payload.items.length === 0) {
    throw new Error('Order items cannot be empty.');
  }

  await ensureFirebaseAuth().catch(() => {});

  const orderId = generateId('ord');
  const orderNumber = generateOrderNumber();
  const trackingNumber = `KR-CJ${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Validate Product Prices & Totals (server-side recalculation)
  let calculatedSubtotal = 0;
  for (const it of payload.items) {
    calculatedSubtotal += (Number(it.price) - Number(it.discount || 0)) * Number(it.quantity);
  }
  const expectedTotal = Math.max(0, calculatedSubtotal + Number(payload.shippingFee || 0) - Number(payload.discount || 0));

  const deliveryAddr = payload.deliveryAddress || {
    recipientName: payload.customer.name,
    phone: payload.customer.phone,
    fullAddress: payload.customer.address,
    postalCode: '06000',
    city: payload.destinationCity || 'Seoul',
    country: 'South Korea',
  };

  // Construct Order Document with frozen address snapshot
  const orderDocData: any = {
    id: orderId,
    orderNumber,
    userId: payload.userId,
    customer: {
      name: payload.customer.name,
      email: payload.customer.email,
      phone: payload.customer.phone,
      address: payload.customer.address,
    },
    deliveryAddress: {
      recipientName: deliveryAddr.recipientName,
      phoneNumber: deliveryAddr.phone,
      postalCode: deliveryAddr.postalCode,
      address: deliveryAddr.fullAddress,
      detailAddress: deliveryAddr.detailAddress || '',
      city: deliveryAddr.city,
      country: deliveryAddr.country || 'South Korea',
      deliveryInstructions: deliveryAddr.deliveryInstructions || '',
    },
    recipient: {
      name: deliveryAddr.recipientName,
      phone: deliveryAddr.phone,
      address: deliveryAddr.fullAddress,
      city: deliveryAddr.city || payload.destinationCity || 'Seoul',
      postalCode: deliveryAddr.postalCode || '06000',
      country: deliveryAddr.country || 'South Korea',
    },
    items: payload.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      quantity: Number(it.quantity),
      price: Number(it.price),
      discount: Number(it.discount || 0),
      subtotal: (Number(it.price) - Number(it.discount || 0)) * Number(it.quantity),
      imageUrl: it.imageUrl || '',
    })),
    subtotal: payload.subtotal,
    shippingFee: payload.shippingFee,
    discount: payload.discount,
    totalAmount: expectedTotal || payload.totalAmount,
    currency: 'KRW',
    paymentId: null,
    paymentStatus: 'pending',
    orderStatus: 'awaiting_payment',
    status: 'Awaiting Payment',
    paymentMethod: 'Bank Transfer (계좌이체)',
    bankAccount: payload.bankAccount || {
      bankName: 'Woori Bank',
      accountNumber: '1002340390276',
      accountHolder: '박기삼',
    },
    trackingNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    confirmedAt: null,
  };

  // Write to Firestore
  const orderRef = doc(db, 'orders', orderId);
  await setDoc(orderRef, orderDocData);

  return {
    orderId,
    orderNumber,
    order: {
      ...orderDocData,
      id: orderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as OrderItem,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1c. STEP-BASED CHECKOUT: SUBMIT PAYMENT FOR EXISTING ORDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Step 4 of checkout: Submits payment for an existing order.
 * Uploads screenshot, creates payment doc, and updates order to under_review.
 */
export const submitPaymentForOrder = async (
  payload: SubmitPaymentPayload
): Promise<{ payment: FirestorePayment }> => {
  if (!payload.screenshotUri) {
    throw new Error('Payment screenshot is required for bank transfer.');
  }

  await ensureFirebaseAuth().catch(() => {});

  const orderRef = doc(db, 'orders', payload.orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error('Order not found.');
  }

  const orderData = orderSnap.data();
  const paymentId = generateId('pay');

  // Upload Screenshot to Firebase Storage
  const uploadRes = await uploadPaymentScreenshotToFirestoreStorage(
    payload.screenshotUri,
    payload.userId,
    payload.orderId,
    paymentId,
    payload.onUploadProgress
  );

  const screenshotUrl = uploadRes.downloadUrl;
  const storagePath = uploadRes.storagePath;

  // Construct Payment Document
  const paymentDocData: FirestorePayment = {
    paymentId,
    orderId: payload.orderId,
    userId: payload.userId,
    method: 'bank_transfer',
    currency: 'KRW',
    expectedAmount: orderData.totalAmount || 0,
    uploadedAmount: Number(payload.transferredAmount) || orderData.totalAmount || 0,
    receivedAmount: null,
    screenshotUrl,
    storagePath,
    status: 'under_review',
    verification: {
      verified: false,
      verifiedBy: null,
      verifiedAt: null,
      verificationMethod: null,
      note: null,
    },
    bankTransaction: {
      transactionId: null,
      transactionDate: null,
      receivedAmount: null,
      verified: false,
    },
    senderName: payload.senderName || orderData.senderName || orderData.customer?.name || 'Customer',
    orderNumber: orderData.orderNumber,
    customerName: orderData.customer?.name || 'Customer',
    customerEmail: orderData.customer?.email || '',
    customerPhone: orderData.customer?.phone || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Batch: create payment + update order atomically
  const batch = writeBatch(db);
  const paymentRef = doc(db, 'payments', paymentId);
  batch.set(paymentRef, paymentDocData);

  batch.update(orderRef, {
    paymentId,
    paymentStatus: 'under_review',
    orderStatus: 'payment_verification',
    status: 'Payment Submitted',
    senderName: payload.senderName || orderData.customer?.name,
    paymentScreenshot: screenshotUrl,
    paymentProofUrl: screenshotUrl,
    paymentProofStoragePath: storagePath,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    payment: {
      ...paymentDocData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RESUBMISSION / NEW PAYMENT PROOF UPLOAD FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Allows customer to resubmit payment for an existing/rejected order.
 * Creates a new payment record in `payments/{paymentId}` (preserving history).
 * Updates `orders/{orderId}` with `paymentStatus = 'under_review'` and `orderStatus = 'payment_verification'`.
 */
export const resubmitPaymentScreenshot = async (params: {
  orderId: string;
  userId: string;
  screenshotUri: string;
  transferredAmount: number;
  senderName?: string;
  onUploadProgress?: (p: UploadProgress) => void;
}): Promise<FirestorePayment> => {
  const orderRef = doc(db, 'orders', params.orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    throw new Error('Order not found.');
  }

  const orderData = orderSnap.data();
  const paymentId = generateId('pay');

  // 1. Upload screenshot to Firebase Storage
  const uploadRes = await uploadPaymentScreenshotToFirestoreStorage(
    params.screenshotUri,
    params.userId,
    params.orderId,
    paymentId,
    params.onUploadProgress
  );

  const screenshotUrl = uploadRes.downloadUrl;
  const storagePath = uploadRes.storagePath;

  // 2. Create new payment record
  const newPaymentDocData: FirestorePayment = {
    paymentId,
    orderId: params.orderId,
    userId: params.userId,
    method: 'bank_transfer',
    currency: 'KRW',
    expectedAmount: orderData.totalAmount || 0,
    uploadedAmount: Number(params.transferredAmount) || orderData.totalAmount || 0,
    receivedAmount: null,
    screenshotUrl,
    storagePath,
    status: 'under_review',
    verification: {
      verified: false,
      verifiedBy: null,
      verifiedAt: null,
      verificationMethod: null,
      note: null,
    },
    bankTransaction: {
      transactionId: null,
      transactionDate: null,
      receivedAmount: null,
      verified: false,
    },
    senderName: params.senderName || orderData.senderName || orderData.customer?.name || 'Customer',
    orderNumber: orderData.orderNumber || params.orderId,
    customerName: orderData.customer?.name || 'Customer',
    customerEmail: orderData.customer?.email || '',
    customerPhone: orderData.customer?.phone || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  const paymentRef = doc(db, 'payments', paymentId);
  batch.set(paymentRef, newPaymentDocData);

  // 3. Update Order status back to payment_verification
  batch.update(orderRef, {
    paymentId,
    paymentStatus: 'under_review',
    orderStatus: 'payment_verification',
    status: 'Payment Submitted',
    paymentScreenshot: screenshotUrl,
    paymentProofUrl: screenshotUrl,
    paymentProofStoragePath: storagePath,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    ...newPaymentDocData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ADMIN PAYMENT VERIFICATION & REJECTION FLOWS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Admin Action: Verifies bank payment.
 * Validates that `receivedAmount` matches `expectedAmount`.
 * Updates `payments.status = 'verified'`, `orders.paymentStatus = 'paid'`, `orders.orderStatus = 'confirmed'`.
 * Writes immutable audit log.
 */
export const verifyBankTransferPaymentAdmin = async (params: {
  paymentId: string;
  orderId: string;
  receivedAmount: number;
  adminUid: string;
  adminEmail?: string;
  transactionId?: string;
  note?: string;
}): Promise<void> => {
  const paymentRef = doc(db, 'payments', params.paymentId);
  const orderRef = doc(db, 'orders', params.orderId);

  const paymentSnap = await getDoc(paymentRef);
  if (!paymentSnap.exists()) {
    throw new Error(`Payment record ${params.paymentId} not found.`);
  }

  const paymentData = paymentSnap.data() as FirestorePayment;
  const expected = Number(paymentData.expectedAmount || 0);
  const received = Number(params.receivedAmount || 0);

  // Strict amount validation
  if (Math.abs(expected - received) > 1) {
    throw new Error(
      `Cannot verify payment: Bank received amount (₩${received.toLocaleString()}) does not match expected order total (₩${expected.toLocaleString()}).`
    );
  }

  const batch = writeBatch(db);

  // 1. Update Payment Doc
  batch.update(paymentRef, {
    status: 'verified',
    receivedAmount: received,
    verification: {
      verified: true,
      verifiedBy: params.adminUid,
      verifiedAt: serverTimestamp(),
      verificationMethod: 'bank_transaction',
      note: params.note || 'Bank transaction confirmed by admin',
    },
    bankTransaction: {
      transactionId: params.transactionId || `TX-${Date.now()}`,
      transactionDate: serverTimestamp(),
      receivedAmount: received,
      verified: true,
    },
    updatedAt: serverTimestamp(),
  });

  // 2. Update Order Doc
  batch.update(orderRef, {
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    status: 'Payment Confirmed',
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 3. Write Immutable Audit Trail Log
  const logId = generateId('log');
  const logRef = doc(db, 'paymentLogs', logId);
  batch.set(logRef, {
    logId,
    paymentId: params.paymentId,
    orderId: params.orderId,
    orderNumber: paymentData.orderNumber || params.orderId,
    action: 'VERIFIED',
    adminUid: params.adminUid,
    adminEmail: params.adminEmail || 'admin@namastemart.com',
    expectedAmount: expected,
    receivedAmount: received,
    customerName: paymentData.customerName || 'Customer',
    note: params.note || 'Verified successfully',
    createdAt: serverTimestamp(),
  });

  await batch.commit();
};

/**
 * Admin Action: Rejects payment proof.
 * Sets `payments.status = 'rejected'`, `orders.paymentStatus = 'rejected'`, `orders.orderStatus = 'awaiting_payment'`.
 * Records admin reason note and audit log.
 */
export const rejectBankTransferPaymentAdmin = async (params: {
  paymentId: string;
  orderId: string;
  adminUid: string;
  adminEmail?: string;
  reason: string;
}): Promise<void> => {
  const paymentRef = doc(db, 'payments', params.paymentId);
  const orderRef = doc(db, 'orders', params.orderId);

  const paymentSnap = await getDoc(paymentRef);
  const paymentData = paymentSnap.exists() ? (paymentSnap.data() as FirestorePayment) : null;

  const batch = writeBatch(db);

  // 1. Update Payment Doc
  batch.update(paymentRef, {
    status: 'rejected',
    verification: {
      verified: false,
      verifiedBy: params.adminUid,
      verifiedAt: serverTimestamp(),
      verificationMethod: null,
      note: params.reason || 'Payment could not be verified in bank account',
    },
    updatedAt: serverTimestamp(),
  });

  // 2. Update Order Doc
  batch.update(orderRef, {
    paymentStatus: 'rejected',
    orderStatus: 'awaiting_payment',
    status: 'Payment Rejected',
    paymentRejectionReason: params.reason,
    updatedAt: serverTimestamp(),
  });

  // 3. Write Immutable Audit Trail Log
  const logId = generateId('log');
  const logRef = doc(db, 'paymentLogs', logId);
  batch.set(logRef, {
    logId,
    paymentId: params.paymentId,
    orderId: params.orderId,
    orderNumber: paymentData?.orderNumber || params.orderId,
    action: 'REJECTED',
    adminUid: params.adminUid,
    adminEmail: params.adminEmail || 'admin@namastemart.com',
    reason: params.reason,
    customerName: paymentData?.customerName || 'Customer',
    createdAt: serverTimestamp(),
  });

  await batch.commit();
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. REAL-TIME LISTENERS & STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribes in real-time to all pending payments for the Admin Dashboard verification queue.
 */
export const subscribeToPendingPaymentsAdmin = (
  callback: (payments: FirestorePayment[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('status', 'in', ['under_review', 'submitted', 'pending']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const payments: FirestorePayment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          payments.push({
            paymentId: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now(),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt || Date.now(),
          } as FirestorePayment);
        });
        callback(payments);
      },
      (error) => {
        console.warn('Pending payments listener notice:', error.message);
        // Fallback query without composite index if indexing in progress
        const fallbackQ = query(collection(db, 'payments'), limit(50));
        onSnapshot(fallbackQ, (snap) => {
          const payments: FirestorePayment[] = [];
          snap.forEach((d) => {
            const data = d.data() as FirestorePayment;
            if (['under_review', 'submitted', 'pending'].includes(data.status)) {
              payments.push({ ...data, paymentId: d.id });
            }
          });
          callback(payments);
        });
        onError?.(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Error creating pending payments subscription:', err);
    return () => {};
  }
};

/**
 * Subscribes to all payment audit logs for the Admin Dashboard.
 */
export const subscribeToPaymentLogsAdmin = (
  callback: (logs: PaymentVerificationLog[]) => void,
  limitCount = 50
): (() => void) => {
  try {
    const q = query(
      collection(db, 'paymentLogs'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: PaymentVerificationLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          logs.push({
            id: docSnap.id,
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            action: data.action,
            adminUserId: data.adminUid,
            adminEmail: data.adminEmail,
            reason: data.reason || data.note,
            amount: data.receivedAmount || data.expectedAmount || 0,
            customerName: data.customerName,
            timestamp: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          });
        });
        callback(logs);
      },
      (error) => {
        console.warn('Payment logs listener error:', error.message);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.warn('Payment logs subscription error:', error.message);
    return () => {};
  }
};

export const getPaymentVerificationLogs = async (
  limitCount = 50
): Promise<PaymentVerificationLog[]> => {
  try {
    const q = query(
      collection(db, 'paymentLogs'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const logs: PaymentVerificationLog[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      logs.push({
        id: docSnap.id,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        action: data.action,
        adminUserId: data.adminUid,
        adminEmail: data.adminEmail,
        reason: data.reason || data.note,
        amount: data.receivedAmount || data.expectedAmount || 0,
        customerName: data.customerName,
        timestamp: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
      });
    });
    return logs;
  } catch (_) {
    return [];
  }
};

/**
 * Subscribes to all payments for a specific order (to display payment history).
 */
export const subscribeToOrderPayments = (
  orderId: string,
  callback: (payments: FirestorePayment[]) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('orderId', '==', orderId)
    );

    return onSnapshot(q, (snapshot) => {
      const list: FirestorePayment[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          paymentId: docSnap.id,
          ...docSnap.data(),
        } as FirestorePayment);
      });
      list.sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      callback(list);
    });
  } catch {
    return () => {};
  }
};
