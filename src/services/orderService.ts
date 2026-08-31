/**
 * NamasteMart Order Service
 * Handles atomic order placement with transaction-based stock reduction,
 * customer and delivery address snapshots, and order subscriptions.
 */

import {
  db,
  COLLECTIONS,
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from '@/config/firebase';
import {
  CustomerSnapshot,
  DeliveryAddressSnapshot,
  OrderItem,
  OrderItemSnapshot,
  OrderStatus,
  PaymentInfo,
} from '@/types';

export interface CreateOrderPayload {
  userId: string;
  customer: CustomerSnapshot;
  deliveryAddress: DeliveryAddressSnapshot;
  items: {
    productId: string;
    name: string;
    imageUrl: string;
    quantity: number;
    originalPrice: number;
    discount: number;
    finalPrice: number;
    subtotal: number;
    weightKg?: number;
  }[];
  subtotal: number;
  totalDiscount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus?: import('@/types').PaymentStatus;
  paymentDetails?: import('@/types').KoreanCardPaymentDetails;
  bankAccount?: OrderItem['bankAccount'];
  senderName?: string;
  paymentScreenshotUri?: string | null;
  originHub?: string;
  destinationCity?: string;
  shippingMethod?: 'Standard' | 'Express';
}

/**
 * Creates an order atomically:
 * 1. Executes a Firestore transaction to verify each item's stock and decrement it.
 * 2. Generates an order document with complete snapshots of customer, address, and products.
 * 3. Saves payment info (uploaded/not uploaded).
 */
export const createOrderWithStockSafety = async (
  payload: CreateOrderPayload
): Promise<OrderItem> => {
  if (payload.items.length === 0) {
    throw new Error('Cart cannot be empty when placing an order.');
  }

  // 1. ATOMIC TRANSACTION: Check and decrement stock
  await runTransaction(db, async (transaction) => {
    // Read all products first
    const productUpdates: { ref: any; newStock: number; currentAvailable: boolean; name: string }[] = [];

    for (const item of payload.items) {
      const pRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
      const snap = await transaction.get(pRef);

      if (!snap.exists()) {
        throw new Error(`Product "${item.name}" was not found in catalog.`);
      }

      const pData = snap.data();
      const currentStock = (pData.stock as number) ?? 0;

      if (currentStock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.name}". Available: ${currentStock}, Requested: ${item.quantity}.`
        );
      }

      const newStock = Math.max(0, currentStock - item.quantity);
      productUpdates.push({
        ref: pRef,
        newStock,
        currentAvailable: newStock > 0 ? (pData.available ?? true) : false,
        name: item.name,
      });
    }

    // Decrement all stocks
    for (const update of productUpdates) {
      transaction.update(update.ref, {
        stock: update.newStock,
        available: update.currentAvailable,
        updatedAt: Date.now(),
      });
    }
  });

  // 2. BUILD ORDER DOCUMENT
  const dateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const orderNumber = `NM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const itemsSnapshot: OrderItemSnapshot[] = payload.items.map((it) => ({
    productId: it.productId,
    name: it.name,
    imageUrl: it.imageUrl,
    quantity: it.quantity,
    originalPrice: it.originalPrice,
    discount: it.discount,
    finalPrice: it.finalPrice,
    subtotal: it.subtotal,
  }));

  const isCardPayment = !!payload.paymentDetails;

  const initialPayment: PaymentInfo = isCardPayment
    ? {
        screenshotUrl: null,
        uploaded: true,
        verified: true,
        verifiedAt: Date.now(),
        verifiedBy: 'korean_card_pg',
        status: 'paid',
        paymentType: 'KOREAN_CARD',
        cardDetails: payload.paymentDetails,
        paidAmount: payload.totalAmount,
        transactionId: payload.paymentDetails?.transactionId,
      }
    : {
        screenshotUrl: payload.paymentScreenshotUri || null,
        paymentProofUrl: payload.paymentScreenshotUri || null,
        paymentProofUploadedAt: payload.paymentScreenshotUri ? Date.now() : null,
        uploaded: !!payload.paymentScreenshotUri,
        verified: false,
        verifiedAt: null,
        verifiedBy: null,
        status: payload.paymentScreenshotUri ? 'PENDING_VERIFICATION' : 'required',
        paymentType: 'BANK_TRANSFER',
      };

  const initialPaymentStatus = isCardPayment
    ? 'PAID'
    : payload.paymentScreenshotUri
    ? 'PENDING_VERIFICATION'
    : 'payment_pending';

  const initialStatus: OrderStatus = isCardPayment
    ? 'Payment Confirmed'
    : payload.paymentScreenshotUri
    ? 'Payment Submitted'
    : 'Payment Pending';

  const initialOrderStatus = isCardPayment ? 'CONFIRMED' : 'PENDING';

  const orderDocData: any = {
    orderId: orderNumber,
    orderNumber,
    userId: payload.userId,
    customerUid: payload.userId, // backward compatibility
    customer: payload.customer,
    customerName: payload.customer.name,
    customerEmail: payload.customer.email,
    customerPhone: payload.customer.phoneNumber,
    deliveryAddress: payload.deliveryAddress,
    recipient: {
      name: payload.deliveryAddress.recipientName,
      phone: payload.deliveryAddress.phoneNumber,
      address: payload.deliveryAddress.address,
      city: payload.destinationCity || 'Seoul',
      postalCode: payload.deliveryAddress.postalCode,
      country: payload.deliveryAddress.country,
    },
    items: itemsSnapshot,
    subtotal: payload.subtotal,
    subtotalKRW: payload.subtotal,
    totalDiscount: payload.totalDiscount,
    discountKRW: payload.totalDiscount,
    deliveryFee: payload.deliveryFee,
    shippingFeeKRW: payload.deliveryFee,
    totalAmount: payload.totalAmount,
    totalKRW: payload.totalAmount,
    totalWeightKg: payload.items.reduce((sum, it) => sum + (it.weightKg || 1) * it.quantity, 0),
    status: initialStatus,
    orderStatus: initialOrderStatus,
    paymentStatus: initialPaymentStatus,
    payment: initialPayment,
    paymentMethod: payload.paymentMethod || 'BANK_TRANSFER',
    paymentScreenshot: payload.paymentScreenshotUri || null,
    paymentProofUrl: payload.paymentScreenshotUri || null,
    paymentProofUploadedAt: payload.paymentScreenshotUri ? Date.now() : null,
    paymentVerifiedAt: null,
    paymentVerifiedBy: null,
    paymentRejectedAt: null,
    paymentRejectedBy: null,
    paymentRejectionReason: null,
    bankAccount: payload.bankAccount,
    senderName: payload.senderName || payload.customer.name,
    originHub: payload.originHub || 'Seoul Hub',
    destinationCity: payload.destinationCity || 'Seoul',
    destinationCountry: 'South Korea',
    shippingMethod: payload.shippingMethod || 'Standard',
    estimatedDelivery: 'In 1-2 days (CJ Logistics)',
    trackingNumber: `KR-CJ${Math.floor(10000000 + Math.random() * 90000000)}`,
    date: dateFormatted,
    timeline: [
      {
        title: 'Order Placed',
        location: payload.originHub || 'Seoul Hub',
        timestamp: dateFormatted,
        description: 'Order placed, awaiting bank transfer verification',
        completed: true,
        current: true,
      },
      {
        title: 'Payment Verified',
        location: 'Namaste Mart Finance',
        timestamp: '',
        description: 'Bank transfer screenshot verified',
        completed: false,
      },
      {
        title: 'Packed & Dispatched',
        location: 'Seoul Hub',
        timestamp: '',
        description: 'Carrier packing and dispatch',
        completed: false,
      },
      {
        title: 'Delivered',
        location: payload.deliveryAddress.address,
        timestamp: '',
        description: 'Package delivered to recipient',
        completed: false,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    whatsappNotificationSent: false,
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), orderDocData);
  const createdId = docRef.id;

  // 3. IF SCREENSHOT WAS PROVIDED, UPLOAD TO FIREBASE STORAGE
  if (payload.paymentScreenshotUri) {
    try {
      const { uploadAndLinkPaymentScreenshot } = await import('./paymentService');
      const dlUrl = await uploadAndLinkPaymentScreenshot(
        payload.paymentScreenshotUri,
        payload.userId,
        createdId
      );
      orderDocData.payment = {
        screenshotUrl: dlUrl,
        uploaded: true,
        verified: false,
        verifiedAt: null,
        verifiedBy: null,
        status: 'uploaded',
      };
      orderDocData.paymentScreenshot = dlUrl;
    } catch (e: any) {
      console.log('Post-order screenshot upload notice:', e.message);
    }
  }

  const finalOrder = {
    ...orderDocData,
    id: createdId,
  };

  // 4. AUTOMATIC BACKEND WHATSAPP NOTIFICATION TRIGGER (NON-BLOCKING FOR ORDER PLACEMENT SAFETY)
  try {
    const { notifyWhatsAppOrderBackend } = await import('./api');
    notifyWhatsAppOrderBackend(createdId, finalOrder).catch((waErr: any) => {
      console.log('WhatsApp notification trigger notice:', waErr.message);
    });
  } catch (err: any) {
    console.log('WhatsApp trigger notice:', err.message);
  }

  return finalOrder;
};

/**
 * Subscribe to customer's own orders in real time.
 */
export const subscribeUserOrders = (
  userId: string,
  callback: (orders: OrderItem[]) => void
): (() => void) => {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OrderItem[];
      orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(orders);
    },
    (err) => {
      console.log('User orders subscription notice:', err.message);
    }
  );
};

/**
 * Subscribe to all orders for administrator view.
 */
export const subscribeAllOrdersAdmin = (
  callback: (orders: OrderItem[]) => void
): (() => void) => {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    limit(300)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OrderItem[];
      orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(orders);
    },
    (err) => {
      console.log('Admin orders subscription notice:', err.message);
    }
  );
};

/**
 * Update order status as admin.
 */
export const updateOrderStatusByAdmin = async (
  orderId: string,
  status: OrderStatus
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Update parcel status as admin and keep order tracking in sync.
 */
export const updateParcelStatusByAdmin = async (
  orderId: string,
  parcelStatus: string
): Promise<void> => {
  const updates: any = {
    parcelStatus,
    updatedAt: serverTimestamp(),
  };

  if (parcelStatus === 'Shipped') {
    updates.status = 'Shipped';
  } else if (parcelStatus === 'Out for Delivery') {
    updates.status = 'Out for Delivery';
  } else if (parcelStatus === 'Delivered') {
    updates.status = 'Delivered';
  }

  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), updates);
};
