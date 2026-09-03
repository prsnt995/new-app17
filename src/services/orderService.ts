/**
 * NamasteMart Order Service
 * Handles atomic order placement with transaction-based stock reduction,
 * customer and delivery address snapshots, and order subscriptions.
 */

import { supabase, TABLES } from '@/config/supabase';
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
 * 1. Executes a Supabase RPC to decrement stock for each product.
 * 2. Generates an order document with complete snapshots of customer, address, and products.
 * 3. Saves payment info (uploaded/not uploaded).
 */
export const createOrderWithStockSafety = async (
  payload: CreateOrderPayload
): Promise<OrderItem> => {
  if (payload.items.length === 0) {
    throw new Error('Cart cannot be empty when placing an order.');
  }

  // 1. ATOMIC TRANSACTION: Check and decrement stock via RPC
  const productIds = payload.items.map((it) => it.productId);
  const quantities = payload.items.map((it) => it.quantity);

  const { error: stockError } = await supabase.rpc('decrement_stock_batch', {
    p_ids: productIds,
    p_quantities: quantities,
  });

  if (stockError) {
    console.log('Stock decrement error:', stockError.message);
    throw new Error(
      stockError.message || 'Failed to decrement stock. Please try again.'
    );
  }

  // 2. BUILD ORDER DOCUMENT
  const dateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const orderNumber = `NM-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const trackingNumber = `KR-CJ${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
    order_number: orderNumber,
    user_id: payload.userId,
    customer: payload.customer,
    delivery_address: payload.deliveryAddress,
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
    discount: payload.totalDiscount,
    shipping_fee: payload.deliveryFee,
    total_amount: payload.totalAmount,
    total_weight_kg: payload.items.reduce((sum, it) => sum + (it.weightKg || 1) * it.quantity, 0),
    status: initialStatus,
    order_status: initialOrderStatus,
    payment_status: initialPaymentStatus,
    payment: initialPayment,
    payment_method: payload.paymentMethod || 'BANK_TRANSFER',
    bank_account: payload.bankAccount,
    sender_name: payload.senderName || payload.customer.name,
    origin_hub: payload.originHub || 'Seoul Hub',
    destination_city: payload.destinationCity || 'Seoul',
    destination_country: 'South Korea',
    shipping_method: payload.shippingMethod || 'Standard',
    estimated_delivery: 'In 1-2 days (CJ Logistics)',
    tracking_number: trackingNumber,
    date: dateFormatted,
    created_at: Date.now(),
    updated_at: Date.now(),
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
    whatsapp_notification_sent: false,
  };

  const { data: insertedOrder, error: insertError } = await supabase
    .from(TABLES.ORDERS)
    .insert(orderDocData)
    .select()
    .single();

  if (insertError) {
    console.log('Order insert error:', insertError.message);
    throw new Error(insertError.message || 'Failed to create order.');
  }

  const createdId = insertedOrder.id;

  // 3. IF SCREENSHOT WAS PROVIDED, UPLOAD TO SUPABASE STORAGE
  if (payload.paymentScreenshotUri) {
    try {
      const { uploadAndLinkPaymentScreenshot } = await import('./paymentService');
      const dlUrl = await uploadAndLinkPaymentScreenshot(
        payload.paymentScreenshotUri,
        payload.userId,
        createdId
      );
      const { error: updatePaymentError } = await supabase
        .from(TABLES.ORDERS)
        .update({
          payment: {
            screenshotUrl: dlUrl,
            uploaded: true,
            verified: false,
            verifiedAt: null,
            verifiedBy: null,
            status: 'uploaded',
          },
        })
        .eq('id', createdId);

      if (updatePaymentError) {
        console.log('Post-order screenshot update notice:', updatePaymentError.message);
      }
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
 * Subscribe to customer's own orders in real time via Supabase Realtime.
 */
const fromOrderRow = (row: any): OrderItem => ({
  ...row,
  orderNumber: row.order_number || row.orderNumber,
  userId: row.user_id || row.userId,
  customerUid: row.user_id || row.customerUid || row.customer_uid,
  subtotalKRW: row.subtotal ?? row.subtotalKRW ?? 0,
  shippingFeeKRW: row.shipping_fee ?? row.deliveryFee ?? row.shippingFeeKRW ?? 0,
  discountKRW: row.discount ?? row.total_discount ?? row.discountKRW ?? 0,
  totalKRW: row.total_amount ?? row.totalAmount ?? row.totalKRW ?? 0,
  totalAmount: row.total_amount ?? row.totalAmount ?? 0,
  subtotal: row.subtotal,
  discount: row.discount,
  shipping_fee: row.shipping_fee,
  total_amount: row.total_amount,
  order_status: row.order_status,
  payment_status: row.payment_status,
  paymentStatus: row.payment_status || row.paymentStatus,
  orderStatus: row.order_status || row.orderStatus,
  createdAt: row.created_at || row.createdAt,
  updatedAt: row.updated_at || row.updatedAt,
  destinationCountry: row.destination_country || row.destinationCountry,
  destinationCity: row.destination_city || row.destinationCity,
  originHub: row.origin_hub || row.originHub,
  shippingMethod: row.shipping_method || row.shippingMethod,
  trackingNumber: row.tracking_number || row.trackingNumber,
  date: row.date,
} as OrderItem);

export const subscribeUserOrders = (
  userId: string,
  callback: (orders: OrderItem[]) => void
): (() => void) => {
  // Initial fetch
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.log('User orders fetch notice:', error.message);
      return;
    }

    const orders = (data || []).map(fromOrderRow);
    orders.sort((a: any, b: any) => ((b.createdAt || b.created_at) || 0) - ((a.createdAt || a.created_at) || 0));
    callback(orders);
  };

  fetchOrders();

  // Subscribe to realtime changes
  const channel = supabase
    .channel(`user-orders-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLES.ORDERS,
        filter: `user_id=eq.${userId}`,
      },
      () => {
        fetchOrders();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribe to all orders for administrator view via Supabase Realtime.
 */
export const subscribeAllOrdersAdmin = (
  callback: (orders: OrderItem[]) => void
): (() => void) => {
  // Initial fetch
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      console.log('Admin orders fetch notice:', error.message);
      return;
    }

    const orders = (data || []).map(fromOrderRow);
    orders.sort((a: any, b: any) => ((b.createdAt || (b as any).created_at) || 0) - ((a.createdAt || (a as any).created_at) || 0));
    callback(orders);
  };

  fetchOrders();

  // Subscribe to realtime changes
  const channel = supabase
    .channel('admin-all-orders')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLES.ORDERS,
      },
      () => {
        fetchOrders();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Update order status as admin.
 */
export const updateOrderStatusByAdmin = async (
  orderId: string,
  status: OrderStatus
): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.ORDERS)
    .update({
      status,
      updated_at: Date.now(),
    })
    .eq('id', orderId);

  if (error) {
    console.log('Update order status error:', error.message);
    throw new Error(error.message || 'Failed to update order status.');
  }
};

/**
 * Update parcel status as admin and keep order tracking in sync.
 */
export const updateParcelStatusByAdmin = async (
  orderId: string,
  parcelStatus: string
): Promise<void> => {
  const updates: any = {
    parcel_status: parcelStatus,
    updated_at: Date.now(),
  };

  if (parcelStatus === 'Shipped') {
    updates.status = 'Shipped';
  } else if (parcelStatus === 'Out for Delivery') {
    updates.status = 'Out for Delivery';
  } else if (parcelStatus === 'Delivered') {
    updates.status = 'Delivered';
  }

  const { error } = await supabase
    .from(TABLES.ORDERS)
    .update(updates)
    .eq('id', orderId);

  if (error) {
    console.log('Update parcel status error:', error.message);
    throw new Error(error.message || 'Failed to update parcel status.');
  }
};
