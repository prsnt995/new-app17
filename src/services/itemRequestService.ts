/**
 * NamasteMart Item Request Service
 * Data layer for "Request Items to Korea" (India/Nepal -> Korea) using Firestore & Firebase Storage.
 */

import {
  db,
  doc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  ensureFirebaseAuth,
} from '@/config/firebase';
import { uploadPaymentScreenshotToFirestoreStorage } from './storage';
import {
  ItemRequestRecord,
  RequestedItem,
  ItemRequestStatus,
  PaymentStatus,
} from '@/types';

const generateRequestId = (): string => {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timeCode = Date.now().toString(36).slice(-4).toUpperCase();
  return `REQ-${year}-${timeCode}${rand}`;
};

export interface CreateItemRequestPayload {
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  originCountry: 'India' | 'Nepal';
  koreaDeliveryAddress: {
    recipientName: string;
    phone: string;
    fullAddress: string;
    city: string;
    postalCode: string;
  };
  items: RequestedItem[];
}

/**
 * Upload custom item photo to Firebase Storage.
 */
export const uploadItemRequestPhoto = async (
  photoUri: string,
  userId: string,
  requestId: string
): Promise<string> => {
  if (!photoUri || photoUri.startsWith('http')) return photoUri;
  const tempPayId = `req_photo_${Date.now()}`;
  const res = await uploadPaymentScreenshotToFirestoreStorage(photoUri, userId, requestId, tempPayId);
  return res.downloadUrl;
};

/**
 * Creates a new Item Request Record in Firestore (`itemRequests` collection).
 * Initial status: 'Pending Review'.
 */
export const createItemRequest = async (
  payload: CreateItemRequestPayload
): Promise<ItemRequestRecord> => {
  if (!payload.items || payload.items.length === 0) {
    throw new Error('Please add at least one item to your request list.');
  }

  await ensureFirebaseAuth().catch(() => {});

  const requestId = generateRequestId();
  const trackingNumber = `IMP-KR${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Process item photos
  const processedItems: RequestedItem[] = [];
  for (const item of payload.items) {
    let uploadedPhotoUrl = item.photoUrl;
    if (item.photoUrl && !item.photoUrl.startsWith('http')) {
      try {
        uploadedPhotoUrl = await uploadItemRequestPhoto(item.photoUrl, payload.userId, requestId);
      } catch (e: any) {
        console.log('Notice uploading item photo:', e.message);
      }
    }

    processedItems.push({
      ...item,
      photoUrl: uploadedPhotoUrl || undefined,
    });
  }

  const record: ItemRequestRecord = {
    requestId,
    orderNumber: requestId,
    userId: payload.userId,
    customer: {
      name: payload.customer.name,
      email: payload.customer.email,
      phone: payload.customer.phone,
    },
    originCountry: payload.originCountry,
    koreaDeliveryAddress: {
      recipientName: payload.koreaDeliveryAddress.recipientName,
      phone: payload.koreaDeliveryAddress.phone,
      fullAddress: payload.koreaDeliveryAddress.fullAddress,
      city: payload.koreaDeliveryAddress.city || 'Seoul',
      postalCode: payload.koreaDeliveryAddress.postalCode || '06000',
    },
    items: processedItems,
    itemCostKRW: null,
    shippingCostKRW: null,
    finalConfirmedPriceKRW: null,
    isPriceConfirmed: false,
    status: 'Pending Review',
    paymentStatus: 'pending',
    trackingNumber,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const docRef = doc(db, 'itemRequests', requestId);
  await setDoc(docRef, record);

  return record;
};

/**
 * Real-time subscription to customer's own item requests.
 */
export const subscribeCustomerItemRequests = (
  userId: string,
  callback: (requests: ItemRequestRecord[]) => void
): (() => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  try {
    const colRef = collection(db, 'itemRequests');
    const q = query(colRef, where('userId', '==', userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ItemRequestRecord[] = [];
        snap.forEach((d) => {
          list.push({ requestId: d.id, ...d.data() } as ItemRequestRecord);
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(list);
      },
      (err) => {
        console.log('subscribeCustomerItemRequests notice:', err.message);
      }
    );
    return unsub;
  } catch {
    callback([]);
    return () => {};
  }
};

/**
 * Real-time subscription to ALL item requests for Admin Panel.
 */
export const subscribeAllItemRequestsAdmin = (
  callback: (requests: ItemRequestRecord[], hasNewPending: boolean) => void
): (() => void) => {
  try {
    const colRef = collection(db, 'itemRequests');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list: ItemRequestRecord[] = [];
        let pendingCount = 0;
        snap.forEach((d) => {
          const item = { requestId: d.id, ...d.data() } as ItemRequestRecord;
          list.push(item);
          if (item.status === 'Pending Review' || item.status === 'pending') {
            pendingCount++;
          }
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(list, pendingCount > 0);
      },
      (err) => {
        console.log('subscribeAllItemRequestsAdmin notice:', err.message);
      }
    );
    return unsub;
  } catch {
    callback([], false);
    return () => {};
  }
};

/**
 * Admin action: Update item request status, set pricing, or approve/reject.
 */
export const updateItemRequestAdmin = async (
  requestId: string,
  updates: {
    status?: ItemRequestStatus;
    itemCostKRW?: number;
    shippingCostKRW?: number;
    finalConfirmedPriceKRW?: number;
    paymentStatus?: PaymentStatus;
    adminNotes?: string;
    rejectionReason?: string;
    trackingNumber?: string;
  }
): Promise<void> => {
  await ensureFirebaseAuth().catch(() => {});
  const docRef = doc(db, 'itemRequests', requestId);

  const payload: Record<string, any> = {
    updatedAt: Date.now(),
  };

  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.itemCostKRW !== undefined) payload.itemCostKRW = Number(updates.itemCostKRW);
  if (updates.shippingCostKRW !== undefined) payload.shippingCostKRW = Number(updates.shippingCostKRW);

  if (updates.finalConfirmedPriceKRW !== undefined) {
    payload.finalConfirmedPriceKRW = Number(updates.finalConfirmedPriceKRW);
    payload.isPriceConfirmed = true;
  } else if (updates.itemCostKRW !== undefined || updates.shippingCostKRW !== undefined) {
    const itemC = updates.itemCostKRW !== undefined ? Number(updates.itemCostKRW) : 0;
    const shipC = updates.shippingCostKRW !== undefined ? Number(updates.shippingCostKRW) : 0;
    payload.finalConfirmedPriceKRW = itemC + shipC;
    payload.isPriceConfirmed = true;
  }

  if (updates.paymentStatus !== undefined) payload.paymentStatus = updates.paymentStatus;
  if (updates.adminNotes !== undefined) payload.adminNotes = updates.adminNotes;
  if (updates.rejectionReason !== undefined) payload.rejectionReason = updates.rejectionReason;
  if (updates.trackingNumber !== undefined) payload.trackingNumber = updates.trackingNumber;

  await updateDoc(docRef, payload);
};

/**
 * Customer action: Submit bank transfer payment proof for an item request.
 */
export const submitItemRequestPaymentProof = async (params: {
  requestId: string;
  userId: string;
  screenshotUri: string;
  transferredAmount: number;
  senderName?: string;
}): Promise<void> => {
  await ensureFirebaseAuth().catch(() => {});
  const res = await uploadPaymentScreenshotToFirestoreStorage(
    params.screenshotUri,
    params.userId,
    params.requestId,
    `req_pay_${Date.now()}`
  );

  const docRef = doc(db, 'itemRequests', params.requestId);
  await updateDoc(docRef, {
    paymentScreenshot: res.downloadUrl,
    paymentScreenshotStoragePath: res.storagePath,
    senderName: params.senderName || '',
    transferredAmount: params.transferredAmount,
    paymentStatus: 'submitted',
    status: 'Payment Submitted',
    updatedAt: Date.now(),
  });
};
