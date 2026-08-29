export type CurrencyCode = 'KRW' | 'INR' | 'NPR';
export type LanguageCode = 'KR' | 'EN' | 'HI' | 'NE';

// ─── ORDER STATUS ─────────────────────────────────────────────────────────────
// E-commerce lifecycle statuses per spec + shipping-focused statuses
export type OrderStatus =
  | 'pending'
  | 'payment_pending'
  | 'payment_uploaded'
  | 'payment_verified'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'Payment Pending'
  | 'Payment Submitted'
  | 'Payment Confirmed'
  | 'Order Confirmed'
  | 'Preparing Order'
  | 'Ready for Dispatch'
  | 'Parcel Received'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  // Existing shipping-focused statuses
  | 'ORDER_PLACED'
  | 'PACKED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'CUSTOMS_CLEARANCE'
  | 'OUT_FOR_DELIVERY'
  | string;

export interface ParcelItem {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  itemsSummary: string;
  totalQuantity: number;
  totalAmount: number;
  orderDate: number;
  parcelStatus:
    | 'Waiting for Parcel Processing'
    | 'Parcel Received'
    | 'Preparing for Dispatch'
    | 'Shipped'
    | 'Out for Delivery'
    | 'Delivered'
    | string;
  updatedAt: number;
}

export type PaymentStatus =
  | 'pending'
  | 'payment_pending'
  | 'payment_uploaded'
  | 'payment_verified'
  | 'rejected'
  | 'paid'
  | 'failed'
  | 'refunded';


// ─── PRODUCT ──────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  category: string;
  size: string;
  priceKRW: number;
  oldPriceKRW: number;
  mrp?: number;
  rating: number;
  reviews: number;
  discount: string; // Display string e.g. "15% OFF"
  discountPercent?: number; // Numeric 0-100 for calculation
  finalPrice?: number; // Auto-calculated: priceKRW - (priceKRW * discountPercent / 100)
  image: string;
  imageUrl?: string; // Standard alias
  images?: string[]; // Multiple product images (Firebase Storage URLs)
  videoUrl?: string;
  weightKg: number;
  origin: string;
  description: string;
  isBestSeller?: boolean;
  isHidden?: boolean;
  available?: boolean; // Admin toggle: available for purchase
  brand?: string;
  tags?: string[];
  stock?: number;
  keywords?: {
    KR?: string[];
    HI?: string[];
    NE?: string[];
    EN?: string[];
  };
  createdAt?: number;
  updatedAt?: number;
}

// ─── CART ──────────────────────────────────────────────────────────────────────
export interface CartItem {
  product: Product;
  quantity: number;
  customNote?: string;
}

export interface FirestoreCartItem {
  productId: string;
  quantity: number;
}

// ─── TRACKING ─────────────────────────────────────────────────────────────────
export interface TrackingStep {
  title: string;
  location: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

// ─── KOREAN DELIVERY ADDRESS ──────────────────────────────────────────────────
export interface KoreanAddress {
  id: string;
  recipientName: string;
  phoneNumber: string;
  phone?: string;
  postalCode: string;
  province?: string;
  city?: string;
  district?: string;
  address: string;
  streetAddress?: string;
  buildingName?: string;
  unitNumber?: string;
  detailAddress: string;
  deliveryInstructions?: string;
  country: 'South Korea';
  label: string; // e.g. "Home", "Work", "Other"
  isDefault: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Backward-compatible Address interface
export interface Address {
  id: string;
  title: string;
  type: 'HOME' | 'OFFICE' | 'FAMILY' | 'OTHER' | 'PARCEL';
  recipientName: string;
  phone: string;
  phoneNumber?: string;
  fullAddress: string;
  province?: string;
  city: string;
  district?: string;
  streetAddress?: string;
  buildingName?: string;
  unitNumber?: string;
  detailAddress?: string;
  buildingApt?: string;
  detailedAddress?: string;
  deliveryInstructions?: string;
  postalCode: string;
  country: 'South Korea' | 'India' | 'Nepal';
  isDefault: boolean;
  label?: string;
}

export type FirestoreAddress = KoreanAddress;

// ─── PAYMENT INFO ─────────────────────────────────────────────────────────────
export interface PaymentInfo {
  screenshotUrl: string | null;
  uploaded: boolean;
  verified: boolean;
  verifiedAt: any | null; // Firestore timestamp or number
  verifiedBy: string | null; // Admin UID
  status?: 'required' | 'uploaded' | 'under_verification' | 'verified' | 'rejected';
  rejectionReason?: string;
}

// ─── ORDER SNAPSHOTS ──────────────────────────────────────────────────────────
export interface CustomerSnapshot {
  name: string;
  email: string;
  phoneNumber?: string;
  phone?: string;
}

export interface DeliveryAddressSnapshot {
  recipientName: string;
  phoneNumber?: string;
  phone?: string;
  postalCode: string;
  province?: string;
  city?: string;
  district?: string;
  address: string;
  buildingName?: string;
  unitNumber?: string;
  detailAddress?: string;
  deliveryInstructions?: string;
  country: 'South Korea' | 'India' | 'Nepal' | string;
}

export type DeliveryAddress = DeliveryAddressSnapshot;


export interface OrderItemSnapshot {
  productId: string;
  name: string;
  imageUrl: string;
  quantity: number;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  subtotal: number;
}

// Compatible with both old and new schemas
export interface OrderItem {
  id: string;
  orderId?: string; // Explicit orderId field
  orderNumber: string;
  userId?: string;
  customerUid?: string;
  date: string;
  items: any[];
  itemSnapshots?: OrderItemSnapshot[];
  customer?: CustomerSnapshot;
  deliveryAddress?: DeliveryAddressSnapshot;
  subtotalKRW: number;
  subtotal?: number;
  shippingFeeKRW: number;
  deliveryFee?: number;
  discountKRW: number;
  totalDiscount?: number;
  totalKRW: number;
  totalAmount?: number;
  totalWeightKg: number;
  orderType?: 'PRODUCT' | 'PARCEL';
  status: OrderStatus;
  parcelStatus?: string;
  payment?: PaymentInfo;
  paymentStatus?: PaymentStatus;
  paymentMethod: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  senderName?: string;
  paymentScreenshot?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerPushToken?: string;
  originHub: string;
  destinationCity: string;
  destinationCountry: 'South Korea' | 'India' | 'Nepal';
  shippingMethod: 'Standard' | 'Express';
  estimatedDelivery: string;
  trackingNumber: string;
  timeline: TrackingStep[];
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt?: number;
  updatedAt?: number;
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  avatar: string;
  memberTier: 'Gold Member' | 'Silver Member';
  savedAddresses: Address[];
  addresses?: KoreanAddress[];
  totalShipments: number;
  totalSavedKRW: number;
  preferredCurrency: CurrencyCode;
  preferredLanguage: string;
  notificationsEnabled: boolean;
  isLoggedIn?: boolean;
  emailVerified?: boolean;
  profileSetupComplete?: boolean;
  authProvider?: 'google' | 'email' | 'guest';
  onboardingComplete?: boolean;
  pushToken?: string;
  isAdmin?: boolean;
  role?: string;
}

export interface FirestoreUser {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  avatar?: string;
  addresses: KoreanAddress[];
  role?: string;
  emailVerified?: boolean;
  profileSetupComplete?: boolean;
  pushToken?: string;
  createdAt: any;
  updatedAt: any;
}

// ─── COUPON ───────────────────────────────────────────────────────────────────
export interface Coupon {
  code: string;
  title: string;
  discountPercent: number;
  fixedDiscountKRW?: number;
  minOrderKRW: number;
  maxDiscountKRW: number;
}

// ─── REVIEW ───────────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  text: string;
  photoUrl?: string;
  isVerifiedPurchase?: boolean;
  createdAt: number;
}

// ─── CATEGORY ─────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

// ─── BANNER ───────────────────────────────────────────────────────────────────
export interface Banner {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  linkTarget?: string;
  displayOrder: number;
  isActive: boolean;
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export interface AnalyticsData {
  totalOrders: number;
  totalRevenueKRW: number;
  totalCustomers: number;
  outOfStockCount: number;
  dailySales: { date: string; revenueKRW: number; orders: number }[];
  topProducts: { productId: string; name: string; soldCount: number; revenueKRW: number }[];
}
