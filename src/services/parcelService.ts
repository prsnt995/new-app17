/**
 * NamasteMart Parcel Service
 * Complete Parcel Booking System data layer using Firebase Firestore and Firebase Storage.
 * Handles dynamic parcel pricing, booking requests, custom photo uploads, and admin controls.
 */

import {
  db,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  ensureFirebaseAuth,
} from '@/config/firebase';
import { uploadPaymentScreenshotToFirestoreStorage } from './storage';
import {
  ParcelPricingItem,
  ParcelBookingItem,
  ParcelBookingRequest,
  ParcelStatus,
} from '@/types';

// ─── DEFAULT PARCEL PRICING ──────────────────────────────────────────────────
export const DEFAULT_PARCEL_PRICING: ParcelPricingItem[] = [
  {
    id: 'price-phone',
    title: 'Phone',
    category: 'mobile',
    icon: '📱',
    unitPriceKRW: 70000,
    pricingUnit: 'per_item',
    rateDescription: 'Special air cargo & customs duty included (70,000 KRW / item)',
    defaultWeightKg: 0.4,
    defaultName: 'Smartphone / Mobile Device',
    active: true,
  },
  {
    id: 'price-clothes',
    title: 'Clothes',
    category: 'clothes',
    icon: '👕',
    unitPriceKRW: 15000,
    pricingUnit: 'per_kg',
    rateDescription: 'Textiles, shirts, jackets & apparel by weight (15,000 KRW / kg)',
    defaultWeightKg: 2.0,
    defaultName: 'Clothes & Garments (KG)',
    active: true,
  },
  {
    id: 'price-laptop',
    title: 'Laptop',
    category: 'laptop',
    icon: '💻',
    unitPriceKRW: 90000,
    pricingUnit: 'per_item',
    rateDescription: 'Laptops, tablets & gadgets (90,000 KRW / item)',
    defaultWeightKg: 2.2,
    defaultName: 'Laptop / Tablet Device',
    active: true,
  },
  {
    id: 'price-sweets',
    title: 'Sweets & Mithai',
    category: 'sweets',
    icon: '🍬',
    unitPriceKRW: 12000,
    pricingUnit: 'per_kg',
    rateDescription: 'Packaged festival sweets & snacks (12,000 KRW / kg)',
    defaultWeightKg: 2.0,
    defaultName: 'Packaged Sweets & Mithai',
    active: true,
  },
  {
    id: 'price-documents',
    title: 'Documents',
    category: 'documents',
    icon: '📚',
    unitPriceKRW: 10000,
    pricingUnit: 'per_item',
    rateDescription: 'Passports, degree certificates & official papers (10,000 KRW flat)',
    defaultWeightKg: 0.3,
    defaultName: 'Official Documents & Certificates',
    active: true,
  },
];

// ─── PARCEL PRICING CRUD ─────────────────────────────────────────────────────

/**
 * Fetch dynamic parcel pricing items from Firestore `parcelPricing` collection.
 * Falls back to DEFAULT_PARCEL_PRICING if collection is empty or fails.
 */
export const fetchParcelPricing = async (): Promise<ParcelPricingItem[]> => {
  try {
    const colRef = collection(db, 'parcelPricing');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items: ParcelPricingItem[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as ParcelPricingItem);
      });
      return items.length > 0 ? items : DEFAULT_PARCEL_PRICING;
    }
  } catch (err: any) {
    console.log('fetchParcelPricing notice:', err.message);
  }
  return DEFAULT_PARCEL_PRICING;
};

/**
 * Subscribe to real-time parcel pricing changes.
 */
export const subscribeParcelPricing = (
  callback: (items: ParcelPricingItem[]) => void
): (() => void) => {
  // Emit defaults immediately for instant UX
  callback(DEFAULT_PARCEL_PRICING);

  try {
    const colRef = collection(db, 'parcelPricing');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const items: ParcelPricingItem[] = [];
          snap.forEach((d) => {
            items.push({ id: d.id, ...d.data() } as ParcelPricingItem);
          });
          if (items.length > 0) callback(items);
        }
      },
      (err) => {
        console.log('subscribeParcelPricing notice:', err.message);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
};

/**
 * Admin action: Save or update a parcel pricing item in Firestore.
 */
export const saveParcelPricingAdmin = async (
  item: Partial<ParcelPricingItem> & { id?: string }
): Promise<ParcelPricingItem> => {
  await ensureFirebaseAuth().catch(() => {});
  const itemId = item.id || `price-${Date.now()}`;
  const pricingDoc: ParcelPricingItem = {
    id: itemId,
    title: item.title || 'Parcel Item',
    category: item.category || 'general',
    icon: item.icon || '📦',
    unitPriceKRW: Number(item.unitPriceKRW) || 10000,
    pricingUnit: item.pricingUnit || 'per_item',
    rateDescription: item.rateDescription || '',
    defaultWeightKg: Number(item.defaultWeightKg) || 1.0,
    defaultName: item.defaultName || item.title || 'Item',
    active: item.active !== undefined ? item.active : true,
    updatedAt: Date.now(),
  };

  const docRef = doc(db, 'parcelPricing', itemId);
  await setDoc(docRef, pricingDoc, { merge: true });
  return pricingDoc;
};

/**
 * Admin action: Delete a parcel pricing item from Firestore.
 */
export const deleteParcelPricingAdmin = async (id: string): Promise<void> => {
  await ensureFirebaseAuth().catch(() => {});
  const docRef = doc(db, 'parcelPricing', id);
  await deleteDoc(docRef);
};

// ─── PARCEL BOOKING REQUESTS ─────────────────────────────────────────────────

const generateParcelId = (): string => {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timeCode = Date.now().toString(36).slice(-4).toUpperCase();
  return `PRCL-${year}-${timeCode}${rand}`;
};

export interface CreateParcelBookingPayload {
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    koreaAddress: string;
    city?: string;
    postalCode?: string;
  };
  destinationCountry: 'India' | 'Nepal';
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: 'India' | 'Nepal';
  };
  items: ParcelBookingItem[];
  customerNotes?: string;
}

/**
 * Upload custom item photo to Firebase Storage.
 */
export const uploadParcelItemPhoto = async (
  photoUri: string,
  userId: string,
  parcelId: string
): Promise<string> => {
  if (!photoUri || photoUri.startsWith('http')) return photoUri;
  const tempPayId = `photo_${Date.now()}`;
  const res = await uploadPaymentScreenshotToFirestoreStorage(photoUri, userId, parcelId, tempPayId);
  return res.downloadUrl;
};

/**
 * Creates a new Parcel Booking Request in Firestore (`parcels` collection).
 * Sets initial status to 'Pending Review'.
 */
export const createParcelBooking = async (
  payload: CreateParcelBookingPayload
): Promise<ParcelBookingRequest> => {
  if (!payload.items || payload.items.length === 0) {
    throw new Error('Please add at least one item to your parcel box.');
  }

  await ensureFirebaseAuth().catch(() => {});

  const parcelId = generateParcelId();
  const trackingNumber = `AWB-KR${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Process custom item photos if provided
  const processedItems: ParcelBookingItem[] = [];
  let totalWeight = 0;
  let estimatedPrice = 0;
  let requiresPriceConfirmation = false;

  for (const item of payload.items) {
    let uploadedPhotoUrl = item.photoUrl;
    if (item.photoUrl && !item.photoUrl.startsWith('http')) {
      try {
        uploadedPhotoUrl = await uploadParcelItemPhoto(item.photoUrl, payload.userId, parcelId);
      } catch (e) {
        console.log('Notice uploading item photo:', (e as any).message);
      }
    }

    const itemSubtotal = Number(item.calculatedPriceKRW || 0);
    totalWeight += Number(item.weightKg || 0);
    estimatedPrice += itemSubtotal;

    if (item.requiresAdminPricing || item.isCustom || itemSubtotal <= 0) {
      requiresPriceConfirmation = true;
    }

    processedItems.push({
      ...item,
      photoUrl: uploadedPhotoUrl || undefined,
    });
  }

  const parcelDoc: ParcelBookingRequest = {
    parcelId,
    orderNumber: parcelId,
    userId: payload.userId,
    customer: {
      name: payload.customer.name,
      email: payload.customer.email,
      phone: payload.customer.phone,
      koreaAddress: payload.customer.koreaAddress,
      city: payload.customer.city || 'Seoul',
      postalCode: payload.customer.postalCode || '06000',
    },
    destinationCountry: payload.destinationCountry,
    recipient: {
      name: payload.recipient.name,
      phone: payload.recipient.phone,
      address: payload.recipient.address,
      city: payload.recipient.city || 'Delhi',
      postalCode: payload.recipient.postalCode || '110001',
      country: payload.destinationCountry,
    },
    items: processedItems,
    totalWeightKg: Number(totalWeight.toFixed(2)),
    estimatedPriceKRW: estimatedPrice,
    finalConfirmedPriceKRW: requiresPriceConfirmation ? null : estimatedPrice,
    requiresPriceConfirmation,
    isPriceConfirmed: !requiresPriceConfirmation,
    status: 'Pending Review',
    paymentStatus: 'pending',
    customerNotes: payload.customerNotes || '',
    trackingNumber,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const docRef = doc(db, 'parcels', parcelId);
  await setDoc(docRef, parcelDoc);

  return parcelDoc;
};

/**
 * Real-time subscription to current customer's parcels.
 */
export const subscribeCustomerParcels = (
  userId: string,
  callback: (parcels: ParcelBookingRequest[]) => void
): (() => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  try {
    const colRef = collection(db, 'parcels');
    const q = query(colRef, where('userId', '==', userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const parcels: ParcelBookingRequest[] = [];
        snap.forEach((d) => {
          parcels.push({ parcelId: d.id, ...d.data() } as ParcelBookingRequest);
        });
        parcels.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(parcels);
      },
      (err) => {
        console.log('subscribeCustomerParcels notice:', err.message);
      }
    );
    return unsub;
  } catch {
    callback([]);
    return () => {};
  }
};

/**
 * Real-time subscription to ALL parcels for Admin Panel.
 */
export const subscribeAllParcelsAdmin = (
  callback: (parcels: ParcelBookingRequest[], hasNewPending: boolean) => void
): (() => void) => {
  try {
    const colRef = collection(db, 'parcels');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const parcels: ParcelBookingRequest[] = [];
        let pendingCount = 0;
        snap.forEach((d) => {
          const item = { parcelId: d.id, ...d.data() } as ParcelBookingRequest;
          parcels.push(item);
          if (item.status === 'Pending Review' || item.status === 'pending') {
            pendingCount++;
          }
        });
        parcels.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(parcels, pendingCount > 0);
      },
      (err) => {
        console.log('subscribeAllParcelsAdmin notice:', err.message);
      }
    );
    return unsub;
  } catch {
    callback([], false);
    return () => {};
  }
};

/**
 * Admin action: Update parcel status and confirm final price.
 */
export const updateParcelStatusAndPriceAdmin = async (
  parcelId: string,
  updates: {
    status?: ParcelStatus;
    finalConfirmedPriceKRW?: number;
    paymentStatus?: import('@/types').PaymentStatus;
    trackingNumber?: string;
  }
): Promise<void> => {
  await ensureFirebaseAuth().catch(() => {});
  const docRef = doc(db, 'parcels', parcelId);

  const payload: Record<string, any> = {
    updatedAt: Date.now(),
  };

  if (updates.status !== undefined) {
    payload.status = updates.status;
  }
  if (updates.finalConfirmedPriceKRW !== undefined) {
    payload.finalConfirmedPriceKRW = Number(updates.finalConfirmedPriceKRW);
    payload.isPriceConfirmed = true;
  }
  if (updates.paymentStatus !== undefined) {
    payload.paymentStatus = updates.paymentStatus;
  }
  if (updates.trackingNumber !== undefined) {
    payload.trackingNumber = updates.trackingNumber;
  }

  await updateDoc(docRef, payload);
};

/**
 * Customer action: Submit bank transfer payment proof for a parcel.
 */
export const submitParcelPaymentProof = async (params: {
  parcelId: string;
  userId: string;
  screenshotUri: string;
  transferredAmount: number;
  senderName?: string;
}): Promise<void> => {
  await ensureFirebaseAuth().catch(() => {});
  const res = await uploadPaymentScreenshotToFirestoreStorage(
    params.screenshotUri,
    params.userId,
    params.parcelId,
    `parcel_pay_${Date.now()}`
  );

  const docRef = doc(db, 'parcels', params.parcelId);
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
