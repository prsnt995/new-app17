export type CurrencyCode = 'KRW' | 'INR' | 'NPR';
export type LanguageCode = 'KR' | 'EN' | 'HI' | 'NE';

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
  discount: string;
  image: string;
  videoUrl?: string;
  weightKg: number;
  origin: string;
  description: string;
  isBestSeller?: boolean;
  isHidden?: boolean;
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

export interface CartItem {
  product: Product;
  quantity: number;
  customNote?: string;
}

export type OrderStatus =
  | 'ORDER_PLACED'
  | 'PACKED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'CUSTOMS_CLEARANCE'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface TrackingStep {
  title: string;
  location: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  date: string;
  items: CartItem[];
  subtotalKRW: number;
  shippingFeeKRW: number;
  discountKRW: number;
  totalKRW: number;
  totalWeightKg: number;
  orderType?: 'PRODUCT' | 'PARCEL';
  status: OrderStatus;
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
  paymentMethod: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  senderName?: string;
  paymentScreenshot?: string;
  customerUid?: string;
  customerPushToken?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Address {
  id: string;
  title: string;
  type: 'HOME' | 'OFFICE' | 'FAMILY' | 'OTHER' | 'PARCEL';
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  district?: string;
  streetAddress?: string;
  buildingApt?: string;
  detailedAddress?: string;
  postalCode: string;
  country: 'South Korea' | 'India' | 'Nepal';
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  avatar: string;
  memberTier: 'Gold Member' | 'Silver Member';
  savedAddresses: Address[];
  totalShipments: number;
  totalSavedKRW: number;
  preferredCurrency: CurrencyCode;
  preferredLanguage: string;
  notificationsEnabled: boolean;
  isLoggedIn?: boolean;
  emailVerified?: boolean;
  authProvider?: 'google' | 'email' | 'guest';
  onboardingComplete?: boolean;
  pushToken?: string;
  isAdmin?: boolean;
}

export interface Coupon {
  code: string;
  title: string;
  discountPercent: number;
  fixedDiscountKRW?: number;
  minOrderKRW: number;
  maxDiscountKRW: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1–5
  text: string;
  photoUrl?: string;
  isVerifiedPurchase?: boolean;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface Banner {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  linkTarget?: string; // category name or product id
  displayOrder: number;
  isActive: boolean;
}

export interface AnalyticsData {
  totalOrders: number;
  totalRevenueKRW: number;
  totalCustomers: number;
  outOfStockCount: number;
  dailySales: { date: string; revenueKRW: number; orders: number }[];
  topProducts: { productId: string; name: string; soldCount: number; revenueKRW: number }[];
}
